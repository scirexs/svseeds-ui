import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import ContextMenu from "#svs/ContextMenu.svelte";
import { PARTS, VARIANT } from "#svs/core";
import ContextMenuItems from "./fixtures/ContextMenuItems.svelte";

const childrenContent = "Menu Item";
const childrenSnippet = createRawSnippet(() => ({ render: () => `<div>${childrenContent}</div>` }));

function root(container: HTMLElement) {
  return container.firstChild as HTMLDivElement;
}

function menu(container: HTMLElement) {
  return container.querySelector('[role="menu"]') as HTMLDivElement;
}

const targets: HTMLElement[] = [];
function appendTarget() {
  const target = document.createElement("button");
  document.body.appendChild(target);
  targets.push(target);
  return target;
}

async function openMenu(target: Document | HTMLElement = document) {
  await fireEvent.contextMenu(target, { clientX: 100, clientY: 200 });
  await tick();
}

afterEach(() => {
  targets.splice(0).forEach((target) => target.remove());
  vi.restoreAllMocks();
});

Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, "innerHeight", {
  writable: true,
  configurable: true,
  value: 768,
});

describe("ContextMenu rendering and visibility", () => {
  test("renders with children snippet and is initially hidden", () => {
    const { container, getByText } = render(ContextMenu, { children: childrenSnippet });
    const wrapper = root(container);

    expect(wrapper).toBeInTheDocument();
    expect(getByText(childrenContent)).toBeInTheDocument();
    expect(wrapper).toHaveStyle("visibility: hidden");
    expect(wrapper).toHaveStyle("z-index: -9999");
  });

  test("shows when open prop is true", () => {
    const { container } = render(ContextMenu, { children: childrenSnippet, open: true });
    const wrapper = root(container);

    expect(wrapper).toHaveStyle("visibility: visible");
    expect(wrapper).not.toHaveStyle("z-index: -9999");
  });

  test("applies default, custom variant, and styling classes", () => {
    const normal = render(ContextMenu, { children: childrenSnippet });
    expect(root(normal.container)).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(ContextMenu, { children: childrenSnippet, variant: VARIANT.ACTIVE });
    expect(root(active.container)).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.ACTIVE);
    active.unmount();

    const styled = render(ContextMenu, { children: childrenSnippet, styling: "custom-styling" });
    expect(root(styled.container)).toHaveClass("custom-styling", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(root(styled.container)).not.toHaveClass("svs-context-menu");
  });
});

describe("ContextMenu semantics", () => {
  test("menu semantics live on MenuList, not the wrapper", () => {
    const { container } = render(ContextMenuItems, { open: true });
    const wrapper = root(container);
    const list = menu(container);

    expect(list).toHaveAttribute("role", "menu");
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    expect(list).toHaveAttribute("tabindex", "-1");
    expect(wrapper).not.toHaveAttribute("role", "menu");
  });

  test("forwards rest attributes to wrapper without owning role", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      open: true,
      "aria-label": "Actions",
      role: "presentation",
    } as any);
    const wrapper = root(container);

    expect(wrapper).toHaveAttribute("aria-label", "Actions");
    expect(wrapper).toHaveAttribute("role", "presentation");
  });

  test("container forwards context variant and styling to MenuList", () => {
    const { container } = render(ContextMenuItems, { open: true, variant: VARIANT.ACTIVE, styling: "ctx" });
    expect(menu(container)).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});

describe("ContextMenu event handling", () => {
  test("shows on right click", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    expect(props.open).toBe(false);
    expect(wrapper).toHaveStyle("visibility: hidden");

    await openMenu();

    expect(props.open).toBe(true);
    expect(wrapper).toHaveStyle("visibility: visible");
  });

  test("hides on document click", async () => {
    const props = $state({ children: childrenSnippet, open: true });
    const { container } = render(ContextMenu, props);

    await fireEvent.click(document);

    expect(props.open).toBe(false);
    expect(root(container)).toHaveStyle("visibility: hidden");
  });

  test("prevents default on right click", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    render(ContextMenu, props);
    const event = new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: true, cancelable: true });

    await fireEvent(document, event);

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
    await fireEvent.click(document);
    await fireEvent.keyDown(document, { key: "Escape" });
    expect(opened.open).toBe(true);
  });
});

