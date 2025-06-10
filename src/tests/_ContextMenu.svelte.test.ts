import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import ContextMenu from "../lib/_svseeds/_ContextMenu.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";
import { userEvent } from "@testing-library/user-event";

const childrenContent = "Menu Item";
const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div>${childrenContent}</div>` };
});

// Mock window dimensions for position calculations
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

    const nav = container.firstChild;
    const content = getByText(childrenContent);

    expect(nav).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(nav).toHaveStyle("visibility: hidden");
  });

  test("initially hidden by default", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = container.firstChild;
    expect(nav).toHaveStyle("visibility: hidden");
    expect(nav).toHaveStyle("z-index: -9999");
  });

  test("shows when open prop is true", () => {
    const { getByRole } = render(ContextMenu, {
      children: childrenSnippet,
      open: true,
    });

    const nav = getByRole("navigation");
    expect(nav).toHaveStyle("visibility: visible");
    expect(nav).not.toHaveStyle("z-index: -9999");
  });

  test("applies default classes", () => {
    const preset = "svs-context-menu";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass(preset, PARTS.WHOLE);
  });

  test("applies custom variant class", () => {
    const preset = "svs-context-menu";
    const customStatus = "custom-variant";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      variant: customStatus,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("applies string styling", () => {
    const customStyle = "custom-styling";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      styling: customStyle,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass(customStyle, PARTS.WHOLE);
  });
});

describe("ContextMenu event handling", () => {
  test("shows on right click", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    expect(props.open).toBe(false);
    expect(nav).toHaveStyle("visibility: hidden");

    // Simulate right click on document
    await fireEvent.contextMenu(document, {
      clientX: 100,
      clientY: 200,
    });

    expect(props.open).toBe(true);
    expect(nav).toHaveStyle("visibility: visible");
  });

  test("hides on document click", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });

    const { getByRole } = render(ContextMenu, props);
    const nav = getByRole("navigation");

    expect(props.open).toBe(true);
    expect(nav).toHaveStyle("visibility: visible");

    // Simulate click on document
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
    });

    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    await fireEvent(document, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(props.open).toBe(true);
  });

  test("does not show when locked", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
      lock: true,
    });

    render(ContextMenu, props);

    await fireEvent.contextMenu(document, {
      clientX: 100,
      clientY: 200,
    });

    expect(props.open).toBe(false);
  });

  test("does not hide when locked", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      lock: true,
    });

    render(ContextMenu, props);

    await fireEvent.click(document);

    expect(props.open).toBe(true);
  });
});

describe("ContextMenu positioning", () => {
  test("positions at cursor location", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    const clientX = 300;
    const clientY = 400;

    await fireEvent.contextMenu(document, {
      clientX,
      clientY,
    });

    expect(nav).toHaveStyle(`left: ${clientX}px`);
    expect(nav).toHaveStyle(`top: ${clientY}px`);
    expect(nav).toHaveStyle("position: fixed");
  });

  test("adjusts position when near right edge", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    // Mock element dimensions
    Object.defineProperty(nav, "offsetWidth", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(nav, "offsetHeight", {
      configurable: true,
      value: 100,
    });

    const clientX = 950; // Near right edge (window.innerWidth = 1024)
    const clientY = 400;

    await fireEvent.contextMenu(document, {
      clientX,
      clientY,
    });

    // Should position to the left of cursor to avoid overflow
    expect(nav).toHaveStyle(`left: ${clientX - 200}px`);
    expect(nav).toHaveStyle(`top: ${clientY}px`);
  });

  test("adjusts position when near bottom edge", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    // Mock element dimensions
    Object.defineProperty(nav, "offsetWidth", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(nav, "offsetHeight", {
      configurable: true,
      value: 100,
    });

    const clientX = 300;
    const clientY = 700; // Near bottom edge (window.innerHeight = 768)

    await fireEvent.contextMenu(document, {
      clientX,
      clientY,
    });

    // Should position above cursor to avoid overflow
    expect(nav).toHaveStyle(`left: ${clientX}px`);
    expect(nav).toHaveStyle(`top: ${clientY - 100}px`);
  });

  test("handles edge case when cursor is too close to top", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    // Mock element dimensions
    Object.defineProperty(nav, "offsetWidth", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(nav, "offsetHeight", {
      configurable: true,
      value: 150,
    });

    const clientX = 300;
    const clientY = 50; // Too close to top

    await fireEvent.contextMenu(document, {
      clientX,
      clientY,
    });

    // Should position at cursor location when there's not enough space above
    expect(nav).toHaveStyle(`left: ${clientX}px`);
    expect(nav).toHaveStyle(`top: ${clientY}px`);
  });
});

describe("ContextMenu with different styles", () => {
  test("applies object-based styling rules", () => {
    const customStyle = {
      whole: {
        base: "menu-base",
        neutral: "menu-neutral",
        active: "menu-active",
      },
    };

    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      styling: customStyle,
      variant: VARIANT.ACTIVE,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass("menu-base", "menu-active");
  });

  test("element binding works correctly", () => {
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLElement | undefined,
    });

    const { container } = render(ContextMenu, props);
    const nav = container.firstChild;

    expect(props.element).toBe(nav);
  });
});

describe("ContextMenu variant management", () => {
  test("defaults to neutral variant", () => {
    const preset = "svs-context-menu";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("uses provided variant", () => {
    const preset = "svs-context-menu";
    const customStatus = VARIANT.ACTIVE;
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      variant: customStatus,
    });

    const nav = container.firstChild;
    expect(nav).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("variant binding works correctly", async () => {
    const props = $state({
      children: childrenSnippet,
      variant: "",
    });

    const { container, rerender } = render(ContextMenu, props);

    const nav = container.firstChild;
    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});
