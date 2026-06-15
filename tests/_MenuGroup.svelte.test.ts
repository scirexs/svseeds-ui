import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import MenuGroup from "#svs/_MenuGroup.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuGroupCtxProvider from "./fixtures/MenuGroupCtxProvider.svelte";

const children = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Body ${variant()}</span>` }));
const root = (c: HTMLElement) => c.querySelector('[role="group"]') as HTMLDivElement;

describe("MenuGroup", () => {
  test("renders labeled group semantics", () => {
    const { container, getByText } = render(MenuGroup, { label: "Edit", children });
    const group = root(container);
    const id = group.getAttribute("aria-labelledby");
    const label = container.querySelector(`#${id}`) as HTMLDivElement;

    expect(group).toHaveAttribute("role", "group");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Edit");
    expect(label).not.toHaveAttribute("role");
    expect(label).not.toHaveAttribute("tabindex");
    expect(getByText("Body neutral")).toBeInTheDocument();
  });

  test("snippet label receives effective variant", () => {
    const label = createRawSnippet<[string]>((variant) => ({ render: () => `<span>Label ${variant()}</span>` }));
    const { getByText } = render(MenuGroup, { label, children, variant: VARIANT.ACTIVE });

    expect(getByText("Label active")).toBeInTheDocument();
    expect(getByText("Body active")).toBeInTheDocument();
  });

  test("applies default and custom classes", () => {
    const normal = render(MenuGroup, { label: "Edit", children });
    expect(root(normal.container)).toHaveClass("svs-menu-group", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuGroup, { label: "Edit", children, variant: VARIANT.ACTIVE });
    expect(root(active.container)).toHaveClass("svs-menu-group", PARTS.WHOLE, VARIANT.ACTIVE);
    active.unmount();

    const styled = render(MenuGroup, { label: "Edit", children, styling: "custom-group", class: "extra-group" });
    const group = root(styled.container);
    expect(group).toHaveClass("custom-group", PARTS.WHOLE, VARIANT.NEUTRAL, "extra-group");
    expect(group).not.toHaveClass("svs-menu-group");
  });

  test("descendant menuitems are discoverable and label is not a menuitem", () => {
    const { container } = render(MenuGroupCtxProvider);

    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(container.querySelector('[role="group"]')).toHaveTextContent("Edit");
    expect([...container.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent)).toEqual(["Item", "Item"]);
  });

  test("embedded context can drive variant and styling, and local styling wins", () => {
    const contextual = render(MenuGroupCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-group",
    });
    expect(root(contextual.container)).toHaveClass("ctx-group", PARTS.WHOLE, VARIANT.ACTIVE);
    contextual.unmount();

    const local = render(MenuGroupCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-group",
      groupStyling: "local-group",
    });
    const group = root(local.container);
    expect(group).toHaveClass("local-group", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(group).not.toHaveClass("ctx-group");
  });

  test("component-owned role cannot be overridden", () => {
    const { container } = render(MenuGroup, { label: "Edit", children, role: "menu" } as any);
    expect(root(container)).toHaveAttribute("role", "group");
  });
});
