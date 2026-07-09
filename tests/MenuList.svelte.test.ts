import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import MenuList, { type MenuItemData } from "#svs/MenuList.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuListCtxProvider from "./fixtures/MenuListCtxProvider.svelte";
import MenuListGroupedItems from "./fixtures/MenuListGroupedItems.svelte";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const children = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Child ${variant()}</span>` }));
const root = (c: HTMLElement) => c.querySelector('[role="menu"]') as HTMLDivElement;
const items = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[role="menuitem"]')];
const byText = (c: HTMLElement, text: string) => [...c.querySelectorAll("*")].find((e) => e.textContent?.trim() === text) as HTMLElement | undefined;
const itemByText = (c: HTMLElement, text: string) => items(c).find((el) => el.textContent?.trim() === text)!;
const key = async (el: HTMLElement, init: KeyboardEventInit) => {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  await tick();
  return ev;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MenuList rendering and semantics", () => {
  test("renders menu semantics with vertical orientation by default", async () => {
    const { container } = render(MenuList, { children });
    const menu = root(container);

    await expect.element(menu).toHaveAttribute("role", "menu");
    await expect.element(menu).toHaveAttribute("tabindex", "-1");
    await expect.element(menu).toHaveAttribute("aria-orientation", "vertical");
  });

  test("supports horizontal orientation", async () => {
    const { container } = render(MenuList, { children, orientation: "horizontal" });
    await expect.element(root(container)).toHaveAttribute("aria-orientation", "horizontal");
  });

  test("component-owned role, tabindex, and aria-orientation cannot be overridden", async () => {
    const { container } = render(MenuList, { children, role: "listbox", tabindex: 0, "aria-orientation": "horizontal" } as any);
    const menu = root(container);

    await expect.element(menu).toHaveAttribute("role", "menu");
    await expect.element(menu).toHaveAttribute("tabindex", "-1");
    await expect.element(menu).toHaveAttribute("aria-orientation", "vertical");
  });

  test("forwards rest attributes", async () => {
    const { container } = render(MenuList, { children, "aria-label": "Actions", "data-id": "x" });
    const menu = root(container);

    await expect.element(menu).toHaveAttribute("aria-label", "Actions");
    await expect.element(menu).toHaveAttribute("data-id", "x");
  });
});

describe("MenuList variant and styling", () => {
  test("applies default and custom classes", async () => {
    const normal = render(MenuList, { children });
    await expect.element(root(normal.container)).toHaveClass("svs-menu-list", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuList, { children, variant: VARIANT.ACTIVE, styling: "custom-list" });
    const menu = root(active.container);
    await expect.element(menu).toHaveClass("custom-list", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(menu.classList.contains("svs-menu-list")).toBe(false);
  });

  test("inherits variant and styling from container context", async () => {
    const { container } = render(MenuListCtxProvider, { variant: VARIANT.ACTIVE, styling: "ctx" });

    await expect.element(root(container)).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(items(container)[0]).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("with a container, local styling wins but container variant still wins", async () => {
    const { container } = render(MenuListCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx",
      listVariant: VARIANT.INACTIVE,
      listStyling: "local",
    });
    const menu = root(container);

    await expect.element(menu).toHaveClass("local", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(menu.classList.contains("ctx")).toBe(false);
    expect(menu.classList.contains(VARIANT.INACTIVE)).toBe(false);
  });
});

describe("MenuList data mode", () => {
  test("renders menuitems and separators in order", async () => {
    const data: MenuItemData[] = [{ label: "A" }, { separator: true }, { label: "B", disabled: true }];
    const { container } = render(MenuList, { items: data });
    const rows = [...root(container).children];

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(rows.map((el) => el.getAttribute("role"))).toEqual(["menuitem", "separator", "menuitem"]);
    await expect.element(rows[2] as HTMLElement).toHaveAttribute("aria-disabled", "true");
  });

  test("children win over items", () => {
    const data: MenuItemData[] = [{ label: "A" }];
    const { container } = render(MenuList, { children, items: data });

    expect(byText(container, "Child neutral")).toBeTruthy();
    expect(byText(container, "A")).toBeUndefined();
    expect(root(container).querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });

  test("string and snippet labels render with effective variant", () => {
    const label = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Snippet ${variant()}</span>` }));
    const data: MenuItemData[] = [{ label: "A" }, { label }];
    const { container } = render(MenuListCtxProvider, { useItems: true, items: data, variant: VARIANT.ACTIVE });

    expect(byText(container, "A")).toBeTruthy();
    expect(byText(container, "Snippet active")).toBeTruthy();
  });

  test("item activation calls onselect and closes through container context", async () => {
    const onselect = vi.fn();
    const data: MenuItemData[] = [{ label: "A", onselect }];
    const props = $state({ useItems: true, items: data, closed: 0 });
    const { container } = render(MenuListCtxProvider, props);

    await userEvent.click(itemByText(container, "A"));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.closed).toBe(1);
  });
});

