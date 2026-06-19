import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet } from "svelte";
import MenuGroup from "#svs/MenuGroup.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuGroupCtxProvider from "./fixtures/MenuGroupCtxProvider.svelte";

const children = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Body ${variant()}</span>` }));
const root = (c: HTMLElement) => c.querySelector('[role="group"]') as HTMLDivElement;
const byText = (c: HTMLElement, text: string) => [...c.querySelectorAll("*")].find((e) => e.textContent?.trim() === text);

describe("MenuGroup", () => {
  test("renders labeled group semantics", async () => {
    const { container } = render(MenuGroup, { label: "Edit", children });
    const group = root(container);
    const id = group.getAttribute("aria-labelledby");
    const label = container.querySelector(`#${id}`) as HTMLDivElement;

    await expect.element(group).toHaveAttribute("role", "group");
    expect(container.contains(label)).toBe(true);
    await expect.element(label).toHaveTextContent("Edit");
    expect(label.hasAttribute("role")).toBe(false);
    expect(label.hasAttribute("tabindex")).toBe(false);
    expect(byText(container, "Body neutral")).toBeTruthy();
  });

  test("snippet label receives effective variant", () => {
    const label = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Label ${variant()}</span>` }));
    const { container } = render(MenuGroup, { label, children, variant: VARIANT.ACTIVE });

    expect(byText(container, "Label active")).toBeTruthy();
    expect(byText(container, "Body active")).toBeTruthy();
  });

  test("applies default and custom classes", async () => {
    const normal = render(MenuGroup, { label: "Edit", children });
    await expect.element(root(normal.container)).toHaveClass("svs-menu-group", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuGroup, { label: "Edit", children, variant: VARIANT.ACTIVE });
    await expect.element(root(active.container)).toHaveClass("svs-menu-group", PARTS.WHOLE, VARIANT.ACTIVE);
    active.unmount();

    const styled = render(MenuGroup, { label: "Edit", children, styling: "custom-group", class: "extra-group" });
    const group = root(styled.container);
    await expect.element(group).toHaveClass("custom-group", PARTS.WHOLE, VARIANT.NEUTRAL, "extra-group");
    expect(group.classList.contains("svs-menu-group")).toBe(false);
  });

  test("descendant menuitems are discoverable and label is not a menuitem", async () => {
    const { container } = render(MenuGroupCtxProvider);

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    await expect.element(container.querySelector('[role="group"]') as HTMLElement).toHaveTextContent("Edit");
    expect([...container.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent)).toEqual(["Item", "Item"]);
  });

  test("embedded context can drive variant and styling, and local styling wins", async () => {
    const contextual = render(MenuGroupCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-group",
    });
    await expect.element(root(contextual.container)).toHaveClass("ctx-group", PARTS.WHOLE, VARIANT.ACTIVE);
    contextual.unmount();

    const local = render(MenuGroupCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-group",
      groupStyling: "local-group",
    });
    const group = root(local.container);
    await expect.element(group).toHaveClass("local-group", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(group.classList.contains("ctx-group")).toBe(false);
  });

  test("component-owned role cannot be overridden", async () => {
    const { container } = render(MenuGroup, { label: "Edit", children, role: "menu" } as any);
    await expect.element(root(container)).toHaveAttribute("role", "group");
  });
});
