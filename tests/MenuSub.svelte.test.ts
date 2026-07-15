import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import MenuSub from "#svs/MenuSub.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuSubBasic from "./fixtures/MenuSubBasic.svelte";
import MenuSubContextMenu from "./fixtures/MenuSubContextMenu.svelte";
import MenuSubSiblings from "./fixtures/MenuSubSiblings.svelte";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const child = createRawSnippet<[string]>((variant) => ({ render: () => `<div data-testid="child">Child ${variant()}</div>` }));
const trigger = (c: HTMLElement, text = "More") =>
  [...c.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === text)!;
const middle = (c: HTMLElement) => c.querySelector("[popover]") as HTMLDivElement;
const menus = (c: HTMLElement) => [...c.querySelectorAll<HTMLDivElement>('[role="menu"]')];
const item = (c: HTMLElement, text: string) =>
  [...c.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === text)!;
const flush = async () => {
  await Promise.resolve();
  await tick();
};
const key = async (el: HTMLElement, init: KeyboardEventInit) => {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  await flush();
  return ev;
};
const pointer = async (el: HTMLElement | Document, type: string, init: PointerEventInit = {}) => {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }));
  await flush();
};
const rawClick = async (el: HTMLElement) => {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  await flush();
  return ev;
};
const setHover = (can = true) =>
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

