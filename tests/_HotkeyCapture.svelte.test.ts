import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createEvent } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { tick } from "svelte";
import HotkeyCapture, { parseHotkey } from "#svs/_HotkeyCapture.svelte";
import { PARTS, VARIANT } from "#svs/core";

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
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(props.active).toBe(true);
    await fireEvent.blur(input); // blur the input
    expect(props.active).toBe(false);
  });

  test("programmatic active change focuses/blurs element", async () => {
    const props = $state({ active: false });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(document.activeElement).not.toBe(input);

    props.active = true;
    await tick();
    expect(document.activeElement).toBe(input);

    props.active = false;
    await tick();
    expect(document.activeElement).not.toBe(input);
  });

  test("initial active focuses element", async () => {
    const props = $state({ active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await tick();
    expect(document.activeElement).toBe(input);
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

describe("Capture callback (oncapture)", () => {
  test("key without modifier", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;
    const event = createEvent.keyDown(input, { key: "a" });

    input.focus();
    await fireEvent(input, event);
    expect(oncapture).toHaveBeenCalledOnce();
    expect(oncapture).toHaveBeenCalledWith(
      expect.objectContaining({ value: "A", ctrl: false, alt: false, shift: false, meta: false, key: "A", kind: "key" }),
    );
    expect(oncapture.mock.calls[0][0].event).toBe(event);
    expect(props.value).toBe(oncapture.mock.calls[0][0].value);
  });

  test("space key", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: " " });
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "SPACE", value: "SPACE", kind: "key" }));
    expect(props.value).toBe("SPACE");
  });

  test("key with multiple modifiers", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "a", ctrlKey: true, shiftKey: true });
    expect(oncapture).toHaveBeenCalledWith(
      expect.objectContaining({ ctrl: true, alt: false, shift: true, meta: false, key: "A", value: "Ctrl Shift A", kind: "key" }),
    );
    expect(props.value).toBe("Ctrl Shift A");
  });

  test("modifier-only key does not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "Control" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("repeated keydown does not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "a", repeat: true });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("composing and unstable keys do not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "a", isComposing: true });
    await fireEvent.keyDown(input, { key: "Dead" });
    await fireEvent.keyDown(input, { key: "Unidentified" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("not focused and disabled do not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: false, disabled: false, oncapture });
    const { getByRole, rerender } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await fireEvent.keyDown(input, { key: "a" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");

    props.disabled = true;
    await rerender(props);
    input.focus();
    await fireEvent.keyDown(input, { key: "a" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("pointer main button", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.pointerDown(input, { button: 0 });
    await waitFor(() => expect(oncapture).toHaveBeenCalledOnce());
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "BTN_MAIN", kind: "pointer", value: "BTN_MAIN" }));
    expect(oncapture.mock.calls[0][0].event.type).toBe("pointerdown");
    expect(props.value).toBe(oncapture.mock.calls[0][0].value);
  });

  test("pointer with modifiers", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.pointerDown(input, { button: 2, ctrlKey: true });
    await waitFor(() => expect(oncapture).toHaveBeenCalledOnce());
    expect(oncapture).toHaveBeenCalledWith(
      expect.objectContaining({ key: "BTN_SUB", ctrl: true, shift: false, value: "Ctrl BTN_SUB", kind: "pointer" }),
    );
  });

  test("wheel up and down", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.wheel(input, { deltaY: -1 });
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "WHEELUP", kind: "wheel", value: "WHEELUP" }));

    oncapture.mockClear();
    await fireEvent.wheel(input, { deltaY: 1 });
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "WHEELDOWN", kind: "wheel", value: "WHEELDOWN" }));
  });
});

