import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import NumberInput from "#svs/NumberInput.svelte";
import { PARTS, VARIANT } from "#svs/core";

const input = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;
const button = (container: HTMLElement, label: string) => container.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;

describe("_NumberInput rendering", () => {
  test("renders text input with inputmode, datalist, class, and passthrough attrs", async () => {
    const { container, rerender } = render(NumberInput, { class: "x", placeholder: "amount", options: new Set([1, 2, 3]) });
    const el = input(container);
    const list = container.querySelector("datalist") as HTMLDataListElement;

    await expect.element(el).toHaveAttribute("type", "text");
    expect(el.hasAttribute("type") && el.type === "number").toBe(false);
    await expect.element(el).toHaveAttribute("inputmode", "decimal");
    await expect.element(el).toHaveAttribute("placeholder", "amount");
    await expect.element(el).toHaveClass("svs-number-input", PARTS.MAIN, "x");
    expect(el.getAttribute("list")).toBe(list.id);
    expect([...list.querySelectorAll("option")]).toHaveLength(3);
    expect(container.querySelector(`.${PARTS.WHOLE}`)?.tagName).toBe("SPAN");

    await rerender({ integer: true });
    await expect.element(el).toHaveAttribute("inputmode", "numeric");
  });
});

describe("_NumberInput character blocking", () => {
  test("rejects letters, disallowed decimals, repeated dots, and disallowed minus signs", async () => {
    const { container, rerender } = render(NumberInput);
    const el = input(container);

    await userEvent.type(el, "12a3");
    await expect.element(el).toHaveValue("123");
    await userEvent.clear(el);
    await rerender({ integer: true });
    await userEvent.type(el, "1.5");
    await expect.element(el).toHaveValue("15");
    await userEvent.clear(el);
    await rerender({ integer: false });
    await userEvent.type(el, "1.5.2");
    await expect.element(el).toHaveValue("1.52");
    await userEvent.clear(el);
    await rerender({ min: -10 });
    await userEvent.type(el, "-5");
    await expect.element(el).toHaveValue("-5");
    await userEvent.clear(el);
    await rerender({ min: 0 });
    await userEvent.type(el, "-5");
    await expect.element(el).toHaveValue("5");
  });

  test("allows transient partial numeric text without committing a number", async () => {
    const props = $state({ value: undefined as number | undefined });
    const { container } = render(NumberInput, props);
    const el = input(container);
    await userEvent.type(el, "-");
    await expect.element(el).toHaveValue("-");
    expect(props.value).toBeUndefined();
    await userEvent.clear(el);
    await userEvent.type(el, "1.");
    await expect.element(el).toHaveValue("1.");
    expect(props.value).toBeUndefined();
  });
});

