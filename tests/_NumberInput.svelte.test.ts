import { describe, expect, test } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import NumberInput from "#svs/_NumberInput.svelte";
import { PARTS, VARIANT } from "#svs/core";

describe("_NumberInput rendering", () => {
  test("renders text input with inputmode, datalist, class, and passthrough attrs", () => {
    const { container, rerender } = render(NumberInput, { class: "x", placeholder: "amount", options: new Set([1, 2, 3]) });
    let input = container.querySelector("input") as HTMLInputElement;
    const list = container.querySelector("datalist") as HTMLDataListElement;

    expect(input).toHaveAttribute("type", "text");
    expect(input).not.toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("placeholder", "amount");
    expect(input).toHaveClass("svs-number-input", PARTS.MAIN, "x");
    expect(input).toHaveAttribute("list", list.id);
    expect(within(list).getAllByRole("option", { hidden: true })).toHaveLength(3);

    rerender({ integer: true });
    expect(input).toHaveAttribute("inputmode", "numeric");
  });
});

describe("_NumberInput character blocking", () => {
  test("rejects letters, disallowed decimals, repeated dots, and disallowed minus signs", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(NumberInput);
    let input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "12a3");
    expect(input).toHaveValue("123");

    await user.clear(input);
    await rerender({ integer: true });
    await user.type(input, "1.5");
    expect(input).toHaveValue("15");

    await user.clear(input);
    await rerender({ integer: false });
    await user.type(input, "1.5.2");
    expect(input).toHaveValue("1.52");

    await user.clear(input);
    await rerender({ min: -10 });
    await user.type(input, "-5");
    expect(input).toHaveValue("-5");

    await user.clear(input);
    await rerender({ min: 0 });
    await user.type(input, "-5");
    expect(input).toHaveValue("5");
  });

  test("allows transient partial numeric text without committing a number", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined });
    const { container } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "-");
    expect(input).toHaveValue("-");
    expect(props.value).toBeUndefined();

    await user.clear(input);
    await user.type(input, "1.");
    expect(input).toHaveValue("1.");
    expect(props.value).toBeUndefined();
  });
});

describe("_NumberInput value and commit behavior", () => {
  test("updates bindable value live, clears to undefined, and clamps/snaps on blur", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, min: 0, max: 10, step: 5 });
    const { container, rerender } = render(NumberInput, props);
    let input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "42");
    expect(props.value).toBe(42);

    await user.clear(input);
    expect(props.value).toBeUndefined();

    await user.type(input, "99");
    await fireEvent.blur(input);
    expect(props.value).toBe(10);
    expect(input).toHaveValue("10");

    await user.clear(input);
    await user.type(input, "7");
    await fireEvent.blur(input);
    expect(props.value).toBe(5);
    expect(input).toHaveValue("5");

    await rerender(props);
    input = container.querySelector("input") as HTMLInputElement;
    expect(input).toHaveValue("5");
  });

  test("clamps negative typed values on blur", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, min: -10 });
    const { container } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "-99");
    await fireEvent.blur(input);
    expect(props.value).toBe(-10);
    expect(input).toHaveValue("-10");
  });

  test("rounds decimal step math without float tail", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, step: 0.1, spin: true });
    const { getByRole, container } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "0.30000000000000004");
    await fireEvent.blur(input);
    expect(props.value).toBe(0.3);
    expect(input).toHaveValue("0.3");

    await user.clear(input);
    await tick();
    await user.click(getByRole("button", { name: "Increment" }));
    await user.click(getByRole("button", { name: "Increment" }));
    await user.click(getByRole("button", { name: "Increment" }));
    expect(props.value).toBe(0.3);
  });

  test("clamps to a step-aligned value when max is not on the step grid", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, min: 0, max: 10, step: 3 });
    const { container } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "99");
    await fireEvent.blur(input);
    expect(props.value).toBe(9);
    expect(input).toHaveValue("9");
  });

  test("syncs external value only while not focused", async () => {
    const user = userEvent.setup();
    const props = $state({ value: 1 as number | undefined });
    const { container, rerender } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveValue("1");
    props.value = 2;
    await rerender(props);
    expect(input).toHaveValue("2");

    await user.click(input);
    await user.clear(input);
    await user.type(input, "45");
    props.value = 9;
    await tick();
    expect(input).toHaveValue("45");

    await user.tab();
    expect(input).toHaveValue("45");
  });
});

