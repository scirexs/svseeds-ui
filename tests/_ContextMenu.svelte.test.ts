import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import ContextMenu from "#svs/_ContextMenu.svelte";
import { PARTS, VARIANT } from "#svs/core";

const childrenContent = "Menu Item";
const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div>${childrenContent}</div>` };
});

function root(container: HTMLElement) {
  return container.firstChild as HTMLDivElement;
}

const targets: HTMLElement[] = [];
function appendTarget() {
  const target = document.createElement("div");
  document.body.appendChild(target);
  targets.push(target);
  return target;
}

afterEach(() => {
  targets.splice(0).forEach((target) => target.remove());
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

  test("applies default classes", () => {
    const preset = "svs-context-menu";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = root(container);
    expect(nav).toHaveClass(preset, PARTS.WHOLE);
  });

  test("applies custom variant class", () => {
    const preset = "svs-context-menu";
    const customStatus = "custom-variant";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      variant: customStatus,
    });

    const nav = root(container);
    expect(nav).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("applies string styling", () => {
    const customStyle = "custom-styling";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      styling: customStyle,
    });

    const nav = root(container);
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
    const nav = root(container);

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

    const { container } = render(ContextMenu, props);
    const nav = root(container);

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

    await fireEvent.contextMenu(target, {
      clientX: 100,
      clientY: 200,
    });

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

    await fireEvent.contextMenu(document, {
      clientX: 100,
      clientY: 200,
    });

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

    await fireEvent.contextMenu(target, {
      clientX: 100,
      clientY: 200,
    });

    expect(props.open).toBe(true);
  });

  test("late-bound target does not leave a stale document show listener", async () => {
    const target = appendTarget();
    const props = $state({
      children: childrenSnippet,
      open: false,
      target: undefined as HTMLElement | undefined,
    });

    const { container, rerender } = render(ContextMenu, { props });
    const nav = root(container);

    props.target = target;
    await rerender({ target });
    await tick();

    const event = new MouseEvent("contextmenu", {
      clientX: 100,
      clientY: 200,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    await fireEvent(document, event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(nav).toHaveStyle("visibility: hidden");
  });

  test("swapping target removes listeners from the old target", async () => {
    const oldTarget = appendTarget();
    const newTarget = appendTarget();
    const props = $state({
      children: childrenSnippet,
      open: false,
      target: oldTarget,
    });

    const { container, rerender } = render(ContextMenu, { props });
    const nav = root(container);

    props.target = newTarget;
    await rerender({ target: newTarget });
    await tick();

    await fireEvent.contextMenu(oldTarget, {
      clientX: 100,
      clientY: 200,
    });

    expect(nav).toHaveStyle("visibility: hidden");

    await fireEvent.contextMenu(newTarget, {
      clientX: 100,
      clientY: 200,
    });

    expect(nav).toHaveStyle("visibility: visible");
  });
});

describe("ContextMenu keyboard", () => {
  test("Escape closes the menu", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    await fireEvent.keyDown(document, { key: "Escape" });

    expect(props.open).toBe(false);
    expect(nav).toHaveStyle("visibility: hidden");
  });

  test("Escape does not close when locked", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      lock: true,
    });

    render(ContextMenu, props);

    await fireEvent.keyDown(document, { key: "Escape" });

    expect(props.open).toBe(true);
  });

  test("non-Escape key does nothing", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });

    render(ContextMenu, props);

    await fireEvent.keyDown(document, { key: "Enter" });

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
    const nav = root(container);

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
    const nav = root(container);

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

  test("keeps x at cursor when menu is wider than the left margin", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    // Mock element dimensions
    Object.defineProperty(nav, "offsetWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(nav, "offsetHeight", {
      configurable: true,
      value: 100,
    });

    const clientX = 300;
    const clientY = 400;

    await fireEvent.contextMenu(document, {
      clientX,
      clientY,
    });

    // Should stay at cursor location instead of becoming negative.
    expect(nav).toHaveStyle(`left: ${clientX}px`);
    expect(nav).toHaveStyle(`top: ${clientY}px`);
  });

  test("adjusts position when near bottom edge", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

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
    const nav = root(container);

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

describe("ContextMenu attributes and attach", () => {
  test("forwards arbitrary HTMLAttributes to the root via rest", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      "data-testid": "ctx",
      "aria-label": "Actions",
    });

    const nav = root(container);
    expect(nav).toHaveAttribute("data-testid", "ctx");
    expect(nav).toHaveAttribute("aria-label", "Actions");
  });

  test("merges class with the preset part and variant classes", () => {
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      class: "extra-class",
    });

    const nav = root(container);
    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, "extra-class");
  });

  test("component-owned style wins over a user-passed style", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
      style: "left: 999px",
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    await fireEvent.contextMenu(document, {
      clientX: 100,
      clientY: 200,
    });

    expect(nav).toHaveStyle("position: fixed");
    expect(nav).toHaveStyle("left: 100px");
    expect(nav).toHaveStyle("top: 200px");
    expect(nav).not.toHaveStyle("left: 999px");
  });

  test("runs the attach attachment on the root element", () => {
    let attached: HTMLDivElement | undefined;
    const attach = vi.fn((node: HTMLDivElement) => {
      attached = node;
    });

    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      attach,
    });

    const nav = root(container);
    expect(attached).toBe(nav);
    expect(attach).toHaveBeenCalled();
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

    const nav = root(container);
    expect(nav).toHaveClass("menu-base", "menu-active");
  });

  test("element binding works correctly", () => {
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLDivElement | undefined,
    });

    const { container } = render(ContextMenu, props);
    const nav = root(container);

    expect(props.element).toBe(nav);
  });
});

describe("ContextMenu variant management", () => {
  test("defaults to neutral variant", () => {
    const preset = "svs-context-menu";
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
    });

    const nav = root(container);
    expect(nav).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("uses provided variant", () => {
    const preset = "svs-context-menu";
    const customStatus = VARIANT.ACTIVE;
    const { container } = render(ContextMenu, {
      children: childrenSnippet,
      variant: customStatus,
    });

    const nav = root(container);
    expect(nav).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("variant binding works correctly", async () => {
    const props = $state({
      children: childrenSnippet,
      variant: VARIANT.NEUTRAL as string,
    });

    const { container, rerender } = render(ContextMenu, props);

    const nav = root(container);
    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    expect(nav).toHaveClass("svs-context-menu", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});
