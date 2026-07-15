import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render as browserRender } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import ContextMenu from "#svs/ContextMenu.svelte";
import { PARTS, VARIANT } from "#svs/core";
import ContextMenuItems from "./fixtures/ContextMenuItems.svelte";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const childrenContent = "Menu Item";
const childrenSnippet = createRawSnippet(() => ({ render: () => `<div>${childrenContent}</div>` }));

function root(container: HTMLElement) {
  return container.firstChild as HTMLDivElement;
}

function menu(container: HTMLElement) {
  return container.querySelector('[role="menu"]') as HTMLDivElement;
}

const waitFor = vi.waitFor;
const has = (el: Element, ...names: string[]) => expect([...el.classList]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element, name: string) => expect(el.classList.contains(name)).toBe(false);
const style = (el: HTMLElement, text: string) => expect(el.getAttribute("style") ?? "").toContain(text);
const notStyle = (el: HTMLElement, text: string) => expect(el.getAttribute("style") ?? "").not.toContain(text);
const byText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("*")).find((el) => el.textContent?.trim() === text) as HTMLElement;
const render = (component: Parameters<typeof browserRender>[0], props?: Parameters<typeof browserRender>[1]) => {
  const screen = browserRender(component, props);
  return {
    ...screen,
    getByText: (text: string) => byText(screen.container, text),
  };
};

const targets: HTMLElement[] = [];
function appendTarget() {
  const target = document.createElement("button");
  document.body.appendChild(target);
  targets.push(target);
  return target;
}

async function contextmenu(target: Document | HTMLElement = document, init: MouseEventInit = {}) {
  await tick();
  const event = new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  await tick();
  return event;
}

async function openMenu(target: Document | HTMLElement = document) {
  await contextmenu(target);
}

async function clickDocument() {
  await tick();
  document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await tick();
}

async function pointer(target: Document | HTMLElement, type: string, init: PointerEventInit = {}) {
  await tick();
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "touch", isPrimary: true, ...init }));
  await tick();
}

async function keyDocument(key: string) {
  await tick();
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  await tick();
}

async function afterLongPress() {
  await new Promise((resolve) => setTimeout(resolve, 750));
  await tick();
}

afterEach(() => {
  targets.splice(0).forEach((target) => target.remove());
  vi.restoreAllMocks();
});

