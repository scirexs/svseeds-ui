import axe from "axe-core";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { tick } from "svelte";
import HotkeyCapture, { parseHotkey } from "#svs/HotkeyCapture.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const placeholder = "Press a key combination...";
const input = (c: HTMLElement) => c.querySelector("input") as HTMLInputElement;
const key = async (el: HTMLInputElement, init: KeyboardEventInit) => {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  await tick();
  return ev;
};
const point = async (el: HTMLInputElement, init: PointerEventInit) => {
  const ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  await tick();
  return ev;
};
const wheel = async (el: HTMLInputElement, init: WheelEventInit) => {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaX: 0, ...init });
  el.dispatchEvent(ev);
  await tick();
  return ev;
};

describe("Basic rendering and props", () => {
  test("no props", async () => {
    const { container } = render(HotkeyCapture);
    const el = input(container);
    expect(container.contains(el)).toBe(true);
    await expect.element(el).toHaveAttribute("type", "text");
    await expect.element(el).toHaveAttribute("readonly");
    await expect.element(el).toHaveValue("");
  });

  test("with placeholder", () => {
    const { container } = render(HotkeyCapture, { placeholder });
    expect(container.querySelector(`input[placeholder="${placeholder}"]`)).toBeTruthy();
  });

  test("with default value", async () => {
    const { container } = render(HotkeyCapture, { value: "Ctrl Space" });
    await expect.element(input(container)).toHaveValue("Ctrl Space");
  });

  test("disabled state", async () => {
    const { container } = render(HotkeyCapture, { disabled: true });
    await expect.element(input(container)).toBeDisabled();
  });
});

describe("Active state and focus management", () => {
  test("becomes active on focus", async () => {
    const props = $state({ active: false });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    expect(props.active).toBe(false);
    await userEvent.click(el);
    expect(props.active).toBe(true);
  });

  test("becomes inactive on blur", async () => {
    const props = $state({ active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    expect(props.active).toBe(true);
    el.blur();
    await tick();
    expect(props.active).toBe(false);
  });

  test("programmatic active change focuses/blurs element", async () => {
    const props = $state({ active: false });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    expect(document.activeElement).not.toBe(el);

    props.active = true;
    await tick();
    await expect.element(el).toHaveFocus();

    props.active = false;
    await tick();
    expect(document.activeElement).not.toBe(el);
  });

  test("initial active focuses element", async () => {
    const { container } = render(HotkeyCapture, { active: true });
    const el = input(container);

    await tick();
    await expect.element(el).toHaveFocus();
  });

  test("disabled prevents focus", async () => {
    const props = $state({ disabled: true, active: false });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await tick();
    expect(document.activeElement).not.toBe(el);
    expect(props.active).toBe(false);
  });
});

describe("Capture callback (oncapture)", () => {
  test("key without modifier", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });

    el.focus();
    el.dispatchEvent(event);
    await tick();
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
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: " " });
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "SPACE", value: "SPACE", kind: "key" }));
    expect(props.value).toBe("SPACE");
  });

  test("key with multiple modifiers", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "a", ctrlKey: true, shiftKey: true });
    expect(oncapture).toHaveBeenCalledWith(
      expect.objectContaining({ ctrl: true, alt: false, shift: true, meta: false, key: "A", value: "Ctrl Shift A", kind: "key" }),
    );
    expect(props.value).toBe("Ctrl Shift A");
  });

  test("modifier-only key does not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "Control" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("repeated keydown does not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "a", repeat: true });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("composing and unstable keys do not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "a", isComposing: true });
    await key(el, { key: "Dead" });
    await key(el, { key: "Unidentified" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("not focused and disabled do not fire", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: false, disabled: false, oncapture });
    const { container, rerender } = render(HotkeyCapture, props);
    const el = input(container);

    await key(el, { key: "a" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");

    props.disabled = true;
    await rerender(props);
    el.focus();
    await key(el, { key: "a" });
    expect(oncapture).not.toHaveBeenCalled();
    expect(props.value).toBe("");
  });

  test("pointer main button", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 0 });
    expect(oncapture).toHaveBeenCalledOnce();
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "BTN_MAIN", kind: "pointer", value: "BTN_MAIN" }));
    expect(oncapture.mock.calls[0][0].event.type).toBe("pointerdown");
    expect(props.value).toBe(oncapture.mock.calls[0][0].value);
  });

  test("pointer with modifiers", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 2, ctrlKey: true });
    expect(oncapture).toHaveBeenCalledOnce();
    expect(oncapture).toHaveBeenCalledWith(
      expect.objectContaining({ key: "BTN_SUB", ctrl: true, shift: false, value: "Ctrl BTN_SUB", kind: "pointer" }),
    );
  });

  test("wheel up and down", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: -1 });
    expect(oncapture).toHaveBeenCalledWith(expect.objectContaining({ key: "WHEELUP", kind: "wheel", value: "WHEELUP" }));

    oncapture.mockClear();
    await wheel(el, { deltaY: 1 });
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
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "a", ctrlKey: true, altKey: true });
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
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A" });
    expect(props.value).toBe("A");
  });

  test("captures space key as SPACE", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: " " });
    expect(props.value).toBe("SPACE");
  });

  test("captures key with single modifier", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A", ctrlKey: true });
    expect(props.value).toBe("Ctrl A");
  });

  test("captures key with multiple modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A", ctrlKey: true, shiftKey: true, altKey: true });
    expect(props.value).toBe("Ctrl Alt Shift A");
  });

  test("captures key with meta modifier", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A", metaKey: true });
    expect(props.value).toBe("Meta A");
  });

  test("ignores modifier keys alone", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    for (const mod of ["Control", "Alt", "Shift", "Meta"]) {
      await key(el, { key: mod });
      expect(props.value).toBe("");
    }
  });

  test("ignores repeated keydown events", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A", repeat: true });
    expect(props.value).toBe("");
  });

  test("ignores composing and unstable keys", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A", isComposing: true });
    expect(props.value).toBe("");

    await key(el, { key: "Dead" });
    expect(props.value).toBe("");

    await key(el, { key: "Unidentified" });
    expect(props.value).toBe("");
  });

  test("ignores events when not focused", async () => {
    const props = $state({ value: "", active: false });
    const { container } = render(HotkeyCapture, props);

    await key(input(container), { key: "A" });
    expect(props.value).toBe("");
  });

  test("ignores events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await key(el, { key: "A" });
    expect(props.value).toBe("");
  });
});

