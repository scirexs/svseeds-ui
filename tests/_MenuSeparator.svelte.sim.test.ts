import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import MenuSeparator from "#svs/_MenuSeparator.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuSeparatorCtxProvider from "./fixtures/MenuSeparatorCtxProvider.svelte";

const root = (c: HTMLElement) => c.querySelector('[role="separator"]') as HTMLDivElement;

describe("MenuSeparator", () => {
  test("renders separator semantics without tabindex", () => {
    const { container } = render(MenuSeparator);
    const separator = root(container);

    expect(separator.tagName).toBe("DIV");
    expect(separator).toHaveAttribute("role", "separator");
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    expect(separator).not.toHaveAttribute("tabindex");
  });

  test("applies default and custom variant classes", () => {
    const normal = render(MenuSeparator);
    expect(root(normal.container)).toHaveClass("svs-menu-separator", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuSeparator, { variant: VARIANT.ACTIVE });
    expect(root(active.container)).toHaveClass("svs-menu-separator", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("styling overrides preset and class prop merges", () => {
    const { container } = render(MenuSeparator, {
      styling: "custom-separator",
      class: "extra-separator",
    });
    const separator = root(container);

    expect(separator).toHaveClass("custom-separator", PARTS.WHOLE, VARIANT.NEUTRAL, "extra-separator");
    expect(separator).not.toHaveClass("svs-menu-separator");
  });

  test("separator is not discoverable as a menuitem", () => {
    const { container } = render(MenuSeparator);
    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });

  test("component-owned semantics cannot be overridden by rest attributes", () => {
    const { container } = render(MenuSeparator, {
      role: "presentation",
      "aria-orientation": "vertical",
    } as any);
    const separator = root(container);

    expect(separator).toHaveAttribute("role", "separator");
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
  });

  test("explicit ariaOrientation overrides the default", () => {
    const { container } = render(MenuSeparator, { ariaOrientation: "vertical" });
    expect(root(container)).toHaveAttribute("aria-orientation", "vertical");
  });

  test("embedded context can drive variant and styling", () => {
    const { container } = render(MenuSeparatorCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-separator",
    });
    expect(root(container)).toHaveClass("ctx-separator", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("embedded context drives inferred aria orientation", () => {
    const horizontal = render(MenuSeparatorCtxProvider, { orientation: "horizontal" });
    expect(root(horizontal.container)).toHaveAttribute("aria-orientation", "vertical");
    horizontal.unmount();

    const vertical = render(MenuSeparatorCtxProvider, { orientation: "vertical" });
    expect(root(vertical.container)).toHaveAttribute("aria-orientation", "horizontal");
    vertical.unmount();

    const explicit = render(MenuSeparatorCtxProvider, { orientation: "horizontal", ariaOrientation: "horizontal" });
    expect(root(explicit.container)).toHaveAttribute("aria-orientation", "horizontal");
  });
});