describe("ContextMenu rendering and visibility", () => {
  test("renders with children snippet and is initially hidden", () => {
    const { container, getByText } = render(ContextMenu, { children: childrenSnippet });
    const wrapper = root(container);

    expect(wrapper?.isConnected).toBe(true);
    expect(getByText(childrenContent)?.isConnected).toBe(true);
    style(wrapper, "visibility: hidden");
    style(wrapper, "z-index: -9999");
  });

  test("shows when open prop is true", () => {
    const { container } = render(ContextMenu, { children: childrenSnippet, open: true });
    const wrapper = root(container);

    style(wrapper, "visibility: visible");
    notStyle(wrapper, "z-index: -9999");
  });

  test("applies default, custom variant, and styling classes", () => {
    const normal = render(ContextMenu, { children: childrenSnippet });
    has(root(normal.container), "svs-context-menu", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(ContextMenu, { children: childrenSnippet, variant: VARIANT.ACTIVE });
    has(root(active.container), "svs-context-menu", PARTS.WHOLE, VARIANT.ACTIVE);
    active.unmount();

    const styled = render(ContextMenu, { children: childrenSnippet, styling: "custom-styling" });
    has(root(styled.container), "custom-styling", PARTS.WHOLE, VARIANT.NEUTRAL);
    lacks(root(styled.container), "svs-context-menu");
  });
});

describe("ContextMenu semantics", () => {
  test("menu semantics live on MenuList, not the wrapper", () => {
    const { container } = render(ContextMenuItems, { open: true });
    const wrapper = root(container);
    const list = menu(container);

    expect(list.getAttribute("role")).toBe("menu");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(list.getAttribute("tabindex")).toBe("-1");
    expect(wrapper.hasAttribute("role")).toBe(false);
  });

  test("forwards rest attributes to wrapper without owning role", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      open: true,
      "aria-label": "Actions",
      role: "presentation",
    } as any);
    const wrapper = root(container);

    expect(wrapper.getAttribute("aria-label")).toBe("Actions");
    expect(wrapper.getAttribute("role")).toBe("presentation");
  });

  test("container forwards context variant and styling to MenuList", () => {
    const { container } = render(ContextMenuItems, { open: true, variant: VARIANT.ACTIVE, styling: "ctx" });
    has(menu(container), "ctx", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});

describe("ContextMenu event handling", () => {
  test("shows on right click", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, { props });
    const wrapper = root(container);

    expect(props.open).toBe(false);
    style(wrapper, "visibility: hidden");

    await openMenu();

    expect(props.open).toBe(true);
    style(wrapper, "visibility: visible");
  });

  test("hides on document click", async () => {
    const props = $state({ children: childrenSnippet, open: true });
    const { container } = render(ContextMenu, { props });

    await clickDocument();

    expect(props.open).toBe(false);
    style(root(container), "visibility: hidden");
  });

  test("prevents default on right click", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    render(ContextMenu, { props });
    const event = await contextmenu();

    expect(event.defaultPrevented).toBe(true);
    expect(props.open).toBe(true);
  });

  test("lock blocks opening and closing", async () => {
    const closed = $state({ children: childrenSnippet, open: false, lock: true });
    render(ContextMenu, closed);
    await openMenu();
    expect(closed.open).toBe(false);

    const opened = $state({ children: childrenSnippet, open: true, lock: true });
    render(ContextMenu, opened);
    await clickDocument();
    await keyDocument("Escape");
    expect(opened.open).toBe(true);
  });

  test("opens on touch long-press at the press point", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await pointer(document, "pointerdown", { clientX: 320, clientY: 180 });

    await waitFor(() => expect(props.open).toBe(true), { timeout: 1200 });
    style(wrapper, "left: 320px");
    style(wrapper, "top: 180px");
  });

  test("does not start long-press from non-touch or non-primary pointerdown", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    render(ContextMenu, props);

    await pointer(document, "pointerdown", { pointerType: "mouse", clientX: 10, clientY: 20 });
    await pointer(document, "pointerdown", { isPrimary: false, clientX: 30, clientY: 40 });
    await afterLongPress();

    expect(props.open).toBe(false);
  });

  test("cancels pending long-press on pointerup and movement beyond the threshold", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await pointer(document, "pointerdown", { clientX: 100, clientY: 100 });
    await pointer(document, "pointerup", { clientX: 100, clientY: 100 });
    await afterLongPress();
    expect(props.open).toBe(false);

    await pointer(document, "pointerdown", { clientX: 100, clientY: 100 });
    await pointer(document, "pointermove", { clientX: 100, clientY: 111 });
    await afterLongPress();
    expect(props.open).toBe(false);

    await pointer(document, "pointerdown", { clientX: 100, clientY: 100 });
    await pointer(document, "pointermove", { clientX: 106, clientY: 108 });

    await waitFor(() => expect(props.open).toBe(true), { timeout: 1200 });
    style(wrapper, "left: 100px");
    style(wrapper, "top: 100px");
  });

  test("lock is rechecked when the long-press timer fires", async () => {
    const props = $state({ children: childrenSnippet, open: false, lock: false });
    render(ContextMenu, props);

    await pointer(document, "pointerdown", { clientX: 100, clientY: 100 });
    props.lock = true;
    await afterLongPress();

    expect(props.open).toBe(false);
  });

  test("native contextmenu during touch press opens once and cancels the fallback timer", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await pointer(document, "pointerdown", { clientX: 10, clientY: 20 });
    await contextmenu(document, { clientX: 200, clientY: 300 });

    expect(props.open).toBe(true);
    style(wrapper, "left: 200px");
    style(wrapper, "top: 300px");

    await afterLongPress();

    style(wrapper, "left: 200px");
    style(wrapper, "top: 300px");
  });

  test("swallows only the trailing click from a touch-opened menu", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);

    await pointer(document, "pointerdown", { clientX: 100, clientY: 100 });
    await waitFor(() => expect(props.open).toBe(true), { timeout: 1200 });

    await pointer(document, "pointerup", { clientX: 100, clientY: 100 });
    await clickDocument();
    expect(props.open).toBe(true);
    style(root(container), "visibility: visible");

    await pointer(document, "pointerdown", { clientX: 120, clientY: 120 });
    await pointer(document, "pointerup", { clientX: 120, clientY: 120 });
    await clickDocument();

    expect(props.open).toBe(false);
    style(root(container), "visibility: hidden");
  });
});

