import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Drawer from "#svs/Drawer.svelte";

afterEach(() => {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    (dialog as HTMLDialogElement).remove();
  });
  vi.useRealTimers();
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

const childrenSnippet = createRawSnippet(() => {
  return { render: () => "<p>Drawer content</p>" };
});

describe("Drawer jsdom-retained animation timing", () => {
  test("style changes during animation", async () => {
    vi.useFakeTimers();
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
  });

  test("re-toggling within the transition does not prematurely clear overflow hidden", async () => {
    vi.useFakeTimers();
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
  });
});
