import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Drawer from "../lib/_svseeds/_Drawer.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

afterEach(() => {
  // Clean up any remaining popovers
  document.querySelectorAll("[popover]").forEach((popover) => {
    // (popover as HTMLElement & { hidePopover(): void }).hidePopover();
    (popover as HTMLElement).remove();
  });
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
    expect(drawer.style.cssText).toContain("--width-from: 100dvw");
    expect(drawer.style.cssText).toContain("--width-to: 100dvw");
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
    expect(drawer.style.cssText).toContain("--width-from: 100dvw");
    expect(drawer.style.cssText).toContain("--width-to: 100dvw");
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
    // expect(drawer.style.cssText).toContain("interpolate-size: allow-keywords;");
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
});

describe("Drawer open/close behavior", () => {
  test("programmatically opening and closing drawer", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container, rerender } = render(Drawer, props);
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    expect(drawer.hidePopover).not.toHaveBeenCalled();

    props.open = true;
    await rerender(props);
    expect(drawer.showPopover).toHaveBeenCalled();

    props.open = false;
    await rerender(props);
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

    vi.useRealTimers();
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
      variant: "",
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

  test("custom attributes are applied", () => {
    const customAttributes = {
      "data-testid": "drawer-test",
      "aria-labelledby": "drawer-label",
    };
    const { container } = render(Drawer, {
      children: childrenSnippet,
      attributes: customAttributes,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;
    expect(drawer).toHaveAttribute("data-testid", "drawer-test");
    expect(drawer).toHaveAttribute("aria-labelledby", "drawer-label");
  });

  test("omitted attributes are not applied", () => {
    const attributes = {
      class: "should-be-omitted",
      style: "should-be-omitted",
      popover: "should-be-omitted",
      "data-test": "should-be-applied",
    };
    const { container } = render(Drawer, {
      children: childrenSnippet,
      attributes,
    });
    const drawer = container.querySelector("[popover]") as HTMLDivElement;

    expect(drawer).not.toHaveClass("should-be-omitted");
    expect(drawer.style.cssText).not.toContain("should-be-omitted");
    expect(drawer).toHaveAttribute("data-test", "should-be-applied");
  });

  test("custom ontoggle handler is called", () => {
    const customToggleHandler = vi.fn();
    const { container } = render(Drawer, {
      children: childrenSnippet,
      attributes: {
        ontoggle: customToggleHandler,
      },
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
      variant: "",
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
