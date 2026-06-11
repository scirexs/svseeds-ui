import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import ContextMenu, { type MenuItemData } from "#svs/ContextMenu.svelte";
import { PARTS, VARIANT } from "#svs/core";
import ContextMenuItems from "./fixtures/ContextMenuItems.svelte";

const childrenContent = "Menu Item";
const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div>${childrenContent}</div>` };
});

function root(container: HTMLElement) {
  return container.firstChild as HTMLDivElement;
}

const enabledItems = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((el) => el.getAttribute("aria-disabled") !== "true");

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
  vi.useRealTimers();
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
  test("renders with children snippet", () => {
    const { container, getByText } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = root(container);
    const content = getByText(childrenContent);

    expect(nav).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(nav).toHaveStyle("visibility: hidden");
  });

  test("initially hidden by default", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = root(container);
    expect(nav).toHaveStyle("visibility: hidden");
    expect(nav).toHaveStyle("z-index: -9999");
  });

  test("shows when open prop is true", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      open: true,
    });

    const nav = root(container);
    expect(nav).toHaveStyle("visibility: visible");
    expect(nav).not.toHaveStyle("z-index: -9999");
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
  test("open menu root has menu semantics", () => {
    const { container } = render(ContextMenu, { children: childrenSnippet, open: true });
    const nav = root(container);

    expect(nav).toHaveAttribute("role", "menu");
    expect(nav).toHaveAttribute("aria-orientation", "vertical");
    expect(nav).toHaveAttribute("tabindex", "-1");
  });

  test("forwards aria-label but owns role and tabindex", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      open: true,
      "aria-label": "Actions",
      role: "listbox",
      tabindex: 0,
    });
    const nav = root(container);

    expect(nav).toHaveAttribute("aria-label", "Actions");
    expect(nav).toHaveAttribute("role", "menu");
    expect(nav).toHaveAttribute("tabindex", "-1");
  });
});

describe("ContextMenu event handling", () => {
  test("shows on right click", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    expect(props.open).toBe(false);
    expect(nav).toHaveStyle("visibility: hidden");

    await openMenu();

    expect(props.open).toBe(true);
    expect(nav).toHaveStyle("visibility: visible");
  });

  test("hides on document click", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    await fireEvent.click(document);

    expect(props.open).toBe(false);
    expect(nav).toHaveStyle("visibility: hidden");
  });

  test("prevents default on right click", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    render(ContextMenu, props);

    const event = new MouseEvent("contextmenu", {
      clientX: 100,
      clientY: 200,
      bubbles: true,
      cancelable: true,
    });

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
    const props = $state({
      children: childrenSnippet,
      open: false,
      target,
    });

    const { container } = render(ContextMenu, { props });
    const nav = root(container);

    await openMenu(target);

    expect(props.open).toBe(true);
    expect(nav).toHaveStyle("visibility: visible");
  });

  test("does not open on document contextmenu outside the target and closes if open", async () => {
    const target = appendTarget();
    const props = $state({
      children: childrenSnippet,
      open: true,
      target,
    });

    render(ContextMenu, { props });

    await openMenu();

    expect(props.open).toBe(false);
  });

  test("contextmenu on target does not also trigger the document hide", async () => {
    const target = appendTarget();
    const props = $state({
      children: childrenSnippet,
      open: false,
      target,
    });

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
    const nav = root(container);

    props.target = oldTarget;
    await rerender({ target: oldTarget });
    await tick();

    const docEvent = new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: true, cancelable: true });
    await fireEvent(document, docEvent);
    expect(docEvent.defaultPrevented).toBe(false);
    expect(nav).toHaveStyle("visibility: hidden");

    props.target = newTarget;
    await rerender({ target: newTarget });
    await tick();

    await fireEvent.contextMenu(oldTarget, { clientX: 100, clientY: 200 });
    expect(nav).toHaveStyle("visibility: hidden");

    await openMenu(newTarget);
    expect(nav).toHaveStyle("visibility: visible");
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

  test("lock keeps an already-open menu open without moving focus on hide paths", async () => {
    const target = appendTarget();
    const props = $state({ open: true, lock: true });
    render(ContextMenuItems, props);
    target.focus();

    await fireEvent.click(document);
    await fireEvent.keyDown(document, { key: "Escape" });

    expect(props.open).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  test("ArrowDown and ArrowUp wrap among enabled items", async () => {
    const props = $state({ open: false });
    const { container } = render(ContextMenuItems, props);
    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Copy");

    await fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Delete");

    await fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(document.activeElement).toHaveTextContent("Delete");
    expect(enabledItems(container).map((el) => el.textContent)).toEqual(["Cut", "Copy", "Delete"]);
  });

  test("Home and End jump while disabled item is skipped", async () => {
    render(ContextMenuItems, { open: false });
    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toHaveTextContent("Delete");

    await fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    await fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).not.toHaveTextContent("Paste");
  });

  test("Tab closes, restores focus, and prevents default", async () => {
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

  test("navigation keys prevent default", async () => {
    render(ContextMenuItems, { open: false });
    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      document.activeElement!.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  test("typeahead matches prefixes and resets after idle", async () => {
    vi.useFakeTimers();
    render(ContextMenuItems, { open: false });
    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(document.activeElement!, { key: "c" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(document.activeElement!, { key: "o" });
    expect(document.activeElement).toHaveTextContent("Copy");

    vi.advanceTimersByTime(500);

    await fireEvent.keyDown(document.activeElement!, { key: "d" });
    expect(document.activeElement).toHaveTextContent("Delete");
  });

  test("Space is not consumed by typeahead", async () => {
    render(ContextMenuItems, { open: false });
    await openMenu();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    const ev = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("ContextMenu activation and data mode", () => {
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

  test("items render menuitems and separators in order", () => {
    const onselect = vi.fn();
    const items: MenuItemData[] = [{ label: "A", onselect }, { separator: true }, { label: "B", disabled: true }];
    const { container } = render(ContextMenu, { items, open: true });
    const rows = [...root(container).children];

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(rows.map((el) => el.getAttribute("role"))).toEqual(["menuitem", "separator", "menuitem"]);
    expect(rows[2]).toHaveAttribute("aria-disabled", "true");
  });

  test("children win over items", () => {
    const items: MenuItemData[] = [{ label: "A" }];
    const { container, queryByText, getByText } = render(ContextMenu, { children: childrenSnippet, items, open: true });

    expect(getByText(childrenContent)).toBeInTheDocument();
    expect(queryByText("A")).not.toBeInTheDocument();
    expect(root(container).querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });

  test("data-mode item inherits context variant and styling", () => {
    const items: MenuItemData[] = [{ label: "A" }];
    const { getByRole } = render(ContextMenu, {
      items,
      open: true,
      variant: VARIANT.ACTIVE,
      styling: "ctx-menu",
    });

    expect(getByRole("menuitem")).toHaveClass("ctx-menu", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("data-mode supports snippet labels", () => {
    const label = createRawSnippet<[string]>((variant) => ({
      render: () => `<span>Snippet ${variant()}</span>`,
    }));
    const items: MenuItemData[] = [{ label }];
    const { getByText } = render(ContextMenu, { items, open: true, variant: VARIANT.ACTIVE });

    expect(getByText("Snippet active")).toBeInTheDocument();
  });

  test("data-mode activation selects, closes, restores focus, and disabled stays open", async () => {
    const target = appendTarget();
    const onselect = vi.fn();
    const disabledSelect = vi.fn();
    const items: MenuItemData[] = [
      { label: "A", onselect },
      { label: "B", onselect: disabledSelect, disabled: true },
    ];
    const props = $state({ items, open: false });
    const { getByText } = render(ContextMenu, props);

    target.focus();
    await openMenu();
    await fireEvent.click(getByText("A"));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(target);

    await openMenu();
    await fireEvent.click(getByText("B"));

    expect(disabledSelect).not.toHaveBeenCalled();
    expect(props.open).toBe(true);
  });
});

describe("ContextMenu positioning and attributes", () => {
  test("positions at cursor location", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    await fireEvent.contextMenu(document, { clientX: 300, clientY: 400 });

    expect(nav).toHaveStyle("left: 300px");
    expect(nav).toHaveStyle("top: 400px");
    expect(nav).toHaveStyle("position: fixed");
  });

  test("adjusts position near edges without going negative", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    Object.defineProperty(nav, "offsetWidth", { configurable: true, value: 200 });
    Object.defineProperty(nav, "offsetHeight", { configurable: true, value: 100 });

    await fireEvent.contextMenu(document, { clientX: 950, clientY: 700 });
    expect(nav).toHaveStyle("left: 750px");
    expect(nav).toHaveStyle("top: 600px");

    Object.defineProperty(nav, "offsetWidth", { configurable: true, value: 800 });
    await fireEvent.contextMenu(document, { clientX: 300, clientY: 50 });
    expect(nav).toHaveStyle("left: 300px");
    expect(nav).toHaveStyle("top: 50px");
  });

  test("merges class and component-owned style wins over user style", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
      class: "extra-class",
      style: "left: 999px",
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    await fireEvent.contextMenu(document, { clientX: 100, clientY: 200 });

    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, "extra-class");
    expect(nav).toHaveStyle("position: fixed");
    expect(nav).toHaveStyle("left: 100px");
    expect(nav).toHaveStyle("top: 200px");
    expect(nav).not.toHaveStyle("left: 999px");
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
    const nav = root(container);

    expect(attached).toBe(nav);
    expect(attach).toHaveBeenCalled();
    expect(props.element).toBe(nav);
  });

  test("object styling and variant binding work", async () => {
    const styling = { whole: { base: "menu-base", neutral: "menu-neutral", active: "menu-active" } };
    const props = $state({
      children: childrenSnippet,
      styling,
      variant: VARIANT.NEUTRAL as string,
    });
    const { container, rerender } = render(ContextMenu, props);
    const nav = root(container);

    expect(nav).toHaveClass("menu-base", "menu-neutral");

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    expect(nav).toHaveClass("menu-base", "menu-active");
  });
});
