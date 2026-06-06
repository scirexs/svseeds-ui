import { afterEach, describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Disclosure from "#svs/_Disclosure.svelte";
import { PARTS, VARIANT } from "#svs/core";

const label = "Disclosure Label";
const childrenContent = "Disclosure Content";
const childrenTestId = "test-children";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div data-testid="${childrenTestId}">${childrenContent}</div>` };
});

const labelSnippet = createRawSnippet((open: () => boolean, variant: () => string) => {
  return {
    render: () => `<span data-testid="test-label">${label} - ${variant()}</span>`,
    setup: (element) => {
      $effect(() => {
        element.textContent = `${label} - ${variant()}`;
      });
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Switching existence of elements", () => {
  const attachfn = () => {};

  test("minimum props (label as string, children)", () => {
    const { getByRole, getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);
    expect(details.tagName).toBe("DETAILS");
    expect(summary.tagName).toBe("SUMMARY");
    expect(details).not.toHaveAttribute("open");
  });

  test("w/ label as snippet", () => {
    const { getByTestId } = render(Disclosure, {
      label: labelSnippet,
      children: childrenSnippet,
    });
    const labelEl = getByTestId("test-label");
    expect(labelEl).toBeInTheDocument();
    expect(labelEl).toHaveTextContent(`${label} - ${VARIANT.NEUTRAL}`);
  });

  test("w/ open=true", () => {
    const { getByRole, getByTestId } = render(Disclosure, {
      label,
      children: childrenSnippet,
      open: true,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    const content = getByTestId(childrenTestId);
    expect(details).toHaveAttribute("open");
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent(childrenContent);
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      attach,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
    expect(attach).toHaveBeenCalled();
  });

  test("w/ attributes", () => {
    const { getByTestId } = render(Disclosure, {
      label,
      children: childrenSnippet,
      "data-testid": "custom-disclosure",
      "aria-expanded": "false" as const,
    });
    const details = getByTestId("custom-disclosure");
    expect(details).toHaveAttribute("aria-expanded", "false");
  });

  test("w/ custom duration", () => {
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      duration: 200,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
  });

  test("w/ custom variant", () => {
    const customStatus = "custom-variant";
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      variant: customStatus,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details.className).toContain(customStatus);
  });
});

describe("Interactions and state transitions", () => {
  test("click to toggle open/close", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      variant: VARIANT.NEUTRAL,
      duration: 0,
    });
    const user = userEvent.setup();
    const { getByRole, getByText, getByTestId } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).not.toHaveAttribute("open");
    expect(props.open).toBe(false);

    await user.click(summary);

    await waitFor(() => {
      expect(details).toHaveAttribute("open");
      expect(props.open).toBe(true);
      expect(getByTestId(childrenTestId)).toBeInTheDocument();
    });
    await user.click(summary);
    await waitFor(() => {
      expect(details).not.toHaveAttribute("open");
      expect(props.open).toBe(false);
      expect(getByTestId(childrenTestId)).toBeInTheDocument();
    });
  });

  test("variant changes with open/close", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      variant: VARIANT.NEUTRAL,
      duration: 0,
    });
    const user = userEvent.setup();
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await user.click(summary);
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.ACTIVE);
    });

    await user.click(summary);
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.NEUTRAL);
    });
  });

  test("programmatic open change", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      duration: 0,
      element: undefined as HTMLDetailsElement | undefined,
    });
    const { getByRole, getByTestId, rerender } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;

    expect(details).not.toHaveAttribute("open");

    props.open = true;
    await rerender(props);

    await waitFor(() => {
      expect(details).toHaveAttribute("open");
      expect(getByTestId(childrenTestId)).toBeInTheDocument();
    });

    props.open = false;
    await rerender(props);

    await waitFor(() => {
      expect(details).not.toHaveAttribute("open");
    });
  });

  test("toggle guard prevents rapid clicking", async () => {
    vi.useFakeTimers();
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      duration: 100,
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);

    await user.click(summary);
    expect(props.open).toBe(true);

    await user.click(summary);
    expect(props.open).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    await user.click(summary);
    expect(props.open).toBe(false);
  });

  test("native toggle event handling", async () => {
    const user = userEvent.setup();
    const ontoggle = vi.fn();
    const props = {
      label,
      children: childrenSnippet,
      ontoggle,
      duration: 0,
    };
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);
    await user.click(summary);
    expect(ontoggle).toHaveBeenCalled();
  });

  test("label snippet receives correct variant", async () => {
    const props = $state({
      label: labelSnippet,
      children: childrenSnippet,
      open: false,
      variant: VARIANT.NEUTRAL,
      duration: 0,
    });
    const user = userEvent.setup();
    const { container, getByTestId } = render(Disclosure, props);

    const summary = container.querySelector("summary")!;

    expect(getByTestId("test-label")).toHaveTextContent(`${label} - ${VARIANT.NEUTRAL}`);

    await user.click(summary);

    await waitFor(() => {
      expect(getByTestId("test-label")).toHaveTextContent(`${label} - ${VARIANT.ACTIVE}`);
    });
  });

  test("close is deferred by dur when duration is omitted", async () => {
    vi.useFakeTimers();
    const props = $state({ label, children: childrenSnippet, open: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details.open).toBe(true);

    await user.click(summary);
    expect(props.open).toBe(false);

    await vi.advanceTimersByTimeAsync(50);
    expect(details.open).toBe(true);

    await vi.advanceTimersByTimeAsync(200);
    expect(details.open).toBe(false);
  });

  test.each([-1, 3.14, NaN])("invalid duration %s falls back to default close delay", async (duration) => {
    vi.useFakeTimers();
    const props = $state({ label, children: childrenSnippet, open: true, duration });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    await user.click(getByText(label));
    expect(props.open).toBe(false);

    await vi.advanceTimersByTimeAsync(50);
    expect(details.open).toBe(true);

    await vi.advanceTimersByTimeAsync(200);
    expect(details.open).toBe(false);
  });

  test("reduced motion collapses without delay", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    const props = $state({ label, children: childrenSnippet, open: true });
    const user = userEvent.setup();
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    await user.click(getByText(label));

    await waitFor(() => expect(details.open).toBe(false));
  });

  test("external close of <details> syncs open back to false", async () => {
    const props = $state({ label, children: childrenSnippet, open: true, duration: 0 });
    const { getByRole } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    expect(props.open).toBe(true);

    details.open = false;
    details.dispatchEvent(new Event("toggle"));

    await waitFor(() => expect(props.open).toBe(false));
  });

  test("external open of <details> syncs open to true", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0 });
    const { getByRole } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    details.open = true;
    details.dispatchEvent(new Event("toggle"));

    await waitFor(() => expect(props.open).toBe(true));
  });

  test("changing variant while open does not affect open state", async () => {
    const props = $state({ label, children: childrenSnippet, open: true, variant: VARIANT.NEUTRAL as string, duration: 0 });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => expect(details).toHaveAttribute("open"));

    props.variant = "custom-variant";

    await waitFor(() => {
      expect(details).toHaveClass("custom-variant");
      expect(summary).toHaveClass("custom-variant");
    });
    expect(details).toHaveAttribute("open");
    expect(props.open).toBe(true);
  });

  test("summary activation toggles the managed open state", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0 });
    const user = userEvent.setup();
    const { getByText } = render(Disclosure, props);
    const summary = getByText(label);

    // jsdom does not synthesize summary keyboard activation into click reliably.
    await user.click(summary);

    await waitFor(() => expect(props.open).toBe(true));
  });

  test("forwards onclick on the summary", async () => {
    const onclick = vi.fn();
    const props = { label, children: childrenSnippet, onclick, duration: 0 };
    const user = userEvent.setup();
    const { getByText } = render(Disclosure, props);

    await user.click(getByText(label));

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test("renders exactly one main in steady open and closed states", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0 });
    const user = userEvent.setup();
    const { container, getByText } = render(Disclosure, props);

    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));

    await user.click(getByText(label));
    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));

    await user.click(getByText(label));
    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));
  });
});

describe("CSS classes and styling", () => {
  const seed = "svs-disclosure";

  test("default class structure", () => {
    const { getByRole, getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
      open: true,
    });

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(summary).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
  });

  test("w/ string styling", () => {
    const styleId = "custom-styling";
    const { getByRole, getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
      styling: styleId,
      open: true,
    });

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(styleId, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(summary).toHaveClass(styleId, PARTS.LABEL, VARIANT.ACTIVE);
  });

  test("w/ object styling", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
    };
    const styling = {
      whole: dynObj,
      label: dynObj,
      main: dynObj,
    };

    const { getByRole, getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
      styling,
      open: true,
    });

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(dynObj.base, dynObj.active);
    expect(summary).toHaveClass(dynObj.base, dynObj.active);
  });

  test("class changes with variant", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      variant: VARIANT.NEUTRAL,
      duration: 0,
    });
    const user = userEvent.setup();
    const { getByRole, getByText } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(summary).toHaveClass(seed, PARTS.LABEL, VARIANT.NEUTRAL);

    await user.click(summary);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(details).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(summary).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);

    await user.click(summary);
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.NEUTRAL);
      expect(details).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
      expect(summary).toHaveClass(seed, PARTS.LABEL, VARIANT.NEUTRAL);
    });
  });

  test("merges class prop onto the root details", () => {
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      class: "extra-root",
      open: true,
    });
    const details = getByRole("group") as HTMLDetailsElement;

    expect(details).toHaveClass("svs-disclosure", PARTS.WHOLE, VARIANT.ACTIVE, "extra-root");
  });
});

describe("Element binding and refs", () => {
  test("element binding works", () => {
    const props = $state({
      label,
      children: childrenSnippet,
      element: undefined as HTMLDetailsElement | undefined,
    });

    render(Disclosure, props);

    expect(props.element).toBeInstanceOf(HTMLDetailsElement);
    expect(props.element?.tagName).toBe("DETAILS");
  });

  test("element is properly initialized", () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
      element: undefined as HTMLDetailsElement | undefined,
    });

    render(Disclosure, props);

    expect(props.element?.open).toBe(true);
  });
});

describe("Edge cases and error handling", () => {
  const seed = "svs-disclosure";
  test("w/ empty or whitespace label", () => {
    const { getByRole } = render(Disclosure, {
      label: "   ",
      children: childrenSnippet,
    });

    const details = getByRole("group") as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
  });

  test("w/ neutral variant variations", () => {
    const customNeutral = "custom-neutral";
    const props = $state({
      label,
      children: childrenSnippet,
      variant: customNeutral,
    });
    const { getByRole, getByText } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(seed, PARTS.WHOLE, customNeutral);
    expect(summary).toHaveClass(seed, PARTS.LABEL, customNeutral);
  });

  test("w/ active variant variations", () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
    });
    const { getByRole, getByText } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(summary).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
  });

  test("handles missing element gracefully", () => {
    const props = {
      label,
      children: childrenSnippet,
    };

    const { getByRole } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    expect(details).toBeInTheDocument();
  });
});
