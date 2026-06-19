import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import MenuSeparator from "#svs/MenuSeparator.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuSeparatorCtxProvider from "./fixtures/MenuSeparatorCtxProvider.svelte";

const root = (c: HTMLElement) => c.querySelector('[role="separator"]') as HTMLDivElement;

describe("MenuSeparator", () => {
  test("renders separator semantics without tabindex", async () => {
    const { container } = render(MenuSeparator);
    const separator = root(container);

    expect(separator.tagName).toBe("DIV");
    await expect.element(separator).toHaveAttribute("role", "separator");
    await expect.element(separator).toHaveAttribute("aria-orientation", "horizontal");
    expect(separator.hasAttribute("tabindex")).toBe(false);
  });

  test("applies default and custom variant classes", async () => {
    const normal = render(MenuSeparator);
    await expect.element(root(normal.container)).toHaveClass("svs-menu-separator", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuSeparator, { variant: VARIANT.ACTIVE });
    await expect.element(root(active.container)).toHaveClass("svs-menu-separator", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("styling overrides preset and class prop merges", async () => {
    const { container } = render(MenuSeparator, {
      styling: "custom-separator",
      class: "extra-separator",
    });
    const separator = root(container);

    await expect.element(separator).toHaveClass("custom-separator", PARTS.WHOLE, VARIANT.NEUTRAL, "extra-separator");
    expect(separator.classList.contains("svs-menu-separator")).toBe(false);
  });

  test("separator is not discoverable as a menuitem", () => {
    const { container } = render(MenuSeparator);
    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });

  test("component-owned semantics cannot be overridden by rest attributes", async () => {
    const { container } = render(MenuSeparator, {
      role: "presentation",
      "aria-orientation": "vertical",
    } as any);
    const separator = root(container);

    await expect.element(separator).toHaveAttribute("role", "separator");
    await expect.element(separator).toHaveAttribute("aria-orientation", "horizontal");
  });

  test("explicit ariaOrientation overrides the default", async () => {
    const { container } = render(MenuSeparator, { ariaOrientation: "vertical" });
    await expect.element(root(container)).toHaveAttribute("aria-orientation", "vertical");
  });

  test("embedded context can drive variant and styling", async () => {
    const { container } = render(MenuSeparatorCtxProvider, {
      variant: VARIANT.ACTIVE,
      styling: "ctx-separator",
    });
    await expect.element(root(container)).toHaveClass("ctx-separator", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("embedded context drives inferred aria orientation", async () => {
    const horizontal = render(MenuSeparatorCtxProvider, { orientation: "horizontal" });
    await expect.element(root(horizontal.container)).toHaveAttribute("aria-orientation", "vertical");
    horizontal.unmount();

    const vertical = render(MenuSeparatorCtxProvider, { orientation: "vertical" });
    await expect.element(root(vertical.container)).toHaveAttribute("aria-orientation", "horizontal");
    vertical.unmount();

    const explicit = render(MenuSeparatorCtxProvider, { orientation: "horizontal", ariaOrientation: "horizontal" });
    await expect.element(root(explicit.container)).toHaveAttribute("aria-orientation", "horizontal");
  });
});