describe("Pointer event handling", () => {
  test("captures main button click", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 0 });
    expect(props.value).toBe("BTN_MAIN");
  });

  test("captures wheel button click", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 1 });
    expect(props.value).toBe("BTN_WHEEL");
  });

  test("captures sub button click", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 2 });
    expect(props.value).toBe("BTN_SUB");
  });

  test("captures back button click", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 3 });
    expect(props.value).toBe("BTN_BACK");
  });

  test("captures forward button click", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 4 });
    expect(props.value).toBe("BTN_FORWARD");
  });

  test("captures pointer with modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 0, ctrlKey: true, shiftKey: true });
    expect(props.value).toBe("Ctrl Shift BTN_MAIN");
  });

  test("ignores pointer events when not focused", async () => {
    const props = $state({ value: "", active: false });
    const { container } = render(HotkeyCapture, props);

    await point(input(container), { button: 0 });
    expect(props.value).toBe("");
  });

  test("ignores pointer events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 0 });
    expect(props.value).toBe("");
  });
});

describe("Out-of-range pointer button", () => {
  test("does not capture button 5", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 5 });
    expect(props.value).toBe("");
    expect(props.value).not.toContain("undefined");
    expect(oncapture).not.toHaveBeenCalled();
  });

  test("does not capture button 6", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "Ctrl A", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await point(el, { button: 6 });
    expect(props.value).toBe("Ctrl A");
    expect(props.value).not.toContain("undefined");
    expect(oncapture).not.toHaveBeenCalled();
  });
});

describe("Wheel event handling", () => {
  test("captures wheel up", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: -1 });
    expect(props.value).toBe("WHEELUP");
  });

  test("captures wheel down", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: 1 });
    expect(props.value).toBe("WHEELDOWN");
  });

  test("captures wheel with modifiers", async () => {
    const props = $state({ value: "", active: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: -1, ctrlKey: true });
    expect(props.value).toBe("Ctrl WHEELUP");
  });

  test("ignores wheel events when not focused", async () => {
    const props = $state({ value: "", active: false });
    const { container } = render(HotkeyCapture, props);

    await wheel(input(container), { deltaY: -1 });
    expect(props.value).toBe("");
  });

  test("ignores wheel events when disabled", async () => {
    const props = $state({ value: "", active: true, disabled: true });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: -1 });
    expect(props.value).toBe("");
  });
});

describe("Horizontal wheel", () => {
  test("does not capture horizontal-only wheel", async () => {
    const oncapture = vi.fn();
    const props = $state({ value: "", active: true, oncapture });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await wheel(el, { deltaY: 0, deltaX: -1 });
    expect(props.value).toBe("");
    expect(oncapture).not.toHaveBeenCalled();
  });

  test("does not prevent horizontal-only wheel, but prevents vertical wheel", async () => {
    const { container } = render(HotkeyCapture, { value: "", active: true });
    const el = input(container);

    el.focus();
    const horizontal = new WheelEvent("wheel", { deltaY: 0, deltaX: -1, bubbles: true, cancelable: true });
    const preventHorizontal = vi.spyOn(horizontal, "preventDefault");
    el.dispatchEvent(horizontal);
    await tick();
    expect(preventHorizontal).not.toHaveBeenCalled();

    const vertical = new WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: true });
    const preventVertical = vi.spyOn(vertical, "preventDefault");
    el.dispatchEvent(vertical);
    await tick();
    expect(preventVertical).toHaveBeenCalled();
  });
});

