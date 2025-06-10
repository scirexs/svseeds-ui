import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import HotkeyCapture from "../lib/_svseeds/_HotkeyCapture.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";
// import { PointerEvent } from "jsdom";

const placeholder = "Press a key combination...";

describe("Basic rendering and props", () => {
  test("no props", () => {
    const { getByRole } = render(HotkeyCapture);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("");
  });

  test("with placeholder", () => {
    const props = { placeholder };
    const { getByPlaceholderText } = render(HotkeyCapture, props);
    const input = getByPlaceholderText(placeholder) as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  test("with default value", () => {
    const value = "Ctrl Space";
    const props = { value };
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveValue(value);
  });

  test("disabled state", () => {
    const props = { disabled: true };
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});

describe("Active state and focus management", () => {
  test("becomes active on focus", async () => {
    const props = $state({ active: false });
    const user = userEvent.setup();
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(props.active).toBe(false);
    await user.click(input);
    expect(props.active).toBe(true);
  });

  test("becomes inactive on blur", async () => {
    const props = $state({ active: true });
    const user = userEvent.setup();
    const { getByRole } = render(HotkeyCapture, props);

    expect(props.active).toBe(true);
    await user.tab(); // blur the input
    waitFor(() => {
      expect(props.active).toBe(false);
    });
  });

  test("programmatic active change focuses/blurs element", async () => {
    const props = $state({ active: false });
    const { getByRole, rerender } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(document.activeElement).not.toBe(input);

    props.active = true;
    await rerender(props);
    expect(document.activeElement).toBe(input);

    props.active = false;
    await rerender(props);
    expect(document.activeElement).not.toBe(input);
  });

  test("disabled prevents focus", async () => {
    const props = $state({ disabled: true, active: false });
    const user = userEvent.setup();
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.click(input);
    expect(props.active).toBe(false);
  });
});

describe("Keyboard event handling", () => {
  test("captures simple key", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A" });
    expect(props.value).toBe("A");
  });

  test("captures space key as SPACE", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: " " });
    expect(props.value).toBe("SPACE");
  });

  test("captures key with single modifier", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A", ctrlKey: true });
    expect(props.value).toBe("Ctrl A");
  });

  test("captures key with multiple modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A", ctrlKey: true, shiftKey: true, altKey: true });
    expect(props.value).toBe("Ctrl Alt Shift A");
  });

  test("captures key with meta modifier", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A", metaKey: true });
    expect(props.value).toBe("Meta A");
  });

  test("ignores modifier keys alone", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "Control" });
    expect(props.value).toBe("");

    await fireEvent.keyDown(input, { key: "Alt" });
    expect(props.value).toBe("");

    await fireEvent.keyDown(input, { key: "Shift" });
    expect(props.value).toBe("");

    await fireEvent.keyDown(input, { key: "Meta" });
    expect(props.value).toBe("");
  });

  test("ignores repeated keydown events", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A", repeat: true });
    expect(props.value).toBe("");
  });

  test("ignores events when not focused", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    // Don't focus the input
    await fireEvent.keyDown(input, { key: "A" });
    expect(props.value).toBe("");
  });

  test("ignores events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A" });
    expect(props.value).toBe("");
  });
});

describe("Pointer event handling", () => {
  test("captures main button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 0 });
    waitFor(() => {
      expect(props.value).toBe("BTN_MAIN");
    });
  });

  test("captures wheel button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 1 });
    waitFor(() => {
      expect(props.value).toBe("BTN_WHEEL");
    });
  });

  test("captures sub button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 2 });
    waitFor(() => {
      expect(props.value).toBe("BTN_SUB");
    });
  });

  test("captures back button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 3 });
    waitFor(() => {
      expect(props.value).toBe("BTN_BACK");
    });
  });

  test("captures forward button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 4 });
    waitFor(() => {
      expect(props.value).toBe("BTN_FORWARD");
    });
  });

  test("captures pointer with modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 0, ctrlKey: true, shiftKey: true });
    waitFor(() => {
      expect(props.value).toBe("Ctrl Shift BTN_MAIN");
    });
  });

  test("ignores pointer events when not focused", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await fireEvent.pointerDown(input, { button: 0 });
    expect(props.value).toBe("");
  });

  test("ignores pointer events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 0 });
    expect(props.value).toBe("");
  });
});

describe("Wheel event handling", () => {
  test("captures wheel up", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.wheel(input, { deltaY: -1 });
    expect(props.value).toBe("WHEELUP");
  });

  test("captures wheel down", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.wheel(input, { deltaY: 1 });
    expect(props.value).toBe("WHEELDOWN");
  });

  test("captures wheel with modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.wheel(input, { deltaY: -1, ctrlKey: true });
    expect(props.value).toBe("Ctrl WHEELUP");
  });

  test("ignores wheel events when not focused", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await fireEvent.wheel(input, { deltaY: -1 });
    expect(props.value).toBe("");
  });

  test("ignores wheel events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.wheel(input, { deltaY: -1 });
    expect(props.value).toBe("");
  });
});

describe("Status management", () => {
  const preset = "svs-hotkey-capture";

  test("default variant is neutral", () => {
    const { getByRole } = render(HotkeyCapture);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("variant changes to active when focused", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.click(input);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(input).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("variant changes to inactive when disabled", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL, disabled: false });
    const { getByRole, rerender } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    props.disabled = true;
    await rerender(props);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(input).toHaveClass(preset, PARTS.MAIN, VARIANT.INACTIVE);
  });

  test("custom neutral variant is preserved", async () => {
    const customNeutral = "custom-neutral";
    const props = $state({ variant: customNeutral, active: false });
    const { getByRole, rerender } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveClass(preset, PARTS.MAIN, customNeutral);

    props.active = true;
    await rerender(props);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.active = false;
    await rerender(props);
    expect(props.variant).toBe(customNeutral);
  });
});

describe("CSS class and styling", () => {
  const preset = "svs-hotkey-capture";

  test("default preset classes", () => {
    const { getByRole } = render(HotkeyCapture);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("string styling overrides preset", () => {
    const customStyle = "custom-styling";
    const { getByRole } = render(HotkeyCapture, { styling: customStyle });
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveClass(customStyle, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(input).not.toHaveClass(preset);
  });

  test("object styling with base and variant classes", async () => {
    const styling = {
      main: {
        base: "base-class",
        neutral: "neutral-class",
        active: "active-class",
        inactive: "inactive-class",
      },
    };
    const props = $state({ styling, variant: VARIANT.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveClass("base-class", "neutral-class");

    await user.click(input);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(input).toHaveClass("base-class", "active-class");
  });
});

describe("Event prevention", () => {
  test("prevents default and stops propagation on keydown", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    const event = new KeyboardEvent("keydown", { key: "A", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  // test("prevents default and stops propagation on pointer events", async () => {
  //   const props = $state({ value: "", active: true });
  //   const { getByRole } = render(HotkeyCapture, props);
  //   const input = getByRole("textbox") as HTMLInputElement;

  //   input.focus();
  //   const event = new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true });
  //   const preventDefaultSpy = vi.spyOn(event, "preventDefault");
  //   const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

  //   await fireEvent(input, event);
  //   expect(preventDefaultSpy).toHaveBeenCalled();
  //   expect(stopPropagationSpy).toHaveBeenCalled();
  // });

  test("prevents context menu", async () => {
    const { getByRole } = render(HotkeyCapture);
    const input = getByRole("textbox") as HTMLInputElement;

    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});