describe("_NumberInput spin behavior", () => {
  test("renders no buttons by default and renders labelled spin buttons when enabled", async () => {
    const dec = createRawSnippet(() => ({ render: () => "<i data-testid='dec'></i>" }));
    const inc = createRawSnippet(() => ({ render: () => "<i data-testid='inc'></i>" }));
    const { container, getByRole, getByTestId } = render(NumberInput, {
      spin: true,
      decrementLabel: "Less",
      incrementLabel: "More",
      decrement: dec,
      increment: inc,
    });

    expect(getByRole("button", { name: "Less" })).toHaveAttribute("tabindex", "-1");
    expect(getByRole("button", { name: "More" })).toHaveAttribute("type", "button");
    expect(getByTestId("dec")).toBeInTheDocument();
    expect(getByTestId("inc")).toBeInTheDocument();

    const plain = render(NumberInput);
    expect(plain.container.querySelector("button")).toBeNull();
    expect(container.querySelector(`.${PARTS.LEFT}`)).toContainElement(getByRole("button", { name: "Less" }));
  });

  test("increments, decrements, disables at bounds, and respects disabled attr", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 2, step: 2, disabled: false });
    const { container, getByRole, rerender } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const dec = getByRole("button", { name: "Decrement" });
    const inc = getByRole("button", { name: "Increment" });

    await tick();
    expect(dec).toBeDisabled();
    await user.click(inc);
    expect(props.value).toBe(2);
    expect(input).toHaveValue("2");
    expect(inc).toBeDisabled();

    await user.click(dec);
    expect(props.value).toBe(0);
    expect(input).toHaveValue("0");

    props.disabled = true;
    await rerender(props);
    expect(dec).toBeDisabled();
    expect(inc).toBeDisabled();
  });

  test("pointer hold path bumps once and stops on release", async () => {
    const props = $state({ value: 0 as number | undefined, spin: true });
    const { getByRole } = render(NumberInput, props);
    const inc = getByRole("button", { name: "Increment" });

    await tick();
    await fireEvent.pointerDown(inc);
    await fireEvent.pointerUp(inc);
    expect(props.value).toBe(1);
  });
});

describe("_NumberInput spinbutton a11y and standalone invariants", () => {
  test("sets spinbutton aria attributes and handles arrows only when spin is true", async () => {
    const props = $state({ value: undefined as number | undefined, spin: true, min: 0, max: 10, step: 2 });
    const { container, rerender } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveAttribute("role", "spinbutton");
    expect(input).toHaveAttribute("aria-valuemin", "0");
    expect(input).toHaveAttribute("aria-valuemax", "10");
    expect(input).not.toHaveAttribute("aria-valuenow");

    const up = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    input.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);
    expect(props.value).toBe(2);
    await tick();
    expect(input).toHaveAttribute("aria-valuenow", "2");

    props.spin = false;
    await rerender(props);
    const next = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    input.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(false);
    expect(props.value).toBe(2);
    expect(input).not.toHaveAttribute("role");
  });

  test("binds element locally and applies local variant class without context", async () => {
    const props = $state({ element: undefined as HTMLInputElement | undefined, variant: VARIANT.ACTIVE });
    const { container } = render(NumberInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(props.element).toBe(input);
    expect(input).toHaveClass("svs-number-input", PARTS.MAIN, VARIANT.ACTIVE);
  });
});
