import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Popover from "#svs/Popover.svelte";
import { PARTS, VARIANT } from "#svs/core";
import PopoverMenu from "./fixtures/PopoverMenu.svelte";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const content = "Panel content";
const children = createRawSnippet<[string]>((variant) => ({ render: () => `<div>${content}-${variant()}</div>` }));
const label = createRawSnippet<[boolean, string]>((open, variant) => ({
  render: () => `<span data-testid="label">${open() ? "open" : "closed"}-${variant()}</span>`,
}));
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;
const panel = (container: HTMLElement) => container.querySelector("[popover]") as HTMLDivElement;
const menu = (container: HTMLElement) => container.querySelector('[aria-orientation="vertical"]') as HTMLDivElement;
const item = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll('[role="menuitem"]')).find((el) => el.textContent?.trim() === name) as HTMLButtonElement;
const byText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("*")).find((el) => el.textContent?.trim() === text) as HTMLElement;
const flush = async () => {
  await Promise.resolve();
  await tick();
};
const toggle = (el: HTMLElement, state: "open" | "closed") =>
  el.dispatchEvent(new ToggleEvent("toggle", { newState: state, oldState: state === "open" ? "closed" : "open" }));
const setHover = (can: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: can,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
const pointerEnter = async (el: HTMLElement) => {
  el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
  await flush();
};
const focusIn = async (el: HTMLElement) => {
  el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  await flush();
};
const pointerLeave = async (el: HTMLElement, relatedTarget: EventTarget | null) => {
  el.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true, relatedTarget }));
  await flush();
};
const focusOut = async (el: HTMLElement, relatedTarget: EventTarget | null) => {
  el.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget }));
  await flush();
};

