import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render as browserRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import Disclosure from "#svs/Disclosure.svelte";
import { PARTS, VARIANT } from "#svs/core";
import DisclosureCtxProvider from "./fixtures/DisclosureCtxProvider.svelte";
import DisclosureVariantBinding from "./fixtures/DisclosureVariantBinding.svelte";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const label = "Disclosure Label";
const childrenContent = "Disclosure Content";
const childrenTestId = "test-children";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div data-testid="${childrenTestId}">${childrenContent}</div>` };
});

const labelSnippet = createRawSnippet((_open: () => boolean, variant: () => string) => {
  return {
    render: () => `<span data-testid="test-label">${label} - ${variant()}</span>`,
    setup: (element) => {
      $effect(() => {
        element.textContent = `${label} - ${variant()}`;
      });
    },
  };
});

const waitFor = vi.waitFor;
const has = (el: Element, ...names: string[]) => expect([...el.classList]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element, name: string) => expect(el.classList.contains(name)).toBe(false);
const byText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("*")).find((el) => el.textContent?.trim() === text) as HTMLElement;
const render = (component: Parameters<typeof browserRender>[0], props?: Parameters<typeof browserRender>[1]) => {
  const screen = browserRender(component, props);
  return {
    ...screen,
    getByRole: (role: string) => (role === "group" ? screen.container.querySelector("details") : screen.container.querySelector(`[role="${role}"]`)) as HTMLElement,
    getByText: (text: string) => byText(screen.container, text),
    getByTestId: (id: string) => screen.container.querySelector(`[data-testid="${id}"]`) as HTMLElement,
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
    expect(details.hasAttribute("open")).toBe(false);
  });

  test("w/ label as snippet", () => {
    const { getByTestId } = render(Disclosure, {
      label: labelSnippet,
      children: childrenSnippet,
    });
    const labelEl = getByTestId("test-label");
    expect(labelEl?.isConnected).toBe(true);
    expect(labelEl.textContent).toContain(`${label} - ${VARIANT.NEUTRAL}`);
  });

  test("w/ open=true", () => {
    const { getByRole, getByTestId } = render(Disclosure, {
      label,
      children: childrenSnippet,
      open: true,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    const content = getByTestId(childrenTestId);
    expect(details.hasAttribute("open")).toBe(true);
    expect(content?.isConnected).toBe(true);
    expect(content.textContent).toContain(childrenContent);
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      attach,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details?.isConnected).toBe(true);
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
    expect(details.getAttribute("aria-expanded")).toBe("false");
  });

  test("w/ custom duration", () => {
    const { getByRole } = render(Disclosure, {
      label,
      children: childrenSnippet,
      duration: 200,
    });
    const details = getByRole("group") as HTMLDetailsElement;
    expect(details?.isConnected).toBe(true);
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
    const { getByRole, getByText, getByTestId } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details.hasAttribute("open")).toBe(false);
    expect(props.open).toBe(false);

    await userEvent.click(summary);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(props.open).toBe(true);
      expect(getByTestId(childrenTestId)?.isConnected).toBe(true);
    });
    await userEvent.click(summary);
    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      expect(getByTestId(childrenTestId)?.isConnected).toBe(true);
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
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await userEvent.click(summary);
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.ACTIVE);
    });

    await userEvent.click(summary);
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

    expect(details.hasAttribute("open")).toBe(false);

    props.open = true;
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(getByTestId(childrenTestId)?.isConnected).toBe(true);
    });

    props.open = false;
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
    });
  });
  test("native toggle event handling", async () => {
    const ontoggle = vi.fn();
    const props = {
      label,
      children: childrenSnippet,
      ontoggle,
      duration: 0,
    };
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);
    await userEvent.click(summary);
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
    const { container, getByTestId } = render(Disclosure, props);

    const summary = container.querySelector("summary")!;

    expect(getByTestId("test-label").textContent).toContain(`${label} - ${VARIANT.NEUTRAL}`);

    await userEvent.click(summary);

    await waitFor(() => {
      expect(getByTestId("test-label").textContent).toContain(`${label} - ${VARIANT.ACTIVE}`);
    });
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
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    await userEvent.click(getByText(label));

    await waitFor(() => expect(details.open).toBe(false));
  });

  test("custom transition fn is used for open content", async () => {
    const fn = vi.fn(() => ({}));
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0, transition: { fn } });
    const { getByText } = render(Disclosure, props);

    await userEvent.click(getByText(label));
    await tick();

    expect(fn).toHaveBeenCalled();
  });

  test("reduced motion suppresses custom transition fn", async () => {
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
    const fn = vi.fn(() => ({}));
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0, transition: { fn } });
    const { getByText } = render(Disclosure, props);

    await userEvent.click(getByText(label));
    await tick();

    expect(fn).not.toHaveBeenCalled();
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

    await waitFor(() => expect(details.hasAttribute("open")).toBe(true));

    props.variant = "custom-variant";

    await waitFor(() => {
      has(details, "custom-variant");
      has(summary, "custom-variant");
    });
    expect(details.hasAttribute("open")).toBe(true);
    expect(props.open).toBe(true);
  });

  test("summary activation toggles the managed open state", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0 });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    summary.focus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(props.open).toBe(true);
      expect(details.open).toBe(true);
      expect(details.hasAttribute("open")).toBe(true);
    });
  });

  test("forwards onclick on the summary", async () => {
    const onclick = vi.fn();
    const props = { label, children: childrenSnippet, onclick, duration: 0 };
    const { getByText } = render(Disclosure, props);

    await userEvent.click(getByText(label));

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test("renders exactly one main in steady open and closed states", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, duration: 0 });
    const { container, getByText } = render(Disclosure, props);

    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));

    await userEvent.click(getByText(label));
    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));

    await userEvent.click(getByText(label));
    await waitFor(() => expect(container.querySelectorAll(".main").length).toBe(1));
  });
});

describe("Soft-disable (inactive)", () => {
  test("aria attrs while inactive", () => {
    const { container, getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
      inactive: "locked",
    });
    const summary = getByText(label);

    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.getAttribute("aria-disabled")).toBe("true");
    expect(summary.getAttribute("aria-description")).toBe("locked");
    expect(container.textContent).not.toContain("locked");
    expect(container.querySelectorAll('[aria-description="locked"]')).toHaveLength(1);
  });

  test("variant is forced to inactive and restored when inactive is cleared", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      duration: 0,
      inactive: "locked" as string | undefined,
      variant: VARIANT.NEUTRAL as string,
    });
    const { getByRole, getByText, rerender } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.INACTIVE);
      has(details, VARIANT.INACTIVE);
      has(summary, VARIANT.INACTIVE);
    });

    props.inactive = undefined;
    await rerender(props);

    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.NEUTRAL);
      has(details, VARIANT.NEUTRAL);
      has(summary, VARIANT.NEUTRAL);
    });
  });

  test("variant writes while inactive are recaptured and restored when inactive is cleared", async () => {
    const customVariant = "custom-while-inactive";
    const { getByRole, getByText, getByTestId } = render(DisclosureVariantBinding);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);
    const parentVariant = getByTestId("parent-variant");

    await waitFor(() => {
      expect(parentVariant.textContent).toContain(VARIANT.INACTIVE);
      has(details, VARIANT.INACTIVE);
      has(summary, VARIANT.INACTIVE);
    });

    await userEvent.click(getByTestId("set-custom"));

    await waitFor(() => {
      expect(parentVariant.textContent).toContain(VARIANT.INACTIVE);
      has(details, VARIANT.INACTIVE);
      has(summary, VARIANT.INACTIVE);
    });

    await userEvent.click(getByTestId("clear-inactive"));

    await waitFor(() => {
      expect(parentVariant.textContent).toContain(customVariant);
      has(details, customVariant);
      has(summary, customVariant);
    });
  });

  test("click cannot open while inactive", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, inactive: "locked", duration: 0 });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    await userEvent.click(getByText(label));

    expect(details.hasAttribute("open")).toBe(false);
    expect(props.open).toBe(false);
  });

  test("click-dispatched activation cannot open while inactive", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, inactive: "locked", duration: 0 });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    summary.focus();
    summary.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await tick();

    expect(details.hasAttribute("open")).toBe(false);
    expect(props.open).toBe(false);
  });

  test("initial open=true is collapsed while inactive", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
      inactive: "locked",
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      expect(props.variant).toBe(VARIANT.INACTIVE);
      expect(summary.getAttribute("aria-disabled")).toBe("true");
    });
  });

  test("setting inactive while open collapses", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
      inactive: undefined as string | undefined,
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText, rerender } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(props.open).toBe(true);
    });

    props.inactive = "locked";
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      expect(props.variant).toBe(VARIANT.INACTIVE);
      expect(summary.getAttribute("aria-disabled")).toBe("true");
    });
  });

  test("clearing inactive after collapsing from open restores neutral variant", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
      inactive: undefined as string | undefined,
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText, rerender } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(props.variant).toBe(VARIANT.ACTIVE);
    });

    props.inactive = "locked";
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      expect(props.variant).toBe(VARIANT.INACTIVE);
    });

    props.inactive = undefined;
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      has(details, VARIANT.NEUTRAL);
      has(summary, VARIANT.NEUTRAL);
    });
  });

  test("onclick is suppressed while inactive", async () => {
    const onclick = vi.fn();
    const { getByText } = render(Disclosure, {
      label,
      children: childrenSnippet,
      inactive: "locked",
      onclick,
      duration: 0,
    });

    await userEvent.click(getByText(label));

    expect(onclick).not.toHaveBeenCalled();
  });

  test("programmatic open is blocked while inactive", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, inactive: "locked", duration: 0 });
    const { getByRole, rerender } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    props.open = true;
    await rerender(props);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
    });
  });

  test.each(["", "   "])("inactive value %j is inert", async (inactive) => {
    const props = $state({ label, children: childrenSnippet, open: false, inactive, variant: VARIANT.NEUTRAL as string, duration: 0 });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(summary.hasAttribute("aria-disabled")).toBe(false);
    expect(summary.hasAttribute("aria-description")).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await userEvent.click(summary);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(props.open).toBe(true);
      expect(props.variant).toBe(VARIANT.ACTIVE);
    });
  });

  test("inactive={true} soft-disables without a reason", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      inactive: true as string | boolean | undefined,
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(summary.getAttribute("aria-disabled")).toBe("true");
      expect(summary.hasAttribute("aria-description")).toBe(false);
      has(details, VARIANT.INACTIVE);
    });

    await userEvent.click(summary);

    expect(details.hasAttribute("open")).toBe(false);
    expect(props.open).toBe(false);
  });

  test("inactive={true} collapses an initially open disclosure", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: true,
      inactive: true as string | boolean | undefined,
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
      expect(props.variant).toBe(VARIANT.INACTIVE);
      expect(summary.getAttribute("aria-disabled")).toBe("true");
      expect(summary.hasAttribute("aria-description")).toBe(false);
    });
  });

  test("inactive={false} is fully active", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      inactive: false as string | boolean | undefined,
      variant: VARIANT.NEUTRAL as string,
      duration: 0,
    });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(summary.hasAttribute("aria-disabled")).toBe(false);
    expect(summary.hasAttribute("aria-description")).toBe(false);

    await userEvent.click(summary);

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(true);
      expect(props.open).toBe(true);
    });
  });

  test("native toggle stays collapsed while inactive", async () => {
    const props = $state({ label, children: childrenSnippet, open: false, inactive: "locked", duration: 0 });
    const { getByRole } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await tick();

    await waitFor(() => {
      expect(details.hasAttribute("open")).toBe(false);
      expect(props.open).toBe(false);
    });
  });
});

describe("Accordion context", () => {
  const detailsByLabel = (container: HTMLElement, text: string) =>
    Array.from(container.querySelectorAll("details")).find((details) => details.textContent?.includes(text)) as HTMLDetailsElement;
  const summaryByLabel = (container: HTMLElement, text: string) =>
    Array.from(container.querySelectorAll("summary")).find((summary) => summary.textContent?.includes(text)) as HTMLElement;

  test("context-driven current opens through the animated main path", async () => {
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base" });
    const { container, rerender } = render(DisclosureCtxProvider, props);
    const detailsA = detailsByLabel(container, "Section A");

    expect(detailsA.open).toBe(false);
    expect(container.querySelectorAll("#a .main")).toHaveLength(1);

    props.current = "a";
    await rerender(props);

    await waitFor(() => {
      expect(detailsA.open).toBe(true);
      expect(container.querySelector("#a .main.active")?.isConnected).toBe(true);
      expect(container.querySelectorAll("#a .main")).toHaveLength(1);
    });
  });

  test("summary click syncs current in both directions", async () => {
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base" });
    const { container } = render(DisclosureCtxProvider, props);
    const detailsA = detailsByLabel(container, "Section A");
    const summaryA = summaryByLabel(container, "Section A");

    await userEvent.click(summaryA);
    await waitFor(() => {
      expect(props.current).toBe("a");
      expect(detailsA.open).toBe(true);
    });

    await userEvent.click(summaryA);
    await waitFor(() => {
      expect(props.current).toBeUndefined();
      expect(detailsA.open).toBe(false);
    });
  });

  test("external details toggle syncs through context", async () => {
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base" });
    const { container } = render(DisclosureCtxProvider, props);
    const detailsA = detailsByLabel(container, "Section A");

    detailsA.open = true;
    detailsA.dispatchEvent(new Event("toggle"));

    await waitFor(() => expect(props.current).toBe("a"));

    detailsA.open = false;
    detailsA.dispatchEvent(new Event("toggle"));

    await waitFor(() => expect(props.current).toBeUndefined());
  });

  test("opening B closes A through current-driven effOpen", async () => {
    const props = $state({ current: "a" as string | undefined, variant: "accordion-base" });
    const { container } = render(DisclosureCtxProvider, props);
    const detailsA = detailsByLabel(container, "Section A");
    const detailsB = detailsByLabel(container, "Section B");

    await waitFor(() => expect(detailsA.open).toBe(true));

    await userEvent.click(summaryByLabel(container, "Section B"));

    await waitFor(() => {
      expect(props.current).toBe("b");
      expect(detailsA.open).toBe(false);
      expect(detailsB.open).toBe(true);
    });
  });

  test("provider base variant wins for collapsed children and active/inactive still derive locally", async () => {
    const props = $state({
      current: undefined as string | undefined,
      variant: "accordion-base",
      inactiveA: "locked" as string | undefined,
    });
    const { container, rerender } = render(DisclosureCtxProvider, props);
    const detailsA = detailsByLabel(container, "Section A");
    const detailsB = detailsByLabel(container, "Section B");

    await waitFor(() => {
      has(detailsA, VARIANT.INACTIVE);
      has(detailsB, "accordion-base");
      lacks(detailsB, "child-local");
    });

    props.inactiveA = undefined;
    props.current = "a";
    await rerender(props);

    await waitFor(() => {
      has(detailsA, VARIANT.ACTIVE);
      has(detailsB, "accordion-base");
    });
  });

  test("name is dropped at runtime", () => {
    const { getByTestId } = render(Disclosure, {
      label,
      children: childrenSnippet,
      name: "grp",
      "data-testid": "named-disclosure",
    } as never);

    expect(getByTestId("named-disclosure").hasAttribute("name")).toBe(false);
  });

  test("exclusivity changes settle without effect-depth warnings", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base" });
    const { container } = render(DisclosureCtxProvider, props);

    await userEvent.click(summaryByLabel(container, "Section A"));
    await userEvent.click(summaryByLabel(container, "Section B"));
    await userEvent.click(summaryByLabel(container, "Section A"));
    await tick();

    await waitFor(() => {
      expect(detailsByLabel(container, "Section A").open).toBe(true);
      expect(detailsByLabel(container, "Section B").open).toBe(false);
      expect(props.current).toBe("a");
    });
    expect([...warn.mock.calls, ...error.mock.calls].flat().join("\n")).not.toContain("effect_update_depth");
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

    has(details, seed, PARTS.WHOLE, VARIANT.ACTIVE);
    has(summary, seed, PARTS.LABEL, VARIANT.ACTIVE);
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

    has(details, styleId, PARTS.WHOLE, VARIANT.ACTIVE);
    has(summary, styleId, PARTS.LABEL, VARIANT.ACTIVE);
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

    has(details, dynObj.base, dynObj.active);
    has(summary, dynObj.base, dynObj.active);
  });

  test("class changes with variant", async () => {
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      variant: VARIANT.NEUTRAL,
      duration: 0,
    });
    const { getByRole, getByText } = render(Disclosure, props);

    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    has(details, seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    has(summary, seed, PARTS.LABEL, VARIANT.NEUTRAL);

    await userEvent.click(summary);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    has(details, seed, PARTS.WHOLE, VARIANT.ACTIVE);
    has(summary, seed, PARTS.LABEL, VARIANT.ACTIVE);

    await userEvent.click(summary);
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.NEUTRAL);
      has(details, seed, PARTS.WHOLE, VARIANT.NEUTRAL);
      has(summary, seed, PARTS.LABEL, VARIANT.NEUTRAL);
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

    has(details, "svs-disclosure", PARTS.WHOLE, VARIANT.ACTIVE, "extra-root");
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
    expect(details?.isConnected).toBe(true);
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

    has(details, seed, PARTS.WHOLE, customNeutral);
    has(summary, seed, PARTS.LABEL, customNeutral);
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

    has(details, seed, PARTS.WHOLE, VARIANT.ACTIVE);
    has(summary, seed, PARTS.LABEL, VARIANT.ACTIVE);
  });

  test("handles missing element gracefully", () => {
    const props = {
      label,
      children: childrenSnippet,
    };

    const { getByRole } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    expect(details?.isConnected).toBe(true);
  });
});

describe("accessibility (axe)", () => {
  test("closed render has no violations", async () => {
    const { container } = render(Disclosure, { label, children: childrenSnippet });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("open render has no violations", async () => {
    const { container } = render(Disclosure, { label, children: childrenSnippet, open: true });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