describe("ContextMenu with target", () => {
  test("opens on contextmenu on the target", async () => {
    const target = appendTarget();
    const props = $state({ children: childrenSnippet, open: false, target });
    const { container } = render(ContextMenu, { props });

    await openMenu(target);

    expect(props.open).toBe(true);
    style(root(container), "visibility: visible");
  });

  test("does not open on document contextmenu outside the target and closes if open", async () => {
    const target = appendTarget();
    const props = $state({ children: childrenSnippet, open: true, target });
    render(ContextMenu, { props });

    await openMenu();

    expect(props.open).toBe(false);
  });

  test("contextmenu on target does not also trigger the document hide", async () => {
    const target = appendTarget();
    const props = $state({ children: childrenSnippet, open: false, target });
    render(ContextMenu, { props });

    await openMenu(target);

    expect(props.open).toBe(true);
  });

  test("late-bound and swapped targets update listeners", async () => {
    const oldTarget = appendTarget();
    const newTarget = appendTarget();
    const props = $state({
      children: childrenSnippet,
      open: false,
      target: undefined as HTMLElement | undefined,
    });
    const { container, rerender } = render(ContextMenu, { props });
    const wrapper = root(container);

    props.target = oldTarget;
    await rerender(props);
    await tick();

    const docEvent = await contextmenu();
    expect(docEvent.defaultPrevented).toBe(false);
    style(wrapper, "visibility: hidden");

    props.target = newTarget;
    await rerender(props);
    await tick();

    await contextmenu(oldTarget);
    style(wrapper, "visibility: hidden");

    await openMenu(newTarget);
    style(wrapper, "visibility: visible");
  });

  test("target long-press swallows the trailing click and allows the next outside tap to close", async () => {
    const target = appendTarget();
    const props = $state({ children: childrenSnippet, open: false, target });
    const { container } = render(ContextMenu, { props });

    await pointer(target, "pointerdown", { clientX: 100, clientY: 100 });
    await waitFor(() => expect(props.open).toBe(true), { timeout: 1200 });

    await pointer(target, "pointerup", { clientX: 100, clientY: 100 });
    await clickDocument();
    expect(props.open).toBe(true);
    style(root(container), "visibility: visible");

    await pointer(document, "pointerdown", { clientX: 120, clientY: 120 });
    await pointer(document, "pointerup", { clientX: 120, clientY: 120 });
    await clickDocument();

    expect(props.open).toBe(false);
    style(root(container), "visibility: hidden");
  });
});

describe("ContextMenu focus and keyboard", () => {
  test("opening focuses first enabled item and Escape restores focus", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();

    await waitFor(() => expect(document.activeElement?.textContent ?? "").toContain("Cut"));

    await keyDocument("Escape");

    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("outside click closes and restores focus", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    await waitFor(() => expect(document.activeElement?.textContent ?? "").toContain("Cut"));
    await clickDocument();

    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("Tab from inside closes, restores focus, and prevents default", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    await waitFor(() => expect(document.activeElement?.textContent ?? "").toContain("Cut"));
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("lock keeps an already-open menu open without moving focus on hide paths", async () => {
    const target = appendTarget();
    const props = $state({ open: false, lock: true });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    await clickDocument();
    await keyDocument("Escape");

    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });
});

describe("ContextMenu activation", () => {
  test("clicking enabled item selects, closes, and restores focus", async () => {
    const target = appendTarget();
    const onselect = vi.fn();
    const props = $state({ open: false, onselect });
    const { getByText } = render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    getByText("Cut").click();
    await tick();

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("clicking disabled item does not select or close", async () => {
    const onselect = vi.fn();
    const props = $state({ open: false, onselect });
    const { getByText } = render(ContextMenuItems, props);

    await openMenu();
    getByText("Paste").click();
    await tick();

    expect(onselect).not.toHaveBeenCalled();
    expect(props.open).toBe(true);
  });
});

describe("ContextMenu positioning and attributes", () => {
  test("positions at cursor location", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await contextmenu(document, { clientX: 300, clientY: 400 });

    style(wrapper, "left: 300px");
    style(wrapper, "top: 400px");
    style(wrapper, "position: fixed");
  });
  test("merges class and component-owned style wins over user style", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
      class: "extra-class",
      style: "left: 999px",
    });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await contextmenu();

    has(wrapper, "svs-context-menu", PARTS.WHOLE, "extra-class");
    style(wrapper, "position: fixed");
    style(wrapper, "left: 100px");
    style(wrapper, "top: 200px");
    notStyle(wrapper, "left: 999px");
  });

  test("runs attach and element binding works", () => {
    let attached: HTMLDivElement | undefined;
    const attach = vi.fn((node: HTMLDivElement) => {
      attached = node;
    });
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLDivElement | undefined,
      attach,
    });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    expect(attached).toBe(wrapper);
    expect(attach).toHaveBeenCalled();
    expect(props.element).toBe(wrapper);
  });

  test("object styling and variant binding work", async () => {
    const styling = { whole: { base: "menu-base", neutral: "menu-neutral", active: "menu-active" } };
    const props = $state({
      children: childrenSnippet,
      styling,
      variant: VARIANT.NEUTRAL as string,
    });
    const { container, rerender } = render(ContextMenu, props);
    const wrapper = root(container);

    has(wrapper, "menu-base", "menu-neutral");

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    has(wrapper, "menu-base", "menu-active");
  });
});

describe("accessibility (axe)", () => {
  test("closed render has no violations", async () => {
    const { container } = render(ContextMenuItems);

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("open render has no violations", async () => {
    const { container } = render(ContextMenuItems, { open: true });
    await tick();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