afterEach(() => {
  document.querySelectorAll(":popover-open").forEach((el) => (el as HTMLElement & { hidePopover(): void }).hidePopover());
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Popover structure, a11y, and positioning", () => {
  test("renders trigger, panel, snippets, and a11y wiring", async () => {
    const { container } = render(Popover, { label: "Open", children });
    const button = trigger(container);
    const pop = panel(container);
    expect(button.isConnected).toBe(true);
    expect(pop.isConnected).toBe(true);
    expect(byText(container, `${content}-${VARIANT.NEUTRAL}`).isConnected).toBe(true);
    await expect.element(pop).toHaveAttribute("popover", "auto");
    expect(button.getAttribute("popovertarget")).toBe(pop.id);
    expect(button.getAttribute("aria-controls")).toBe(pop.id);
    await expect.element(button).toHaveAttribute("aria-haspopup", "true");
    await expect.element(button).toHaveAttribute("type", "button");
    await expect.element(pop).not.toHaveAttribute("role");
    const snippet = render(Popover, { label, children, variant: VARIANT.ACTIVE, open: true });
    await flush();
    expect(snippet.container.querySelector("[data-testid='label']")?.textContent).toBe(`open-${VARIANT.ACTIVE}`);
    for (const ariaRole of ["menu", "listbox", "dialog"] as const) {
      const roles = render(Popover, { label: "Open", children, ariaRole });
      await expect.element(trigger(roles.container)).toHaveAttribute("aria-haspopup", ariaRole);
      await expect.element(panel(roles.container)).toHaveAttribute("role", ariaRole);
    }
    const manual = render(Popover, { label: "Open", children, manual: true });
    await expect.element(panel(manual.container)).toHaveAttribute("popover", "manual");
  });

  test("applies classes, optional elements, rest attributes, attachment, and position styles", async () => {
    let attached: HTMLButtonElement | undefined;
    const attach = vi.fn((el: HTMLButtonElement) => {
      attached = el;
    });
    const props = $state({
      label: "Open",
      children,
      element: undefined as HTMLButtonElement | undefined,
      attach,
      class: "mine",
      "data-x": "y",
      type: "submit",
      arrow: true,
      variant: VARIANT.ACTIVE,
      styling: "pop",
      position: "top" as const,
      align: "center" as const,
      offset: 8,
      matchWidth: true,
    });
    const { container } = render(Popover, props as any);
    const button = trigger(container);
    const pop = panel(container);
    await expect.element(button).toHaveClass("pop", PARTS.LABEL, VARIANT.ACTIVE, "mine");
    await expect.element(pop).toHaveClass("pop", PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(button).toHaveAttribute("data-x", "y");
    await expect.element(button).toHaveAttribute("type", "submit");
    expect(pop.classList.contains("mine")).toBe(false);
    expect(attached).toBe(button);
    expect(props.element).toBe(button);
    expect(attach).toHaveBeenCalled();
    const main = pop.querySelector(`.${PARTS.MAIN}`) as HTMLElement;
    await expect.element(main).toHaveClass("pop", PARTS.MAIN, VARIANT.ACTIVE);
    const arrow = pop.querySelector(`.${PARTS.BOTTOM}`) as HTMLElement;
    await expect.element(arrow).toHaveClass("pop", PARTS.BOTTOM, VARIANT.ACTIVE);
    await expect.element(arrow).toHaveAttribute("aria-hidden", "true");
    expect(pop.querySelector(`.${PARTS.EXTRA}`)).toBeNull();
    await expect.element(pop).toHaveAttribute("data-svs-placement", "top");
    expect(button.getAttribute("style")).toContain("anchor-name: --svs-popover");
    expect(pop.getAttribute("style")).not.toContain("display");
    expect(arrow.getAttribute("style")).toContain("position: absolute");
    // Chromium normalizes the authored `top center` position-area order.
    expect(pop.getAttribute("style")).toContain("position-area: center top");
    expect(pop.getAttribute("style")).toContain("margin-bottom: 8px");
    expect(pop.getAttribute("style")).toContain("min-width: anchor-size(width)");
    expect(pop.getAttribute("style")).toContain("position-try-fallbacks: flip-block, flip-inline");
    expect(pop.getAttribute("style")).toContain("overflow: visible");
    const fixed = render(Popover, { label: "Open", children, position: "right", align: "end", autoFlip: false });
    expect(panel(fixed.container).getAttribute("style")).toContain("position-area: right span-top");
    expect(panel(fixed.container).getAttribute("style")).not.toContain("position-try-fallbacks");
    expect(panel(fixed.container).getAttribute("style")).not.toContain("min-width: anchor-size(width)");
    expect(panel(fixed.container).getAttribute("style")).not.toContain("overflow");
    const defaults = render(Popover, { label: "Open", children });
    expect(trigger(defaults.container).getAttribute("style")).toContain("anchor-name: --svs-popover");
    expect(panel(defaults.container).getAttribute("style")).toContain("position-area: span-right bottom");
    expect(panel(defaults.container).getAttribute("style")).toContain("position-try-fallbacks: flip-block, flip-inline");
    const left = render(Popover, { label: "Open", children, position: "left", align: "start", offset: 8 });
    expect(panel(left.container).getAttribute("style")).toContain("position-area: left span-bottom");
    expect(panel(left.container).getAttribute("style")).toContain("margin-right: 8px");
    const none = render(Popover, { label: "Open", children, offset: 0 });
    expect(panel(none.container).getAttribute("style")).not.toContain("margin-");
  });

  test("forwards trigger event handlers through native dispatch", async () => {
    const onpointerenter = vi.fn();
    const onfocusin = vi.fn();
    const onpointerleave = vi.fn();
    const onfocusout = vi.fn();
    const { container } = render(Popover, { label: "Open", children, onpointerenter, onfocusin, onpointerleave, onfocusout } as any);
    const button = trigger(container);
    await pointerEnter(button);
    await focusIn(button);
    await pointerLeave(button, null);
    await focusOut(button, null);
    expect(onpointerenter).toHaveBeenCalledTimes(1);
    expect(onfocusin).toHaveBeenCalledTimes(1);
    expect(onpointerleave).toHaveBeenCalledTimes(1);
    expect(onfocusout).toHaveBeenCalledTimes(1);
  });
});

describe("Popover open synchronization and menu context", () => {
  test("opens and closes through the real Popover API", async () => {
    const initial = render(PopoverMenu, { open: true });
    const initialPanel = panel(initial.container);
    await flush();
    expect(initialPanel.matches(":popover-open")).toBe(true);
    await expect.element(trigger(initial.container)).toHaveAttribute("aria-expanded", "true");
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);
    const opened = new Promise<void>((resolve) => pop.addEventListener("toggle", () => resolve(), { once: true }));
    props.open = true;
    await opened;
    await flush();
    expect(pop.matches(":popover-open")).toBe(true);
    await expect.element(trigger(container)).toHaveAttribute("aria-expanded", "true");
    const closed = new Promise<void>((resolve) => pop.addEventListener("toggle", () => resolve(), { once: true }));
    props.open = false;
    await closed;
    await flush();
    await expect.element(trigger(container)).toHaveAttribute("aria-expanded", "false");
    expect(pop.matches(":popover-open")).toBe(false);
  });

  test("synchronizes native ToggleEvent state without re-entering the real API", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);
    toggle(pop, "open");
    await flush();
    expect(props.open).toBe(true);
    await expect.element(trigger(container)).toHaveAttribute("aria-expanded", "true");
    // Synthetic ToggleEvent updates component state but does not move the real top layer.
    expect(pop.matches(":popover-open")).toBe(false);
    toggle(pop, "closed");
    await flush();
    expect(props.open).toBe(false);
    await expect.element(trigger(container)).toHaveAttribute("aria-expanded", "false");
  });

  test("provides nested menu theme, focus, and close-on-item-activation", async () => {
    const themed = render(PopoverMenu, { open: true, variant: VARIANT.ACTIVE, styling: "ctx" });
    await flush();
    await expect.element(menu(themed.container)).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
    const props = $state({ open: false, onselect: vi.fn() });
    const { container } = render(PopoverMenu, props);
    props.open = true;
    await flush();
    const cut = item(container, "Cut");
    await expect.element(cut).toHaveFocus();
    await userEvent.click(cut);
    await flush();
    expect(props.onselect).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
    expect(panel(container).matches(":popover-open")).toBe(false);
  });
});