describe("_NumberInput value and commit behavior", () => {
  test("updates bindable value live, clears to undefined, and clamps/snaps on blur", async () => {
    const props = $state({ value: undefined as number | undefined, min: 0, max: 10, step: 5 });
    const { container, rerender } = render(NumberInput, props);
    let el = input(container);
    await userEvent.type(el, "42");
    expect(props.value).toBe(42);
    await userEvent.clear(el);
    expect(props.value).toBeUndefined();
    await userEvent.type(el, "99");
    el.blur(); await tick();
    expect(props.value).toBe(10);
    await expect.element(el).toHaveValue("10");
    await userEvent.clear(el);
    await userEvent.type(el, "7");
    el.blur(); await tick();
    expect(props.value).toBe(5);
    await expect.element(el).toHaveValue("5");
    await rerender(props);
    el = input(container);
    await expect.element(el).toHaveValue("5");
  });

  test("clamps negative values, rounds decimal steps, and uses an aligned max", async () => {
    const negative = $state({ value: undefined as number | undefined, min: -10 });
    const negativeRender = render(NumberInput, negative);
    const negativeInput = input(negativeRender.container);
    await userEvent.type(negativeInput, "-99");
    negativeInput.blur(); await tick();
    expect(negative.value).toBe(-10);
    await expect.element(negativeInput).toHaveValue("-10");
    await negativeRender.unmount();

    const decimal = $state({ value: undefined as number | undefined, step: 0.1, spin: true });
    const decimalRender = render(NumberInput, decimal);
    const decimalInput = input(decimalRender.container);
    await userEvent.type(decimalInput, "0.30000000000000004");
    decimalInput.blur(); await tick();
    expect(decimal.value).toBe(0.3);
    await expect.element(decimalInput).toHaveValue("0.3");
    await userEvent.clear(decimalInput); await tick();
    await userEvent.click(button(decimalRender.container, "Increment"));
    await userEvent.click(button(decimalRender.container, "Increment"));
    await userEvent.click(button(decimalRender.container, "Increment"));
    expect(decimal.value).toBe(0.3);
    await decimalRender.unmount();

    const aligned = $state({ value: undefined as number | undefined, min: 0, max: 10, step: 3 });
    const alignedRender = render(NumberInput, aligned);
    const alignedInput = input(alignedRender.container);
    await userEvent.type(alignedInput, "99");
    alignedInput.blur(); await tick();
    // Off-grid 99 snaps to 99 then clamps to the aligned max 9 (largest 0,3,6,9 value <= 10).
    expect(aligned.value).toBe(9);
    await expect.element(alignedInput).toHaveValue("9");
    await alignedRender.unmount();

    // Decimal aligned max must survive FP underflow: (0.7 - 0)/0.1 === 6.999...,
    // so without the epsilon in alignedMax() floor() yields 6 and clamps wrongly to 0.6.
    const decAligned = $state({ value: undefined as number | undefined, min: 0, max: 0.7, step: 0.1 });
    const decAlignedRender = render(NumberInput, decAligned);
    const decAlignedInput = input(decAlignedRender.container);
    await userEvent.type(decAlignedInput, "9");
    decAlignedInput.blur(); await tick();
    expect(decAligned.value).toBe(0.7);
    await expect.element(decAlignedInput).toHaveValue("0.7");
  });

  test("syncs external value only while not focused", async () => {
    const props = $state({ value: 1 as number | undefined });
    const { container, rerender } = render(NumberInput, props);
    const el = input(container);
    await expect.element(el).toHaveValue("1");
    props.value = 2; await rerender(props);
    await expect.element(el).toHaveValue("2");
    await userEvent.click(el); await userEvent.clear(el); await userEvent.type(el, "45");
    props.value = 9; await tick();
    await expect.element(el).toHaveValue("45");
    await userEvent.tab();
    await expect.element(el).toHaveValue("45");
  });
});

