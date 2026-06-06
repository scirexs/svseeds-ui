import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Drawer from "#svs/_Drawer.svelte";
import { PARTS, VARIANT } from "#svs/core";

afterEach(() => {
  // Clean up any remaining popovers
  document.querySelectorAll("[popover]").forEach((popover) => {
    // (popover as HTMLElement & { hidePopover(): void }).hidePopover();
    (popover as HTMLElement).remove();
  });
  document.querySelectorAll("[data-drawer-test-bg]").forEach((el) => el.remove());
  (document.activeElement as HTMLElement)?.blur?.();
});

// Mock Popover API if not available
if (typeof HTMLElement.prototype.showPopover === "undefined") {
  HTMLElement.prototype.showPopover = vi.fn(function (this: HTMLElement) {
    this.setAttribute("open", "");
    this.dispatchEvent(new ToggleEvent("toggle", { oldState: "closed", newState: "open" }));
  });
  HTMLElement.prototype.hidePopover = vi.fn(function (this: HTMLElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new ToggleEvent("toggle", { oldState: "open", newState: "closed" }));
  });
}

// Mock ToggleEvent if not available
if (typeof ToggleEvent === "undefined") {
  globalThis.ToggleEvent = class ToggleEvent extends Event {
    oldState: string;
    newState: string;

    constructor(type: string, eventInitDict?: { oldState: string; newState: string }) {
      super(type);
      this.oldState = eventInitDict?.oldState || "";
      this.newState = eventInitDict?.newState || "";
    }
  } as any;
}

