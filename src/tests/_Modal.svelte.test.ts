import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Modal from "../lib/_svseeds/_Modal.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

afterEach(() => {
  // Clean up any remaining dialogs
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    (dialog as HTMLDialogElement).close();
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
  };
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
    const dialog = getByRole("dialog") as HTMLDialogElement;
    const content = getByText(childrenText);
    expect(dialog).toContainElement(content);
  });

  test("modal has correct aria-label", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      ariaLabel,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
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
    const { getByRole, rerender } = render(Modal, props);

    let dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);

    props.open = true;
    await rerender(props);
    dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    props.open = false;
    await rerender(props);
    dialog = getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
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

  test("escape key is not handled when closable=false", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      closable: false,
    });

    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog.onkeydown).toBeNull();
  });

  test("modal closes on close event", () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
    });
    const { getByRole } = render(Modal, props);

    const dialog = getByRole("dialog") as HTMLDialogElement;

    // Simulate close event
    fireEvent(dialog, new Event("close"));
    expect(props.open).toBe(false);
  });
});

describe("Modal trigger focus behavior", () => {
  test("trigger element receives focus when modal closes", async () => {
    const button = document.createElement("button");
    button.textContent = "Open Modal";
    document.body.appendChild(button);

    const props = $state({
      children: childrenSnippet,
      open: true,
      trigger: button,
    });

    render(Modal, props);

    // Focus should be set when open changes
    props.open = false;

    // Use setTimeout to allow for the effect to run
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });

  test("no error when trigger is undefined", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      trigger: undefined,
    });

    expect(() => {
      render(Modal, props);
      props.open = false;
    }).not.toThrow();
  });
});

describe("Modal status and styling", () => {
  test("default status is neutral", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, STATE.NEUTRAL);
  });

  test("custom status is applied", () => {
    const customStatus = "custom-status";
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      status: customStatus,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, customStatus);
  });

  test("status binding works", async () => {
    const props = $state({
      children: childrenSnippet,
      open: true,
      status: "",
    });
    const { getByRole, rerender } = render(Modal, props);

    let dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, STATE.NEUTRAL);

    props.status = STATE.ACTIVE;
    await rerender(props);
    dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, STATE.ACTIVE);
  });

  test("custom style string is applied", () => {
    const customStyle = "custom-modal";
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      style: customStyle,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    const mainDiv = dialog.firstElementChild;

    expect(dialog).toHaveClass(customStyle, PARTS.WHOLE, STATE.NEUTRAL);
    expect(mainDiv).toHaveClass(customStyle, PARTS.MAIN, STATE.NEUTRAL);
  });

  test("custom style object is applied", () => {
    const customStyle = {
      whole: { base: "modal-base", neutral: "modal-neutral" },
      main: { base: "content-base", neutral: "content-neutral" },
    };
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      style: customStyle,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    const mainDiv = dialog.firstElementChild;

    expect(dialog).toHaveClass("modal-base", "modal-neutral");
    expect(mainDiv).toHaveClass("content-base", "content-neutral");
  });
});

describe("Modal structure and classes", () => {
  test("modal has correct structure", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    const mainDiv = dialog.firstElementChild as HTMLDivElement;

    expect(dialog.children).toHaveLength(1);
    expect(mainDiv.tagName).toBe("DIV");
    expect(mainDiv).toHaveClass(preset, PARTS.MAIN, STATE.NEUTRAL);
  });

  // test("modal has autofocus attribute", () => {
  //   const { getByRole } = render(Modal, {
  //     children: childrenSnippet,
  //     open: true,
  //   });
  //   const dialog = getByRole("dialog") as HTMLDialogElement;
  //   expect(dialog).toHaveAttribute("autofocus");
  // });
});

describe("Modal edge cases", () => {
  test("empty status defaults to neutral", () => {
    const { getByRole } = render(Modal, {
      children: childrenSnippet,
      open: true,
      status: "",
    });
    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(dialog).toHaveClass(preset, PARTS.WHOLE, STATE.NEUTRAL);
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

    const dialog = getByRole("dialog") as HTMLDialogElement;
    expect(getByText("Modal Title")).toBeInTheDocument();
    expect(getByText("Some content")).toBeInTheDocument();
    expect(getByText("Action")).toBeInTheDocument();
  });
});
