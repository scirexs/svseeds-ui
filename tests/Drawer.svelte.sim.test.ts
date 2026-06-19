import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Drawer from "#svs/Drawer.svelte";
import { PARTS, VARIANT } from "#svs/core";

afterEach(() => {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    (dialog as HTMLDialogElement).remove();
  });
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

if (typeof HTMLDialogElement === "undefined") {
  globalThis.HTMLDialogElement = class HTMLDialogElement extends HTMLElement {
    open: boolean;
    returnValue: string;

    constructor() {
      super();
      this.open = false;
      this.returnValue = "";
    }

    close(returnValue?: string): void {
      this.open = false;
      this.removeAttribute("open");
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.dispatchEvent(new Event("close"));
    }

    show(): void {
      this.open = true;
      this.setAttribute("open", "");
    }

    showModal(): void {
      this.open = true;
      this.setAttribute("open", "");
    }
  } as unknown as typeof HTMLDialogElement;
} else {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
      this.setAttribute("open", "");
    });
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    });
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
      this.setAttribute("open", "");
    });
  }
}

const childrenText = "Drawer content";
const preset = "svs-drawer";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<p>${childrenText}</p>` };
});

const buttonChildren = createRawSnippet(() => {
  return { render: () => `<button type="button">inner</button>` };
});

describe("Drawer basic functionality", () => {
  test("drawer is closed by default", () => {
    const { container } = render(Drawer, { children: childrenSnippet });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).not.toHaveAttribute("open");
    expect(drawer.open).toBe(false);
  });

  test("drawer opens when open prop is true", async () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      open: true,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    await tick();
    expect(drawer.showModal).toHaveBeenCalled();
    expect(drawer).toHaveAttribute("open");
    expect(drawer.open).toBe(true);
  });

  test("drawer renders children content", () => {
    const { getByText } = render(Drawer, {
      children: childrenSnippet,
      open: true,
    });
    const content = getByText(childrenText);
    expect(content).toBeInTheDocument();
  });

  test("drawer element binding works", () => {
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLDialogElement | undefined,
    });
    render(Drawer, props);
    expect(props.element).toBeInstanceOf(HTMLDialogElement);
  });
});

describe("Drawer position and size", () => {
  test("default position is left", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain(`--width-to: ${customSize}`);
  });

  test("auto size includes interpolate-size for keywords", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      size: "auto",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.getAttribute("style")).toContain("interpolate-size: allow-keywords");
  });

  test("default duration is applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain("--svs-duration: 200ms;");
  });

  test.each([-5, 3.14, NaN])("invalid duration %s falls back to default", (duration) => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain("--svs-duration: 200ms;");
  });

  test("zero duration is applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration: 0,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain("--svs-duration: 0ms;");
  });

  test("custom duration is applied", () => {
    const customDuration = 500;
    const { container } = render(Drawer, {
      children: childrenSnippet,
      duration: customDuration,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain(`--svs-duration: ${customDuration}ms;`);
  });

  test("reduced motion emits zero duration fallback", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.getPropertyValue("--svs-duration")).toBe("0ms");
  });

  test("cssvar duration renames the fallback token", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      cssvar: { duration: "--x" },
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.getPropertyValue("--svs-duration")).toBe("var(--x, 200ms)");
  });

  test("changing position updates the position custom props", async () => {
    const props = $state({
      children: childrenSnippet,
      position: "left" as "left" | "right",
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.style.cssText).toContain("--svs-duration: 200ms;");

    props.duration = 350;
    await tick();

    expect(drawer.style.cssText).toContain("--svs-duration: 350ms;");
  });
});

describe("Drawer open/close behavior", () => {
  test("programmatically opening and closing drawer", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    expect(drawer.close).not.toHaveBeenCalled();

    props.open = true;
    await tick();
    expect(drawer.showModal).toHaveBeenCalled();

    props.open = false;
    await tick();
    expect(drawer.close).toHaveBeenCalled();
  });

  test("drawer syncs open from toggle event", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    drawer.open = true;
    await fireEvent(drawer, new Event("toggle"));
    await waitFor(() => {
      expect(props.open).toBe(true);
    });

    drawer.open = false;
    await fireEvent(drawer, new Event("toggle"));
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
      const drawer = container.querySelector("dialog") as HTMLDialogElement;

      drawer.open = true;
      await fireEvent(drawer, new Event("toggle"));

      expect(drawer.style.cssText).toContain("overflow: hidden;");

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
      const drawer = container.querySelector("dialog") as HTMLDialogElement;

      props.open = true;
      await tick();
      await fireEvent(drawer, new Event("toggle"));
      expect(drawer.style.cssText).toContain("overflow: hidden;");

      vi.advanceTimersByTime(100);
      props.open = false;
      await tick();
      await fireEvent(drawer, new Event("toggle"));
      props.open = true;
      await tick();
      await fireEvent(drawer, new Event("toggle"));
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

describe("Drawer light-dismiss / forced action", () => {
  test("backdrop click closes when closable=true", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: true,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    await fireEvent.click(drawer);

    expect(props.open).toBe(false);
  });

  test("backdrop click does not close when closable=false", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    await fireEvent.click(drawer);

    expect(props.open).toBe(true);
  });

  test("click on content does not close when closable=true", async () => {
    const props = $state({
      children: buttonChildren,
      open: true,
      closable: true,
    });
    const { container } = render(Drawer, props);
    const button = container.querySelector("button") as HTMLButtonElement;

    await fireEvent.click(button);

    expect(props.open).toBe(true);
  });

  test("Escape is prevented when closable=false", () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: false,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });

    drawer.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
  });

  test("Escape is not prevented when closable=true", () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: true,
    });
    const { container } = render(Drawer, props);
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });

    drawer.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("Drawer modal semantics", () => {
  test("root is a native dialog", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      open: true,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer.tagName).toBe("DIALOG");
  });

  test("consumer can override role via attributes", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      role: "alertdialog",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveAttribute("role", "alertdialog");
  });
});

describe("Drawer variant and styling", () => {
  test("default variant is neutral", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("custom variant is applied", () => {
    const customVariant = "custom-variant";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      variant: customVariant,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, customVariant);
  });

  test("variant binding works", async () => {
    const props = $state({
      children: childrenSnippet,
      variant: VARIANT.NEUTRAL as string,
    });
    const { container, rerender } = render(Drawer, props);

    let drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);
    drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("custom styling string is applied", () => {
    const customStyle = "custom-drawer";
    const { container } = render(Drawer, {
      children: childrenSnippet,
      styling: customStyle,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveAttribute("id", customId);
  });

  test("id is forwarded to the root via rest attributes", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      id: "drawer-x",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveAttribute("id", "drawer-x");
  });

  test("custom attributes are applied", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      "data-testid": "drawer-test",
      "aria-labelledby": "drawer-label",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveAttribute("data-testid", "drawer-test");
    expect(drawer).toHaveAttribute("aria-labelledby", "drawer-label");
  });

  test("class is merged onto root", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      class: "custom-class",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    expect(drawer).toHaveClass("custom-class");
  });

  test("internally-controlled style is not overridden", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      // @ts-expect-error style is component-owned and intentionally rejected by the type
      style: "color: red;",
      "data-test": "should-be-applied",
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    expect(drawer.style.cssText).not.toContain("color: red");
    expect(drawer.style.cssText).toContain("--svs-duration");
    expect(drawer).toHaveAttribute("data-test", "should-be-applied");
  });

  test("margin and padding are not inline", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
    const rawStyle = drawer.getAttribute("style");

    expect(rawStyle).not.toContain("margin");
    expect(rawStyle).not.toContain("padding");
    expect(rawStyle).toContain("--svs-duration");
  });

  test("custom ontoggle handler is called", async () => {
    const customToggleHandler = vi.fn();
    const { container } = render(Drawer, {
      children: childrenSnippet,
      ontoggle: customToggleHandler,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;

    const toggleEvent = new Event("toggle");
    await fireEvent(drawer, toggleEvent);

    expect(customToggleHandler).toHaveBeenCalledWith(toggleEvent);
  });
});

describe("Drawer edge cases", () => {
  test("empty variant defaults to neutral", () => {
    const { container } = render(Drawer, {
      children: childrenSnippet,
      variant: VARIANT.NEUTRAL,
    });
    const drawer = container.querySelector("dialog") as HTMLDialogElement;
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