describe("Popover hover behavior", () => {
  test("opens on pointer/focus and stays open until leaving both trigger and panel", async () => {
    setHover(true);
    const props = $state({ open: false, hover: true });
    const { container } = render(PopoverMenu, props);
    const button = trigger(container);
    const pop = panel(container);
    await pointerEnter(button);
    expect(props.open).toBe(true);
    await pointerLeave(button, pop);
    expect(props.open).toBe(true);
    await pointerLeave(button, document.body);
    expect(props.open).toBe(false);
    await focusIn(button);
    expect(props.open).toBe(true);
    await focusOut(button, document.body);
    expect(props.open).toBe(false);
  });

  test("composes user handlers with hover behavior and does not open when disabled", async () => {
    setHover(true);
    const onpointerenter = vi.fn();
    const onfocusin = vi.fn();
    const onpointerleave = vi.fn();
    const onfocusout = vi.fn();
    const props = $state({ label: "Open", children, hover: true, open: false, onpointerenter, onfocusin, onpointerleave, onfocusout });
    const { container } = render(Popover, props as any);
    const button = trigger(container);
    await pointerEnter(button);
    expect(props.open).toBe(true);
    expect(onpointerenter).toHaveBeenCalledTimes(1);
    await pointerLeave(button, document.body);
    expect(props.open).toBe(false);
    expect(onpointerleave).toHaveBeenCalledTimes(1);
    await focusIn(button);
    expect(props.open).toBe(true);
    expect(onfocusin).toHaveBeenCalledTimes(1);
    await focusOut(button, document.body);
    expect(props.open).toBe(false);
    expect(onfocusout).toHaveBeenCalledTimes(1);
    const disabled = $state({ open: false });
    const disabledRender = render(PopoverMenu, disabled);
    await pointerEnter(trigger(disabledRender.container));
    expect(disabled.open).toBe(false);
  });

  test("does not wire hover behavior on touch but retains user handlers and ToggleEvent sync", async () => {
    setHover(false);
    const onpointerenter = vi.fn();
    const onfocusin = vi.fn();
    const onpointerleave = vi.fn();
    const onfocusout = vi.fn();
    const props = $state({ label: "Open", children, hover: true, open: false, onpointerenter, onfocusin, onpointerleave, onfocusout });
    const { container } = render(Popover, props as any);
    const button = trigger(container);
    await pointerEnter(button);
    await focusIn(button);
    await pointerLeave(button, document.body);
    await focusOut(button, document.body);
    expect(props.open).toBe(false);
    expect(onpointerenter).toHaveBeenCalledTimes(1);
    expect(onfocusin).toHaveBeenCalledTimes(1);
    expect(onpointerleave).toHaveBeenCalledTimes(1);
    expect(onfocusout).toHaveBeenCalledTimes(1);
    const menuProps = $state({ open: false, hover: true });
    const menuRender = render(PopoverMenu, menuProps);
    const pop = panel(menuRender.container);
    toggle(pop, "open");
    await flush();
    expect(menuProps.open).toBe(true);
    await pointerLeave(pop, document.body);
    await focusOut(pop, document.body);
    expect(menuProps.open).toBe(true);
    toggle(pop, "closed");
    await flush();
    expect(menuProps.open).toBe(false);
  });
});

describe("accessibility (axe)", () => {
  test("closed render has no violations", async () => {
    const { container } = render(Popover, { label: "Open", children });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("open render has no violations", async () => {
    const { container } = render(Popover, { label: "Open", children, open: true });
    await flush();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