describe("ContextMenu with target", () => {
  test("opens on contextmenu on the target", async () => {
    const target = appendTarget();
    const props = $state({ children: childrenSnippet, open: false, target });
    const { container } = render(ContextMenu, { props });

    await openMenu(target);

    expect(props.open).toBe(true);
    expect(root(container)).toHaveStyle("visibility: visible");
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

    const docEvent = new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: true, cancelable: true });
    await fireEvent(document, docEvent);
    expect(docEvent.defaultPrevented).toBe(false);
    expect(wrapper).toHaveStyle("visibility: hidden");

    props.target = newTarget;
    await rerender(props);
    await tick();

    await fireEvent.contextMenu(oldTarget, { clientX: 100, clientY: 200 });
    expect(wrapper).toHaveStyle("visibility: hidden");

    await openMenu(newTarget);
    expect(wrapper).toHaveStyle("visibility: visible");
  });
});

describe("ContextMenu focus and keyboard", () => {
  test("opening focuses first enabled item and Escape restores focus", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();

    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(document, { key: "Escape" });

    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("outside click closes and restores focus", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));
    await fireEvent.click(document);

    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("Tab from inside closes, restores focus, and prevents default", async () => {
    const target = appendTarget();
    const props = $state({ open: false });
    render(ContextMenuItems, props);
    target.focus();

    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));
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
    await fireEvent.click(document);
    await fireEvent.keyDown(document, { key: "Escape" });

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
    await fireEvent.click(getByText("Cut"));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  test("clicking disabled item does not select or close", async () => {
    const onselect = vi.fn();
    const props = $state({ open: false, onselect });
    const { getByText } = render(ContextMenuItems, props);

    await openMenu();
    await fireEvent.click(getByText("Paste"));

    expect(onselect).not.toHaveBeenCalled();
    expect(props.open).toBe(true);
  });
});

describe("ContextMenu positioning and attributes", () => {
  test("positions at cursor location", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    await fireEvent.contextMenu(document, { clientX: 300, clientY: 400 });

    expect(wrapper).toHaveStyle("left: 300px");
    expect(wrapper).toHaveStyle("top: 400px");
    expect(wrapper).toHaveStyle("position: fixed");
  });

  test("adjusts position near edges without going negative", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    Object.defineProperty(wrapper, "offsetWidth", { configurable: true, value: 200 });
    Object.defineProperty(wrapper, "offsetHeight", { configurable: true, value: 100 });

    await fireEvent.contextMenu(document, { clientX: 950, clientY: 700 });
    expect(wrapper).toHaveStyle("left: 750px");
    expect(wrapper).toHaveStyle("top: 600px");

    Object.defineProperty(wrapper, "offsetWidth", { configurable: true, value: 800 });
    await fireEvent.contextMenu(document, { clientX: 300, clientY: 50 });
    expect(wrapper).toHaveStyle("left: 300px");
    expect(wrapper).toHaveStyle("top: 50px");
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

    await fireEvent.contextMenu(document, { clientX: 100, clientY: 200 });

    expect(wrapper).toHaveClass("svs-context-menu", PARTS.WHOLE, "extra-class");
    expect(wrapper).toHaveStyle("position: fixed");
    expect(wrapper).toHaveStyle("left: 100px");
    expect(wrapper).toHaveStyle("top: 200px");
    expect(wrapper).not.toHaveStyle("left: 999px");
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

    expect(wrapper).toHaveClass("menu-base", "menu-neutral");

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    expect(wrapper).toHaveClass("menu-base", "menu-active");
  });
});