describe("Status management", () => {
  const preset = "svs-hotkey-capture";

  test("default variant is neutral", async () => {
    const { container } = render(HotkeyCapture);
    await expect.element(input(container)).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("variant changes to active when focused", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    await userEvent.click(el);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(el).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("variant changes to inactive when disabled", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL, disabled: false });
    const { container, rerender } = render(HotkeyCapture, props);
    const el = input(container);

    props.disabled = true;
    await rerender(props);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await expect.element(el).toHaveClass(preset, PARTS.MAIN, VARIANT.INACTIVE);
  });

  test("custom neutral variant is preserved", async () => {
    const customNeutral = "custom-neutral";
    const props = $state({ variant: customNeutral, active: false });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    await expect.element(el).toHaveClass(preset, PARTS.MAIN, customNeutral);

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

  test("default preset classes", async () => {
    const { container } = render(HotkeyCapture);
    await expect.element(input(container)).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("string styling overrides preset", async () => {
    const { container } = render(HotkeyCapture, { styling: "custom-styling" });
    const el = input(container);
    await expect.element(el).toHaveClass("custom-styling", PARTS.MAIN, VARIANT.NEUTRAL);
    expect(el.classList.contains(preset)).toBe(false);
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
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    await expect.element(el).toHaveClass("base-class", "neutral-class");

    await userEvent.click(el);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(el).toHaveClass("base-class", "active-class");
  });
});

describe("Attribute pass-through & attach", () => {
  const preset = "svs-hotkey-capture";

  test("passes arbitrary attributes through", async () => {
    const { container } = render(HotkeyCapture, { name: "hk", id: "my-hk", "data-testid": "x" });
    const el = input(container);

    await expect.element(el).toHaveAttribute("name", "hk");
    await expect.element(el).toHaveAttribute("id", "my-hk");
    await expect.element(el).toHaveAttribute("data-testid", "x");
  });

  test("passes aria-label through", () => {
    const { container } = render(HotkeyCapture, { "aria-label": "Shortcut" });
    expect(container.querySelector('[aria-label="Shortcut"]')).toBeTruthy();
  });

  test("merges class with preset classes", async () => {
    const { container } = render(HotkeyCapture, { class: "extra" });
    await expect.element(input(container)).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL, "extra");
  });

  test("placeholder still works via rest", () => {
    const { container } = render(HotkeyCapture, { placeholder });
    expect(container.querySelector(`input[placeholder="${placeholder}"]`)).toBeTruthy();
  });

  test("attach runs", async () => {
    const attach = vi.fn();
    const { container } = render(HotkeyCapture, { attach });
    const el = input(container);

    await tick();
    expect(attach).toHaveBeenCalled();
    expect(attach.mock.calls[0][0]).toBe(el);
  });

  test("component focus handler wins over rest and chains consumer handler", async () => {
    const onfocus = vi.fn();
    const props = $state({ active: false, onfocus });
    const { container } = render(HotkeyCapture, props);
    const el = input(container);

    el.focus();
    await tick();
    expect(props.active).toBe(true);
    expect(onfocus).toHaveBeenCalledOnce();
  });
});

describe("Event prevention", () => {
  test("prevents default and stops propagation on keydown", async () => {
    const { container } = render(HotkeyCapture, { value: "", active: true });
    const el = input(container);

    el.focus();
    const event = new KeyboardEvent("keydown", { key: "A", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    el.dispatchEvent(event);
    await tick();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("prevents default and stops propagation on pointer events", async () => {
    const { container } = render(HotkeyCapture, { value: "", active: true });
    const el = input(container);

    el.focus();
    const event = new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    el.dispatchEvent(event);
    await tick();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("does not prevent context menu when not focused", async () => {
    const { container } = render(HotkeyCapture);
    const el = input(container);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    el.dispatchEvent(event);
    await tick();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });

  test("prevents context menu when focused", async () => {
    const { container } = render(HotkeyCapture, { active: true });
    const el = input(container);

    el.focus();
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    el.dispatchEvent(event);
    await tick();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("does not prevent context menu when disabled", async () => {
    const { container } = render(HotkeyCapture, { active: true, disabled: true });
    const el = input(container);

    el.focus();
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    el.dispatchEvent(event);
    await tick();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });
});

describe("accessibility (axe)", () => {
  test("audits the default hotkey capture", async () => {
    const { container } = render(HotkeyCapture, { "aria-label": "Shortcut" });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits a populated hotkey capture", async () => {
    const { container } = render(HotkeyCapture, { "aria-label": "Shortcut", value: "Ctrl Space" });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