const childrenText = "Drawer content";
const preset = "svs-drawer";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<p>${childrenText}</p>` };
});

const focusableChildren = createRawSnippet(() => {
  return { render: () => `<div><button data-x="a">a</button><button data-x="b">b</button></div>` };
});

describe("Drawer basic functionality", () => {
  test("drawer is closed by default", () => {
    const { container } = render(Drawer, { children: childrenSnippet });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).not.toHaveAttribute("open");
  });

  test("drawer opens when open prop is true", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      open: true,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.showPopover).toHaveBeenCalled();
  });

  test("drawer renders children content", () => {
    const { getByText } = render(Drawer, {
      children: childrenSnippet,
      open: true,
    });
    const content = getByText(childrenText);
    expect(content).toBeInTheDocument();
  });

  test("drawer has correct popover attribute for closable=true", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      closable: true,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("popover", "auto");
  });

  test("drawer has correct popover attribute for closable=false", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      closable: false,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("popover", "manual");
  });

  test("drawer element binding works", () => {
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLDivElement | undefined,
    });
    render(Drawer, props);
    expect(props.element).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Drawer position and size", () => {
  test("default position is left", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--top: 0");
    expect(drawer.style.cssText).toContain("--left: 0");
    expect(drawer.style.cssText).toContain("--bottom: auto");
    expect(drawer.style.cssText).toContain("--right: auto");
  });

  test("position top sets correct CSS variables", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      position: "top",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--top: 0");
    expect(drawer.style.cssText).toContain("--left: 0");
    expect(drawer.style.cssText).toContain("--width-from: 100%");
    expect(drawer.style.cssText).toContain("--width-to: 100%");
  });

  test("position right sets correct CSS variables", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      position: "right",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--top: 0");
    expect(drawer.style.cssText).toContain("--right: 0");
    expect(drawer.style.cssText).toContain("--left: auto");
    expect(drawer.style.cssText).toContain("--bottom: auto");
  });

  test("position bottom sets correct CSS variables", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      position: "bottom",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--bottom: 0");
    expect(drawer.style.cssText).toContain("--top: auto");
    expect(drawer.style.cssText).toContain("--width-from: 100%");
    expect(drawer.style.cssText).toContain("--width-to: 100%");
  });

  test("custom size is applied", () => {
    const customSize = "300px";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      size: customSize,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain(`--width-to: ${customSize}`);
  });

  test("auto size includes interpolate-size for keywords", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      size: "auto",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.getAttribute("style")).toContain("interpolate-size: allow-keywords");
  });

  test("default duration is applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--duration: 200ms;");
  });

  test.each([-5, 3.14, NaN])("invalid duration %s falls back to default", (duration) => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--duration: 200ms;");
  });

  test("zero duration is applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration: 0,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--duration: 0ms;");
  });

  test("custom duration is applied", () => {
    const customDuration = 500;
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration: customDuration,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain(`--duration: ${customDuration}ms;`);
  });

  test("changing position updates the position custom props", async () => {
    const props = $state({
      children: childrenSnippet,
      position: "left" as "left" | "right",
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--left: 0");

    props.position = "right";
    await tick();

    expect(drawer.style.cssText).toContain("--right: 0");
    expect(drawer.style.cssText).toContain("--left: auto");
  });

  test("changing duration updates the duration custom prop", async () => {
    const props = $state({
      children: childrenSnippet,
      duration: 200,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer.style.cssText).toContain("--duration: 200ms;");

    props.duration = 350;
    await tick();

    expect(drawer.style.cssText).toContain("--duration: 350ms;");
  });
});

describe("Drawer open/close behavior", () => {
  test("programmatically opening and closing drawer", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    expect(drawer.hidePopover).not.toHaveBeenCalled();

    props.open = true;
    await tick();
    expect(drawer.showPopover).toHaveBeenCalled();

    props.open = false;
    await tick();
    expect(drawer.hidePopover).toHaveBeenCalled();
  });

  test("drawer handles toggle event correctly", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    // Simulate toggle event to open
    const openEvent = new ToggleEvent("toggle", { oldState: "closed", newState: "open" });
    fireEvent(drawer, openEvent);

    await waitFor(() => {
      expect(props.open).toBe(true);
    });

    // Simulate toggle event to close
    const closeEvent = new ToggleEvent("toggle", { oldState: "open", newState: "closed" });
    fireEvent(drawer, closeEvent);

    await waitFor(() => {
      expect(props.open).toBe(false);
    });
  });

  test("style changes during animation", async () => {
    vi.useFakeTimers();
    try {
      const duration = 200;
      const props = $state({
        children: childrenSnippet,
        open: false,
        duration,
      });
      const { container } = render(Drawer, props);
      const drawer = container.querySelector("[popover]") as HTMLDivElement;

      // Trigger toggle event
      const toggleEvent = new ToggleEvent("toggle", { oldState: "closed", newState: "open" });
      fireEvent(drawer, toggleEvent);

      // Check that overflow:hidden is added during animation
      expect(drawer.style.cssText).toContain("overflow: hidden;");

      // Fast-forward time and check that overflow:hidden is removed
      vi.advanceTimersByTime(duration);
      await waitFor(() => {
        expect(drawer.style.cssText).not.toContain("overflow: hidden;");
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("re-toggling within the transition does not prematurely clear overflow hidden", async () => {
    vi.useFakeTimers();
    try {
      const props = $state({
        children: childrenSnippet,
        open: false,
        duration: 200,
      });
      const { container } = render(Drawer, props);
      const drawer = container.querySelector("[popover]") as HTMLDivElement;

      props.open = true;
      await tick();
      expect(drawer.style.cssText).toContain("overflow: hidden;");

      vi.advanceTimersByTime(100);
      props.open = false;
      await tick();
      props.open = true;
      await tick();
      expect(drawer.style.cssText).toContain("overflow: hidden;");

      vi.advanceTimersByTime(100);
      await tick();
      expect(drawer.style.cssText).toContain("overflow: hidden;");

      vi.advanceTimersByTime(100);
      await tick();
      expect(drawer.style.cssText).not.toContain("overflow: hidden;");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Drawer modal semantics", () => {
  test('root has role="dialog" and aria-modal="true" by default', () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("role", "dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");
  });

  test("consumer can override role via attributes", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      role: "alertdialog",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("role", "alertdialog");
  });
});

describe("Drawer focus management", () => {
  test("focus moves into the drawer on open", async () => {
    const props = $state({
      children: focusableChildren,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    props.open = true;
    await tick();

    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(drawer.querySelector('[data-x="a"]'));
  });

  test("focus restores to the opener on close", async () => {
    const trigger = document.createElement("button");
    trigger.dataset.drawerTestBg = "true";
    document.body.appendChild(trigger);
    trigger.focus();
    const props = $state({
      children: focusableChildren,
      open: false,
    });
    render(Drawer, props);

    props.open = true;
    await tick();
    props.open = false;
    await tick();

    expect(document.activeElement).toBe(trigger);
  });

  test("drawer with no focusable child receives focus itself", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    props.open = true;
    await tick();

    expect(document.activeElement).toBe(drawer);
    expect(drawer.tabIndex).toBe(-1);
  });
});

describe("Drawer focus trap", () => {
  test("Tab from the last focusable wraps to the first", async () => {
    const { container } = render(Drawer, {
      children: focusableChildren,
      open: true,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    const first = drawer.querySelector('[data-x="a"]') as HTMLButtonElement;
    const last = drawer.querySelector('[data-x="b"]') as HTMLButtonElement;
    last.focus();

    await fireEvent.keyDown(drawer, { key: "Tab" });

    expect(document.activeElement).toBe(first);
  });

  test("Shift+Tab from the first focusable wraps to the last", async () => {
    const { container } = render(Drawer, {
      children: focusableChildren,
      open: true,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    const first = drawer.querySelector('[data-x="a"]') as HTMLButtonElement;
    const last = drawer.querySelector('[data-x="b"]') as HTMLButtonElement;
    first.focus();

    await fireEvent.keyDown(drawer, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  test("non-Tab keys are ignored and consumer onkeydown still runs", async () => {
    const onkeydown = vi.fn();
    const { container } = render(Drawer, {
      children: focusableChildren,
      open: true,
      onkeydown,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    const last = drawer.querySelector('[data-x="b"]') as HTMLButtonElement;
    last.focus();

    await fireEvent.keyDown(drawer, { key: "a" });

    expect(onkeydown).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });
});

describe("Drawer background inert", () => {
  test("background siblings become inert on open and are restored on close", async () => {
    const bg = document.createElement("div");
    bg.dataset.drawerTestBg = "true";
    bg.innerHTML = "<button>bg</button>";
    document.body.appendChild(bg);
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    render(Drawer, props);

    props.open = true;
    await tick();
    expect(bg.inert).toBe(true);

    props.open = false;
    await tick();
    expect(bg.inert).toBe(false);
  });

  test("the drawer's own container is not inerted", async () => {
    const bg = document.createElement("div");
    bg.dataset.drawerTestBg = "true";
    document.body.appendChild(bg);
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);

    props.open = true;
    await tick();

    expect(container.inert).toBeFalsy();
  });

  test("inert is cleared if the drawer unmounts while open", async () => {
    const bg = document.createElement("div");
    bg.dataset.drawerTestBg = "true";
    document.body.appendChild(bg);
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { unmount } = render(Drawer, props);

    props.open = true;
    await tick();
    expect(bg.inert).toBe(true);

    unmount();
    expect(bg.inert).toBe(false);
  });

  test("a pre-existing inert sibling is left inert after close", async () => {
    const bg = document.createElement("div");
    bg.dataset.drawerTestBg = "true";
    bg.inert = true;
    document.body.appendChild(bg);
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    render(Drawer, props);

    props.open = true;
    await tick();
    props.open = false;
    await tick();

    expect(bg.inert).toBe(true);
  });
});

describe("Drawer variant and styling", () => {
  test("default variant is neutral", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("custom variant is applied", () => {
    const customVariant = "custom-variant";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      variant: customVariant,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, customVariant);
  });

  test("variant binding works", async () => {
    const props = $state({
      children: childrenSnippet,
      variant: VARIANT.NEUTRAL as string,
    });
    const { container, rerender } = render(Drawer, props);

    let drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);
    drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("custom styling string is applied", () => {
    const customStyle = "custom-drawer";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      styling: customStyle,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(customStyle, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("custom styling object is applied", () => {
    const customStyle = {
      whole: { base: "drawer-base", neutral: "drawer-neutral" },
    };
    const { container } = render(Drawer, {
      children: childrenSnippet,
      styling: customStyle,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass("drawer-base", "drawer-neutral");
  });
});

describe("Drawer attributes", () => {
  test("custom id is applied", () => {
    const customId = "my-drawer";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      id: customId,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("id", customId);
  });

  test("id is forwarded to the root via rest attributes", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      id: "drawer-x",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("id", "drawer-x");
  });

  test("custom attributes are applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      "data-testid": "drawer-test",
      "aria-labelledby": "drawer-label",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("data-testid", "drawer-test");
    expect(drawer).toHaveAttribute("aria-labelledby", "drawer-label");
  });

  test("class is merged onto root", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      class: "custom-class",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass("custom-class");
  });

  test("internally-controlled attributes are not overridden", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      // @ts-expect-error style is component-owned and intentionally rejected by the type
      style: "color: red;",
      popover: "manual" as const,
      "data-test": "should-be-applied",
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    expect(drawer.style.cssText).not.toContain("color: red");
    expect(drawer).toHaveAttribute("popover", "auto"); // internal (closable) wins over consumer "manual"
    expect(drawer).toHaveAttribute("data-test", "should-be-applied");
  });

  test("margin and padding are not inline", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    const rawStyle = drawer.getAttribute("style");

    expect(rawStyle).not.toContain("margin");
    expect(rawStyle).not.toContain("padding");
    expect(rawStyle).toContain("--duration");
  });

  test("custom ontoggle handler is called", () => {
    const customToggleHandler = vi.fn();
    const { container } = render(Drawer, {
      children: childrenSnippet,
      ontoggle: customToggleHandler,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    const toggleEvent = new ToggleEvent("toggle", { oldState: "closed", newState: "open" });
    fireEvent(drawer, toggleEvent);

    expect(customToggleHandler).toHaveBeenCalledWith(toggleEvent);
  });
});

describe("Drawer edge cases", () => {
  test("empty variant defaults to neutral", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      variant: VARIANT.NEUTRAL,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("drawer with complex children content", () => {
    const complexChildren = createRawSnippet(() => {
      return {
        render: () => `
          <div>
            <h2>Drawer Title</h2>
            <p>Some content</p>
            <button>Close</button>
          </div>
        `,
      };
    });

    const { getByText } = render(Drawer, {
      children: complexChildren,
      open: true,
    });

    expect(getByText("Drawer Title")).toBeInTheDocument();
    expect(getByText("Some content")).toBeInTheDocument();
    expect(getByText("Close")).toBeInTheDocument();
  });

  test("children snippet receives variant parameter", () => {
    const childrenWithVariant = createRawSnippet((variant: () => string) => {
      return { render: () => `<p>Variant: ${variant()}</p>` };
    });

    const customVariant = "test-variant";
    const { getByText } = render(Drawer, {
      children: childrenWithVariant,
      variant: customVariant,
    });

    expect(getByText(`Variant: ${customVariant}`)).toBeInTheDocument();
  });
});
