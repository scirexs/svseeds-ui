import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import MenuList, { type MenuItemData } from "#svs/_MenuList.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuListCtxProvider from "./fixtures/MenuListCtxProvider.svelte";
import MenuListGroupedItems from "./fixtures/MenuListGroupedItems.svelte";

const children = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Child ${variant()}</span>` }));
const root = (c: HTMLElement) => c.querySelector('[role="menu"]') as HTMLDivElement;
const items = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[role="menuitem"]')];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MenuList rendering and semantics", () => {
  test("renders menu semantics with vertical orientation by default", () => {
    const { container } = render(MenuList, { children });
    const menu = root(container);

    expect(menu).toHaveAttribute("role", "menu");
    expect(menu).toHaveAttribute("tabindex", "-1");
    expect(menu).toHaveAttribute("aria-orientation", "vertical");
  });

  test("supports horizontal orientation", () => {
    const { container } = render(MenuList, { children, orientation: "horizontal" });
    expect(root(container)).toHaveAttribute("aria-orientation", "horizontal");
  });

  test("component-owned role, tabindex, and aria-orientation cannot be overridden", () => {
    const { container } = render(MenuList, { children, role: "listbox", tabindex: 0, "aria-orientation": "horizontal" } as any);
    const menu = root(container);

    expect(menu).toHaveAttribute("role", "menu");
    expect(menu).toHaveAttribute("tabindex", "-1");
    expect(menu).toHaveAttribute("aria-orientation", "vertical");
  });

  test("forwards rest attributes", () => {
    const { container } = render(MenuList, { children, "aria-label": "Actions", "data-id": "x" });
    const menu = root(container);

    expect(menu).toHaveAttribute("aria-label", "Actions");
    expect(menu).toHaveAttribute("data-id", "x");
  });
});

describe("MenuList variant and styling", () => {
  test("applies default and custom classes", () => {
    const normal = render(MenuList, { children });
    expect(root(normal.container)).toHaveClass("svs-menu-list", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuList, { children, variant: VARIANT.ACTIVE, styling: "custom-list" });
    const menu = root(active.container);
    expect(menu).toHaveClass("custom-list", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(menu).not.toHaveClass("svs-menu-list");
  });

  test("inherits variant and styling from container context", () => {
    const { container } = render(MenuListCtxProvider, { variant: VARIANT.ACTIVE, styling: "ctx" });

    expect(root(container)).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(items(container)[0]).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("with a container, local styling wins but container variant still wins", () => {
    const { container } = render(MenuListCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx",
      listVariant: VARIANT.INACTIVE,
      listStyling: "local",
    });
    const menu = root(container);

    expect(menu).toHaveClass("local", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(menu).not.toHaveClass("ctx", VARIANT.INACTIVE);
  });
});

describe("MenuList data mode", () => {
  test("renders menuitems and separators in order", () => {
    const data: MenuItemData[] = [{ label: "A" }, { separator: true }, { label: "B", disabled: true }];
    const { container } = render(MenuList, { items: data });
    const rows = [...root(container).children];

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(rows.map((el) => el.getAttribute("role"))).toEqual(["menuitem", "separator", "menuitem"]);
    expect(rows[2]).toHaveAttribute("aria-disabled", "true");
  });

  test("children win over items", () => {
    const data: MenuItemData[] = [{ label: "A" }];
    const { container, getByText, queryByText } = render(MenuList, { children, items: data });

    expect(getByText("Child neutral")).toBeInTheDocument();
    expect(queryByText("A")).not.toBeInTheDocument();
    expect(root(container).querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });

  test("string and snippet labels render with effective variant", () => {
    const label = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Snippet ${variant()}</span>` }));
    const data: MenuItemData[] = [{ label: "A" }, { label }];
    const { getByText } = render(MenuListCtxProvider, { useItems: true, items: data, variant: VARIANT.ACTIVE });

    expect(getByText("A")).toBeInTheDocument();
    expect(getByText("Snippet active")).toBeInTheDocument();
  });

  test("item activation calls onselect and closes through container context", async () => {
    const onselect = vi.fn();
    const data: MenuItemData[] = [{ label: "A", onselect }];
    const props = $state({ useItems: true, items: data, closed: 0 });
    const { getByText } = render(MenuListCtxProvider, props);

    await fireEvent.click(getByText("A"));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.closed).toBe(1);
  });
});

describe("MenuList navigation", () => {
  test("focuses first enabled item when container opens", async () => {
    const props = $state({ open: false });
    const { rerender } = render(MenuListCtxProvider, props);

    props.open = true;
    await rerender(props);

    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));
  });

  test("ArrowDown and ArrowUp wrap among enabled items", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Copy");

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Delete");

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(root(container), { key: "ArrowUp" });
    expect(document.activeElement).toHaveTextContent("Delete");
  });

  test("Home and End jump to edges", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "End" });
    expect(document.activeElement).toHaveTextContent("Delete");

    await fireEvent.keyDown(root(container), { key: "Home" });
    expect(document.activeElement).toHaveTextContent("Cut");
  });

  test("horizontal orientation uses ArrowRight and ArrowLeft", async () => {
    const { container } = render(MenuListCtxProvider, { open: true, orientation: "horizontal" });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "ArrowRight" });
    expect(document.activeElement).toHaveTextContent("Copy");

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Copy");

    await fireEvent.keyDown(root(container), { key: "ArrowLeft" });
    expect(document.activeElement).toHaveTextContent("Cut");
  });

  test("navigation keys prevent default", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      root(container).dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  test("horizontal navigation keys prevent default", async () => {
    const { container } = render(MenuListCtxProvider, { open: true, orientation: "horizontal" });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
      const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      root(container).dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  test("discovers menuitems nested inside a MenuGroup for navigation", async () => {
    const { container } = render(MenuListGroupedItems, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Copy");

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Delete");

    await fireEvent.keyDown(root(container), { key: "ArrowDown" });
    expect(document.activeElement).toHaveTextContent("Cut");
    expect([...container.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent)).toEqual(["Cut", "Copy", "Paste", "Delete"]);
  });

  test("Tab prevents default and closes through container context", async () => {
    const props = $state({ open: true, closed: 0 });
    const { container } = render(MenuListCtxProvider, props);
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });

    root(container).dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(props.closed).toBe(1);
  });

  test("typeahead matches prefixes and resets after idle", async () => {
    vi.useFakeTimers();
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "c" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(root(container), { key: "o" });
    expect(document.activeElement).toHaveTextContent("Copy");

    vi.advanceTimersByTime(500);

    await fireEvent.keyDown(root(container), { key: "d" });
    expect(document.activeElement).toHaveTextContent("Delete");
  });

  test("Space is not consumed by typeahead", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));
    const ev = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });

    root(container).dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("MenuList attach and element", () => {
  test("attach runs and element binding is populated", () => {
    let attached: HTMLDivElement | undefined;
    const attach = vi.fn((node: HTMLDivElement) => {
      attached = node;
    });
    const props = $state({ children, element: undefined as HTMLDivElement | undefined, attach });
    const { container } = render(MenuList, props);

    expect(attached).toBe(root(container));
    expect(attach).toHaveBeenCalled();
    expect(props.element).toBe(root(container));
  });
});