describe("parseHotkey", () => {
  test("parses modifier key combos", () => {
    expect(parseHotkey("Ctrl Shift A")).toEqual({ value: "Ctrl Shift A", ctrl: true, alt: false, shift: true, meta: false, key: "A" });
  });

  test("parses pointer keys", () => {
    expect(parseHotkey("BTN_SUB")).toEqual({ value: "BTN_SUB", ctrl: false, alt: false, shift: false, meta: false, key: "BTN_SUB" });
  });

  test("parses all modifiers", () => {
    expect(parseHotkey("Ctrl Alt Shift Meta WHEELUP")).toEqual({
      value: "Ctrl Alt Shift Meta WHEELUP",
      ctrl: true,
      alt: true,
      shift: true,
      meta: true,
      key: "WHEELUP",
    });
  });

  test("parses empty value", () => {
    expect(parseHotkey("")).toEqual({ value: "", ctrl: false, alt: false, shift: false, meta: false, key: "" });
  });

  test("round-trips captured value", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "a", ctrlKey: true, altKey: true });
    const detail = oncapture.mock.calls[0][0];
    expect(parseHotkey(props.value)).toEqual({
      value: detail.value,
      ctrl: detail.ctrl,
      alt: detail.alt,
      shift: detail.shift,
      meta: detail.meta,
      key: detail.key,
    });
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

  test("ignores composing and unstable keys", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.keyDown(input, { key: "A", isComposing: true });
    expect(props.value).toBe("");

    await fireEvent.keyDown(input, { key: "Dead" });
    expect(props.value).toBe("");

    await fireEvent.keyDown(input, { key: "Unidentified" });
    expect(props.value).toBe("");
  });

  test("ignores events when not focused", async () => {
    const props = $state({ value: "", active: false });
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
    await waitFor(() => {
      expect(props.value).toBe("BTN_MAIN");
    });
  });

  test("captures wheel button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 1 });
    await waitFor(() => {
      expect(props.value).toBe("BTN_WHEEL");
    });
  });

  test("captures sub button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 2 });
    await waitFor(() => {
      expect(props.value).toBe("BTN_SUB");
    });
  });

  test("captures back button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 3 });
    await waitFor(() => {
      expect(props.value).toBe("BTN_BACK");
    });
  });

  test("captures forward button click", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 4 });
    await waitFor(() => {
      expect(props.value).toBe("BTN_FORWARD");
    });
  });

  test("captures pointer with modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await fireEvent.pointerDown(input, { button: 0, ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(props.value).toBe("Ctrl Shift BTN_MAIN");
    });
  });

  test("ignores pointer events when not focused", async () => {
    const props = $state({ value: "", active: false });
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

describe("Out-of-range pointer button", () => {
  test("does not capture button 5", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.pointerDown(input, { button: 5 });
    expect(props.value).toBe("");
    expect(props.value).not.toContain("undefined");
    expect(oncapture).not.toHaveBeenCalled();
  });

  test("does not capture button 6", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "Ctrl A", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.pointerDown(input, { button: 6 });
    expect(props.value).toBe("Ctrl A");
    expect(props.value).not.toContain("undefined");
    expect(oncapture).not.toHaveBeenCalled();
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
    const props = $state({ value: "", active: false });
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

describe("Horizontal wheel", () => {
  test("does not capture horizontal-only wheel", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    await fireEvent.wheel(input, { deltaY: 0, deltaX: -1 });
    expect(props.value).toBe("");
    expect(oncapture).not.toHaveBeenCalled();
  });

  test("does not prevent horizontal-only wheel, but prevents vertical wheel", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    const horizontal = createEvent.wheel(input, { deltaY: 0, deltaX: -1, bubbles: true, cancelable: true });
    const preventHorizontal = vi.spyOn(horizontal, "preventDefault");
    await fireEvent(input, horizontal);
    expect(preventHorizontal).not.toHaveBeenCalled();

    const vertical = createEvent.wheel(input, { deltaY: -1, bubbles: true, cancelable: true });
    const preventVertical = vi.spyOn(vertical, "preventDefault");
    await fireEvent(input, vertical);
    expect(preventVertical).toHaveBeenCalled();
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
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveClass(preset, PARTS.MAIN, customNeutral);

    props.active = true;
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.active = false;
    await tick();
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

describe("Attribute pass-through & attach", () => {
  const preset = "svs-hotkey-capture";

  test("passes arbitrary attributes through", () => {
    const { getByRole } = render(HotkeyCapture, { name: "hk", id: "my-hk", "data-testid": "x" });
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveAttribute("name", "hk");
    expect(input).toHaveAttribute("id", "my-hk");
    expect(input).toHaveAttribute("data-testid", "x");
  });

  test("passes aria-label through", () => {
    const { getByLabelText } = render(HotkeyCapture, { "aria-label": "Shortcut" });
    expect(getByLabelText("Shortcut")).toBeInTheDocument();
  });

  test("merges class with preset classes", () => {
    const { getByRole } = render(HotkeyCapture, { class: "extra" });
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL, "extra");
  });

  test("placeholder still works via rest", () => {
    const { getByPlaceholderText } = render(HotkeyCapture, { placeholder });
    const input = getByPlaceholderText(placeholder) as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  test("attach runs", async () => {
    const attach = vi.fn();
    const { getByRole } = render(HotkeyCapture, { attach });
    const input = getByRole("textbox") as HTMLInputElement;

    await tick();
    expect(attach).toHaveBeenCalled();
    expect(attach.mock.calls[0][0]).toBe(input);
  });

  test("component focus handler wins over rest and chains consumer handler", async () => {
    const onfocus = vi.fn();
    const props = $state({ active: false, onfocus });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    expect(props.active).toBe(true);
    expect(onfocus).toHaveBeenCalledOnce();
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

  test("prevents default and stops propagation on pointer events", async () => {
    const props = $state({ value: "", active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    await tick();
    const event = createEvent.pointerDown(input, { button: 0, bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("does not prevent context menu when not focused", async () => {
    const { getByRole } = render(HotkeyCapture);
    const input = getByRole("textbox") as HTMLInputElement;

    const event = createEvent.contextMenu(input, { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });

  test("prevents context menu when focused", async () => {
    const props = $state({ active: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    const event = createEvent.contextMenu(input, { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("does not prevent context menu when disabled", async () => {
    const props = $state({ active: true, disabled: true });
    const { getByRole } = render(HotkeyCapture, props);
    const input = getByRole("textbox") as HTMLInputElement;

    input.focus();
    const event = createEvent.contextMenu(input, { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    await fireEvent(input, event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });
});
