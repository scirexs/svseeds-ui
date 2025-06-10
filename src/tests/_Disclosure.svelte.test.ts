import { describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Disclosure from "../lib/_svseeds/_Disclosure.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

const label = "Disclosure Label";
const childrenContent = "Disclosure Content";
const childrenTestId = "test-children";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div data-testid="${childrenTestId}">${childrenContent}</div>` };
});

const labelSnippet = createRawSnippet((open: () => boolean, variant: () => string) => {
  return { render: () => `<span data-testid="test-label">${label} - ${variant()}</span>` };
});

describe("Switching existence of elements", () => {
  const actionfn = () => {
    return {};
  };

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

  test("w/ action", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      action,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
    expect(action).toHaveBeenCalled();
  });

  test("w/ attributes", () => {
    const customAttrs = {
      "data-testid": "custom-disclosure",
      "aria-expanded": "false",
    };
    const { getByTestId } = render(Disclosure, {
      label,
      children: childrenSnippet,
      attributes: customAttrs,
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
      variant: "",
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

  // test("programmatic open change", async () => {
  //   const props = $state({
  //     label,
  //     children: childrenSnippet,
  //     open: false,
  //     duration: 0,
  //   });
  //   const { getByRole, getByTestId, queryByTestId, rerender } = render(Disclosure, props);

  //   const details = getByRole("group") as HTMLDetailsElement;

  //   expect(details).not.toHaveAttribute("open");
  //   expect(queryByTestId(childrenTestId)).toBeNull();

  //   props.open = true;
  //   await rerender(props);

  //   await waitFor(() => {
  //     expect(details).toHaveAttribute("open");
  //     expect(getByTestId(childrenTestId)).toBeInTheDocument();
  //   });

  //   props.open = false;
  //   await rerender(props);

  //   await waitFor(() => {
  //     expect(details).not.toHaveAttribute("open");
  //   });
  // });

  // test("toggle guard prevents rapid clicking", async () => {
  //   const props = $state({
  //     label,
  //     children: childrenSnippet,
  //     open: false,
  //     duration: 100,
  //   });
  //   const user = userEvent.setup();
  //   const { getByText } = render(Disclosure, props);

  //   const summary = getByText(label);

  //   await user.click(summary);
  //   expect(props.open).toBe(true);

  //   await user.click(summary);
  //   expect(props.open).toBe(true);

  //   await waitFor(() => {
  //     return user.click(summary).then(() => {
  //       expect(props.open).toBe(false);
  //     });
  //   }, { timeout: 200 });
  // });

  test("native toggle event handling", async () => {
    const user = userEvent.setup();
    const ontoggle = vi.fn();
    const props = {
      label,
      children: childrenSnippet,
      attributes: { ontoggle },
      duration: 0,
    };
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);
    await user.click(summary);
    expect(ontoggle).toHaveBeenCalled();
  });

  // test("label snippet receives correct variant", () => {
  //   const props = $state({
  //     label: labelSnippet,
  //     children: childrenSnippet,
  //     open: false,
  //     variant: VARIANT.NEUTRAL,
  //     duration: 0,
  //   });
  //   const { getByTestId } = render(Disclosure, props);

  //   const labelEl = getByTestId("test-label");

  //   expect(labelEl).toHaveTextContent(`${label} - ${VARIANT.NEUTRAL}`);
  // });
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