describe("_NumberInput spin behavior", () => {
  test("renders labelled snippets and supports split and stack layouts", async () => {
    const dec = createRawSnippet(() => ({ render: () => "<i data-testid='dec'></i>" }));
    const inc = createRawSnippet(() => ({ render: () => "<i data-testid='inc'></i>" }));
    const { container } = render(NumberInput, { spin: true, ariaDecLabel: "Less", ariaIncLabel: "More", decrement: dec, increment: inc });
    const less = button(container, "Less");
    const more = button(container, "More");
    await expect.element(less).toHaveAttribute("tabindex", "-1");
    await expect.element(more).toHaveAttribute("type", "button");
    expect(container.querySelector("[data-testid='dec']")?.isConnected).toBe(true);
    expect(container.querySelector("[data-testid='inc']")?.isConnected).toBe(true);
    expect(container.querySelector(`.${PARTS.LEFT}`)?.contains(less)).toBe(true);
    const splitInput = input(container);
    expect(less.compareDocumentPosition(splitInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(splitInput.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const plain = render(NumberInput);
    expect(plain.container.querySelector("button")).toBeNull();
    expect(plain.container.querySelector(`.${PARTS.AUX}`)).toBeNull();
    const stacked = render(NumberInput, { spin: true, stack: true });
    const aux = stacked.container.querySelector(`.${PARTS.AUX}`) as HTMLElement;
    expect(stacked.container.querySelectorAll(`.${PARTS.AUX}`)).toHaveLength(1);
    expect(aux.querySelectorAll("button")).toHaveLength(2);
    expect(input(stacked.container).compareDocumentPosition(aux) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("increments, decrements, disables at bounds, and respects disabled attr", async () => {
    const props = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 2, step: 2, disabled: false });
    const { container, rerender } = render(NumberInput, props);
    const dec = button(container, "Decrement");
    const inc = button(container, "Increment");
    await tick(); await expect.element(dec).toBeDisabled();
    await userEvent.click(inc); expect(props.value).toBe(2); await expect.element(input(container)).toHaveValue("2");
    await expect.element(inc).toBeDisabled();
    await userEvent.click(dec); expect(props.value).toBe(0); await expect.element(input(container)).toHaveValue("0");
    props.disabled = true; await rerender(props);
    await expect.element(dec).toBeDisabled(); await expect.element(inc).toBeDisabled();
  });

  test("disables increment at the aligned max", async () => {
    const props = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 10, step: 3 });
    const { container } = render(NumberInput, props);
    const inc = button(container, "Increment");
    await userEvent.click(inc); await userEvent.click(inc); await userEvent.click(inc);
    expect(props.value).toBe(9);
    await expect.element(inc).toBeDisabled();
    inc.click();
    expect(props.value).toBe(9);
  });

  test("reports the aligned maximum and omits an unbounded maximum", async () => {
    const aligned = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 10, step: 3 });
    const alignedRender = render(NumberInput, aligned);
    const alignedInput = input(alignedRender.container);
    await expect.element(alignedInput).toHaveAttribute("aria-valuemin", "0");
    await expect.element(alignedInput).toHaveAttribute("aria-valuemax", "9");

    const unbounded = $state({ value: undefined as number | undefined, spin: true, min: 0, step: 3 });
    const unboundedRender = render(NumberInput, unbounded);
    expect(input(unboundedRender.container).hasAttribute("aria-valuemax")).toBe(false);

    // Without spin there is no spinbutton role, so aria-valuemax must stay absent even when max is set.
    const noSpin = $state({ value: undefined as number | undefined, min: 0, max: 10, step: 3 });
    const noSpinRender = render(NumberInput, noSpin);
    const noSpinInput = input(noSpinRender.container);
    expect(noSpinInput.hasAttribute("role")).toBe(false);
    expect(noSpinInput.hasAttribute("aria-valuemax")).toBe(false);
  });

  test("pointer hold bumps once and spinbutton arrows are native", async () => {
    const props = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 10, step: 2 });
    const { container, rerender } = render(NumberInput, props);
    const inc = button(container, "Increment");
    const el = input(container);
    await expect.element(el).toHaveAttribute("role", "spinbutton");
    await expect.element(el).toHaveAttribute("aria-valuemin", "0");
    await expect.element(el).toHaveAttribute("aria-valuemax", "10");
    expect(el.hasAttribute("aria-valuenow")).toBe(false);
    inc.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    inc.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick(); expect(props.value).toBe(2);
    const up = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    el.dispatchEvent(up); await tick();
    expect(up.defaultPrevented).toBe(true); expect(props.value).toBe(4);
    await expect.element(el).toHaveAttribute("aria-valuenow", "4");
    props.spin = false; await rerender(props);
    const next = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    el.dispatchEvent(next); await tick();
    expect(next.defaultPrevented).toBe(false); expect(props.value).toBe(4); expect(el.hasAttribute("role")).toBe(false);
  });

  test("binds element and applies local variant without context", async () => {
    const props = $state({ element: undefined as HTMLInputElement | undefined, variant: VARIANT.ACTIVE });
    const { container } = render(NumberInput, props);
    const el = input(container); await tick();
    expect(props.element).toBe(el);
    await expect.element(el).toHaveClass("svs-number-input", PARTS.MAIN, VARIANT.ACTIVE);
  });
});