afterEach(() => {
  document.querySelectorAll(":popover-open").forEach((el) => (el as HTMLElement & { hidePopover(): void }).hidePopover());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MenuSub structure and styling", () => {
  test("renders submenu trigger and popover anatomy", async () => {
    const { container } = render(MenuSubBasic);
    const button = trigger(container);
    const pop = middle(container);

    await expect.element(button.parentElement as HTMLElement).toHaveAttribute("role", "none");
    await expect.element(button).toHaveAttribute("type", "button");
    await expect.element(button).toHaveAttribute("tabindex", "-1");
    await expect.element(button).toHaveAttribute("aria-haspopup", "menu");
    await expect.element(button).toHaveAttribute("aria-expanded", "false");
    expect(button.getAttribute("style")).toContain("anchor-name: --svs-menu-sub");
    await expect.element(pop).toHaveAttribute("role", "none");
    await expect.element(pop).toHaveAttribute("popover", "manual");
    expect(pop.getAttribute("style")).toContain("position-anchor: --svs-menu-sub");
    expect(pop.getAttribute("style")).toContain("position-try-fallbacks: flip-inline");
  });

  test("passes rest and class to the trigger, with owned attributes winning", async () => {
    const { container } = render(MenuSub, {
      label: "More",
      children: child,
      class: "mine",
      role: "button",
      type: "submit",
      "data-id": "x",
    } as any);
    const button = trigger(container);

    await expect.element(button).toHaveClass("svs-menu-sub", PARTS.MAIN, VARIANT.NEUTRAL, "mine");
    await expect.element(button.parentElement as HTMLElement).toHaveClass("svs-menu-sub", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(button.parentElement?.classList.contains("mine")).toBe(false);
    await expect.element(button).toHaveAttribute("role", "menuitem");
    await expect.element(button).toHaveAttribute("type", "button");
    await expect.element(button).toHaveAttribute("data-id", "x");
  });

  test("labels nested MenuList from the trigger id", async () => {
    const { container } = render(MenuSubBasic);
    expect(menus(container)[1].getAttribute("aria-labelledby")).toBe(trigger(container).id);
  });

  test("supports styling string, object form, and variants", async () => {
    const stringy = render(MenuSubBasic, { standalone: true, subStyling: "sub", subVariant: VARIANT.ACTIVE });
    await expect.element(trigger(stringy.container)).toHaveClass("sub", PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(middle(stringy.container)).toHaveClass("sub", PARTS.MIDDLE, VARIANT.ACTIVE);
    stringy.unmount();

    const styled = {
      whole: { base: "whole-base", active: "whole-active" },
      main: { base: "main-base", active: "main-active" },
      middle: { base: "middle-base", active: "middle-active" },
    };
    const objecty = render(MenuSubBasic, { standalone: true, subStyling: styled, subVariant: VARIANT.ACTIVE });
    await expect.element(trigger(objecty.container).parentElement as HTMLElement).toHaveClass("whole-base", "whole-active");
    await expect.element(trigger(objecty.container)).toHaveClass("main-base", "main-active");
    await expect.element(middle(objecty.container)).toHaveClass("middle-base", "middle-active");
  });
});

describe("MenuSub open and keyboard behavior", () => {
  test("click toggles and opens the native popover", async () => {
    const props = $state({ open: false });
    const { container } = render(MenuSubBasic, props);

    await userEvent.click(trigger(container));
    await flush();
    expect(props.open).toBe(true);
    await expect.element(trigger(container)).toHaveAttribute("aria-expanded", "true");
    expect(middle(container).matches(":popover-open")).toBe(true);

    await userEvent.click(trigger(container));
    await flush();
    expect(props.open).toBe(false);
    expect(middle(container).matches(":popover-open")).toBe(false);
  });

  test("vertical keyboard opens forward and closes back to the trigger", async () => {
    const props = $state({ open: false });
    const { container } = render(MenuSubBasic, props);
    trigger(container).focus();

    const openEv = await key(trigger(container), { key: "ArrowRight" });
    expect(openEv.defaultPrevented).toBe(true);
    await expect.element(item(container, "Alpha")).toHaveFocus();

    const closeEv = await key(middle(container), { key: "ArrowLeft" });
    expect(closeEv.defaultPrevented).toBe(true);
    await expect.element(trigger(container)).toHaveFocus();
    expect(props.open).toBe(false);
  });

  test("horizontal keyboard uses ArrowDown and ArrowUp", async () => {
    const { container } = render(MenuSubBasic, { orientation: "horizontal" });
    trigger(container).focus();

    await key(trigger(container), { key: "ArrowDown" });
    await expect.element(item(container, "Alpha")).toHaveFocus();
    await key(middle(container), { key: "ArrowUp" });
    await expect.element(trigger(container)).toHaveFocus();
  });

  test("Enter and Space toggle the submenu", async () => {
    const props = $state({ open: false });
    const { container } = render(MenuSubBasic, props);

    await key(trigger(container), { key: "Enter" });
    expect(props.open).toBe(true);
    await key(trigger(container), { key: " " });
    expect(props.open).toBe(false);
  });

  test("Escape inside a submenu closes only that submenu", async () => {
    const props = $state({ open: true, subOpen: true });
    const { container } = render(MenuSubContextMenu, props);
    await flush();

    await key(middle(container), { key: "Escape" });

    expect(props.subOpen).toBe(false);
    expect(props.open).toBe(true);
  });

  test("selecting a leaf item closes the whole chain", async () => {
    const onselect = vi.fn();
    const props = $state({ open: true, subOpen: true, onselect });
    const { container } = render(MenuSubContextMenu, props);
    await flush();

    await userEvent.click(item(container, "Leaf"));
    await flush();

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.subOpen).toBe(false);
    expect(props.open).toBe(false);
  });

  test("disabled submenu does not open by click, key, or hover", async () => {
    setHover(true);
    const props = $state({ open: false, disabled: true });
    const { container } = render(MenuSubBasic, props);
    const button = trigger(container);

    const ev = await rawClick(button);
    await key(button, { key: "ArrowRight" });
    await pointer(button, "pointermove");

    expect(ev.defaultPrevented).toBe(true);
    expect(props.open).toBe(false);
    await expect.element(button).toHaveAttribute("aria-disabled", "true");
  });
});

describe("MenuSub pointer behavior", () => {
  test("hover opens and moving to a plain sibling closes", async () => {
    setHover(true);
    const props = $state({ open: false });
    const { container } = render(MenuSubBasic, props);

    await pointer(trigger(container), "pointermove");
    expect(props.open).toBe(true);
    await pointer(item(container, "After"), "pointermove", { clientX: 10, clientY: 10 });
    expect(props.open).toBe(false);
  });

  test("safe triangle defers sibling opening while moving toward the submenu", async () => {
    setHover(true);
    const props = $state({ openA: false, openB: false });
    const { container } = render(MenuSubSiblings, props);
    const a = trigger(container, "Sub A");
    const b = trigger(container, "Sub B");
    const popA = middle(container);
    vi.spyOn(popA, "getBoundingClientRect").mockReturnValue({
      x: 200,
      y: 0,
      left: 200,
      top: 0,
      right: 320,
      bottom: 100,
      width: 120,
      height: 100,
      toJSON: () => ({}),
    } as DOMRect);

    await pointer(a, "pointermove", { clientX: 80, clientY: 20 });
    await pointer(a, "pointerleave", { clientX: 100, clientY: 20 });
    await pointer(b, "pointermove", { clientX: 150, clientY: 35 });

    expect(props.openA).toBe(true);
    expect(props.openB).toBe(false);
  });

  test("safe triangle timeout resolves to the deferred sibling", async () => {
    setHover(true);
    const props = $state({ openA: false, openB: false });
    const { container } = render(MenuSubSiblings, props);
    const a = trigger(container, "Sub A");
    const b = trigger(container, "Sub B");
    vi.spyOn(middle(container), "getBoundingClientRect").mockReturnValue({
      x: 200,
      y: 0,
      left: 200,
      top: 0,
      right: 320,
      bottom: 100,
      width: 120,
      height: 100,
      toJSON: () => ({}),
    } as DOMRect);

    await pointer(a, "pointermove", { clientX: 80, clientY: 20 });
    await pointer(a, "pointerleave", { clientX: 100, clientY: 20 });
    await pointer(b, "pointermove", { clientX: 150, clientY: 35 });
    await new Promise((resolve) => setTimeout(resolve, 330));
    await flush();

    expect(props.openA).toBe(false);
    expect(props.openB).toBe(true);
  });

  test("standalone submenu renders and opens without MenuItemContext", async () => {
    const props = $state({ open: false, standalone: true });
    const { container } = render(MenuSubBasic, props);

    await userEvent.click(trigger(container));
    await flush();

    expect(props.open).toBe(true);
    expect(middle(container).matches(":popover-open")).toBe(true);
  });
});

describe("accessibility (axe)", () => {
  test("composed submenu has no violations", async () => {
    const { container } = render(MenuSubBasic);

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