describe("MenuList navigation", () => {
  test("focuses first enabled item when container opens", async () => {
    const props = $state({ open: false });
    const { container, rerender } = render(MenuListCtxProvider, props);

    props.open = true;
    await rerender(props);

    await expect.element(itemByText(container, "Cut")).toHaveFocus();
  });

  test("ArrowDown and ArrowUp wrap among enabled items", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Copy");

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Delete");

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Cut");

    await key(root(container), { key: "ArrowUp" });
    expect(document.activeElement?.textContent).toContain("Delete");
  });

  test("Home and End jump to edges", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    await key(root(container), { key: "End" });
    expect(document.activeElement?.textContent).toContain("Delete");

    await key(root(container), { key: "Home" });
    expect(document.activeElement?.textContent).toContain("Cut");
  });

  test("horizontal orientation uses ArrowRight and ArrowLeft", async () => {
    const { container } = render(MenuListCtxProvider, { open: true, orientation: "horizontal" });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    await key(root(container), { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toContain("Copy");

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Copy");

    await key(root(container), { key: "ArrowLeft" });
    expect(document.activeElement?.textContent).toContain("Cut");
  });

  test("navigation keys prevent default", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    for (const name of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      const ev = await key(root(container), { key: name });
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  test("horizontal navigation keys prevent default", async () => {
    const { container } = render(MenuListCtxProvider, { open: true, orientation: "horizontal" });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    for (const name of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
      const ev = await key(root(container), { key: name });
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  test("discovers menuitems nested inside a MenuGroup for navigation", async () => {
    const { container } = render(MenuListGroupedItems, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Copy");

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Delete");

    await key(root(container), { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Cut");
    expect([...container.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent)).toEqual(["Cut", "Copy", "Paste", "Delete"]);
  });

  test("Tab prevents default and closes through container context", async () => {
    const props = $state({ open: true, closed: 0 });
    const { container } = render(MenuListCtxProvider, props);
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    const ev = await key(root(container), { key: "Tab" });

    expect(ev.defaultPrevented).toBe(true);
    expect(props.closed).toBe(1);
  });

  test("typeahead matches prefixes without waiting for reset", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    await key(root(container), { key: "c" });
    expect(document.activeElement?.textContent).toContain("Cut");

    await key(root(container), { key: "o" });
    expect(document.activeElement?.textContent).toContain("Copy");
  });

  test("Space is not consumed by typeahead", async () => {
    const { container } = render(MenuListCtxProvider, { open: true });
    await expect.element(itemByText(container, "Cut")).toHaveFocus();

    const ev = await key(root(container), { key: " " });

    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("MenuList attach and element", () => {
  test("attach runs and element binding is populated", async () => {
    let attached: HTMLDivElement | undefined;
    const attach = vi.fn((node: HTMLDivElement) => {
      attached = node;
    });
    const props = $state({ children, element: undefined as HTMLDivElement | undefined, attach });
    const { container } = render(MenuList, props);

    await tick();
    expect(attached).toBe(root(container));
    expect(attach).toHaveBeenCalled();
    expect(props.element).toBe(root(container));
  });
});

describe("accessibility (axe)", () => {
  test("vertical composed menu has no violations", async () => {
    const { container } = render(MenuListCtxProvider);

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("horizontal composed menu has no violations", async () => {
    const { container } = render(MenuListCtxProvider, { orientation: "horizontal" });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
