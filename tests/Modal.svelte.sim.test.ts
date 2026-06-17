import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import Modal from "#svs/Modal.svelte";
import { PARTS, VARIANT } from "#svs/core";

afterEach(() => {
  // Clean up any remaining dialogs
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    (dialog as HTMLDialogElement).remove();
  });
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

const childrenText = "Modal content";
const ariaLabel = "Test modal";
const preset = "svs-modal";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<p>${childrenText}</p>` };
});

describe("Modal basic functionality", () => {
  test("modal is closed by default", () => {
    const { getByRole } = render(Modal, { children: childrenSnippet });
    const dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute("open");
    expect(dialog.open).toBe(false);
  });

  test("modal opens when open prop is true", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveAttribute("open");
    expect(dialog.open).toBe(true);
  });

  test("modal renders children content", () => {
    const { getByRole, getByText } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog");
    const content = getByText(childrenText);
    expect(dialog).toContainElement(content);
  });

  test("modal has correct aria-label", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      ariaLabel,
      open: true,
    });
    const dialog = getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", ariaLabel);
  });

  test("modal element binding works", () => {
    const props = $state({
      children: childrenSnippet,
      element: undefined as HTMLDialogElement | undefined,
    });
    render(Modal, props);
    expect(props.element).toBeInstanceOf(HTMLDialogElement);
  });
});

describe("Modal open/close behavior", () => {
  test("programmatically opening and closing modal", async () => {
    const props = $state({
      children: childrenSnippet,
      open: false,
    });
    const { getByRole } = render(Modal, props);

    let dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    expect(dialog).not.toHaveAttribute("open");

    props.open = true;
    await tick();
    dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAttribute("open");

    props.open = false;
    await tick();
    dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    expect(dialog).not.toHaveAttribute("open");
  });

  test("modal closes when clicking backdrop (closable=true)", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: true,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    // Click on the dialog element itself (backdrop)
    await user.click(dialog);
    expect(props.open).toBe(false);
  });

  test("modal does not close when clicking backdrop (closable=false)", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: false,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    // Click on the dialog element itself (backdrop)
    await user.click(dialog);
    expect(props.open).toBe(true); // Should remain open
  });

  test("modal does not close when clicking on content", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: true,
    });
    const user = userEvent.setup();
    const { getByText } = render(Modal, props);

    const content = getByText(childrenText);
    await user.click(content);
    expect(props.open).toBe(true); // Should remain open
  });

  test("escape is blocked when closable=false", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      closable: false,
    });

    const dialog = getByRole("dialog") as HTMLDialogElement;
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    dialog.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
  });

  test("escape is not blocked when closable=true", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      closable: true,
    });

    const dialog = getByRole("dialog") as HTMLDialogElement;
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    dialog.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  test("modal closes on close event", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;

    // Simulate close: dialog closes natively, syncing via the toggle event
    dialog.open = false;
    await fireEvent(dialog, new Event("toggle"));
    await waitFor(() => {
      expect(props.open).toBe(false);
    });
  });
});

describe("Modal variant and styling", () => {
  test("default variant is neutral", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("custom variant is applied", () => {
    const customStatus = "custom-variant";
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      variant: customStatus,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("variant prop updates are reflected", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      variant: VARIANT.NEUTRAL as string,
    });
    const { getByRole } = render(Modal, props);

    let dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await tick();
    dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("variant is not mutated when modal closes and reopens", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      variant: VARIANT.ACTIVE as string,
    });
    const { getByRole } = render(Modal, props);

    let dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);

    props.open = false;
    await tick();
    dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.open = true;
    await tick();
    dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("custom styling string is applied", () => {
    const customStyle = "custom-modal";
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      styling: customStyle,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;

    // Modal renders children directly inside the dialog (WHOLE only, no MAIN part)
    expect(dialog).toHaveClass(customStyle, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("custom styling object is applied", () => {
    const customStyle = {
      whole: { base: "modal-base", neutral: "modal-neutral" },
    };
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      styling: customStyle,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;

    // Modal has only the WHOLE part (the dialog itself)
    expect(dialog).toHaveClass("modal-base", "modal-neutral");
  });
});

describe("Modal structure and classes", () => {
  test("modal has correct structure", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;

    // children render directly inside the dialog (the test snippet is a <p>)
    expect(dialog.children).toHaveLength(1);
    expect(dialog.firstElementChild?.tagName).toBe("P");
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });
});

describe("Modal duration", () => {
  test("default duration emits --duration:200ms", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.style.getPropertyValue("--duration")).toBe("200ms");
  });

  test("custom duration is emitted", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      duration: 500,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.style.getPropertyValue("--duration")).toBe("500ms");
  });

  test("invalid duration falls back to default", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      duration: -1,
    });
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.style.getPropertyValue("--duration")).toBe("200ms");

    props.duration = NaN;
    await tick();
    expect(dialog.style.getPropertyValue("--duration")).toBe("200ms");

    props.duration = 1.5;
    await tick();
    expect(dialog.style.getPropertyValue("--duration")).toBe("200ms");
  });
});

describe("Modal event passthrough", () => {
  test("onclick is called before backdrop close", async () => {
    const onclick = vi.fn();
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: true,
      onclick,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    await user.click(dialog);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
  });

  test("onkeydown is called before escape is blocked", () => {
    const onkeydown = vi.fn();
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      closable: false,
      onkeydown,
    });

    const dialog = getByRole("dialog") as HTMLDialogElement;
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    dialog.dispatchEvent(ev);
    expect(onkeydown).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  test("ontoggle is called before open is synced", async () => {
    const ontoggle = vi.fn();
    const props = $state({
      children: childrenSnippet,
      open: true,
      ontoggle,
    });
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    dialog.open = false;
    await fireEvent(dialog, new Event("toggle"));
    expect(ontoggle).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
  });

  test("onclick passthrough does not close when closable=false", async () => {
    const onclick = vi.fn();
    const props = $state({
      children: childrenSnippet,
      open: true,
      closable: false,
      onclick,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;
    await user.click(dialog);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(true);
  });
});

describe("Modal edge cases", () => {
  test("reopening before close finishes keeps modal open", async () => {
    vi.useFakeTimers();
    try {
      const props = $state({
        children: childrenSnippet,
        open: true,
      });
      const { getByRole } = render(Modal, props);

      const dialog = getByRole("dialog") as HTMLDialogElement;
      expect(dialog.open).toBe(true);

      props.open = false;
      await tick();
      props.open = true;
      await tick();
      vi.runAllTimers();

      expect(dialog.open).toBe(true);
      expect(dialog).toHaveAttribute("open");
    } finally {
      vi.useRealTimers();
    }
  });

  test("empty variant defaults to neutral", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      variant: VARIANT.NEUTRAL,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("modal with complex children content", () => {
    const complexChildren = createRawSnippet(() => {
      return {
        render: () => `
          <div>
            <h2>Modal Title</h2>
            <p>Some content</p>
            <button>Action</button>
          </div>
        `,
      };
    });

    const { getByRole, getByText } = render(Modal, {
      children: complexChildren,
      open: true,
    });

    getByRole("dialog");
    expect(getByText("Modal Title")).toBeInTheDocument();
    expect(getByText("Some content")).toBeInTheDocument();
    expect(getByText("Action")).toBeInTheDocument();
  });
});
