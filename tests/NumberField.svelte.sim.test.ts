import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import NumberField from "#svs/NumberField.svelte";
import { PARTS, VARIANT } from "#svs/core";

type NumberFieldElement = HTMLInputElement | undefined;
const label = "Quantity";
const extra = "(optional)";
const bottom = "Choose a number";
const auxid = "number-aux";
const leftid = "number-left";
const rightid = "number-right";
const auxfn = createRawSnippet((value: () => number | undefined, variant: () => string, element: () => NumberFieldElement) => {
  return { render: () => `<span data-testid="${auxid}">${value() ?? "empty"}:${variant()}:${element() ? "element" : "none"}</span>` };
});
const leftfn = createRawSnippet((value: () => number | undefined, variant: () => string, element: () => NumberFieldElement) => {
  return { render: () => `<span data-testid="${leftid}">${value() ?? "empty"}:${variant()}:${element() ? "element" : "none"}</span>` };
});
const rightfn = createRawSnippet((value: () => number | undefined, variant: () => string, element: () => NumberFieldElement) => {
  return { render: () => `<span data-testid="${rightid}">${value() ?? "empty"}:${variant()}:${element() ? "element" : "none"}</span>` };
});

describe("NumberField chrome", () => {
  test("renders label, extra, group labelling, aux, left, right, and bottom", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const { container, getByRole, getByText, getByTestId } = render(NumberField, {
      label,
      extra,
      aux,
      left,
      right,
      bottom,
      value: 4,
    });
    const group = getByRole("group");
    const lbl = getByText(label);
    const input = container.querySelector(`#${lbl.getAttribute("for")}`) as HTMLInputElement;
    const btm = getByText(bottom);

    expect(group).toHaveClass("svs-number-field", PARTS.WHOLE);
    expect(group).toHaveAttribute("aria-labelledby", lbl.id);
    expect(lbl).toHaveAttribute("for", input.id);
    expect(within(lbl).getByText(extra)).toBeInTheDocument();
    expect(lbl.parentElement).toHaveClass("svs-number-field", PARTS.TOP);
    expect(getByTestId(auxid).parentElement).toHaveClass("svs-number-field", PARTS.AUX);
    expect(getByTestId(leftid).parentElement).toHaveClass("svs-number-field", PARTS.LEFT);
    expect(getByTestId(rightid).parentElement).toHaveClass("svs-number-field", PARTS.RIGHT);
    expect(btm).toHaveClass("svs-number-field", PARTS.BOTTOM);
    expect(input).toHaveAccessibleDescription(bottom);
    expect(aux).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("reserves bottom message", () => {
    const { getByRole, rerender } = render(NumberField, { reserve: true });
    const group = getByRole("group") as HTMLDivElement;

    expect(group.lastElementChild).toHaveClass("svs-number-field", PARTS.BOTTOM);
    expect(group.lastElementChild).toHaveTextContent("");

    rerender({ bottom });
    expect(group.lastElementChild).toHaveClass("svs-number-field", PARTS.BOTTOM);
    expect(group.lastElementChild).toHaveTextContent(bottom);
  });
});

describe("NumberField default child and passthrough", () => {
  test("renders NumberInput by default and forwards numeric config", async () => {
    const { container, getByRole } = render(NumberField, {
      name: "qty",
      numberInput: {
        integer: true,
        spin: true,
        options: new Set([1, 2]),
        ariaDecLabel: "Less",
        ariaIncLabel: "More",
      },
    });
    let input = container.querySelector("input") as HTMLInputElement;
    const list = container.querySelector("datalist") as HTMLDataListElement;

    await tick();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("name", "qty");
    expect(input).toHaveAttribute("list", list.id);
    expect(list.querySelectorAll("option")).toHaveLength(2);
    expect(getByRole("button", { name: "Less" })).toBeInTheDocument();
    expect(getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  test("forwards min/max/step through numberInput and preserves field validation", async () => {
    const user = userEvent.setup();
    const props = $state({
      value: undefined as number | undefined,
      variant: VARIANT.NEUTRAL,
      numberInput: { min: 2, max: 6, step: 2 },
    });
    const { container } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "5");
    await fireEvent.change(input);

    expect(props.value).toBe(6);
    expect(input).toHaveValue("6");
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("forwards decrement/increment snippets to the spin buttons", () => {
    const decrement = createRawSnippet(() => ({ render: () => "<i data-testid='dec'></i>" }));
    const increment = createRawSnippet(() => ({ render: () => "<i data-testid='inc'></i>" }));
    const { getByTestId } = render(NumberField, { numberInput: { spin: true, decrement, increment } });

    expect(getByTestId("dec")).toBeInTheDocument();
    expect(getByTestId("inc")).toBeInTheDocument();
  });

  test("forwards stack to NumberInput (stacked spin buttons)", () => {
    const { container } = render(NumberField, { numberInput: { spin: true, stack: true } });

    expect(container.querySelector(`.${PARTS.AUX}`)).not.toBeNull();
  });

  test("children snippet replaces the default input", () => {
    const children = createRawSnippet(() => ({ render: () => "<span data-testid='replacement'>custom</span>" }));
    const { container, getByTestId } = render(NumberField, { children });

    expect(getByTestId("replacement")).toBeInTheDocument();
    expect(container.querySelector("input")).toBeNull();
  });
});

describe("NumberField value binding", () => {
  test("syncs number | undefined from input to bindable value", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined });
    const { container } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "7");
    expect(props.value).toBe(7);

    await user.clear(input);
    expect(props.value).toBeUndefined();
  });

  test("renders programmatic value changes", async () => {
    const props = $state({ value: 3 as number | undefined });
    const { container, rerender } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveValue("3");
    props.value = 8;
    await rerender(props);
    expect(input).toHaveValue("8");
  });
});

describe("NumberField variant state machine", () => {
  test("starts neutral and becomes active on valid change", async () => {
    const user = userEvent.setup();
    const props = $state({ value: undefined as number | undefined, variant: VARIANT.NEUTRAL });
    const { container } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await user.type(input, "7");
    await fireEvent.change(input);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("treats 0 as non-empty", async () => {
    const props = $state({ value: 0 as number | undefined, variant: VARIANT.NEUTRAL });
    const { container } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await fireEvent.change(input);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("shows validation message, wires aria error, clears, and returns empty to neutral", async () => {
    const user = userEvent.setup();
    const errmsg = "Too low";
    const props = $state({
      value: undefined as number | undefined,
      variant: VARIANT.NEUTRAL,
      bottom,
      validations: [({ value }: { value: number | undefined }) => (value !== undefined && value < 5 ? errmsg : null)],
    });
    const { container, getByRole } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "3");
    await fireEvent.change(input);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent(errmsg);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleErrorMessage(errmsg);

    await user.clear(input);
    await user.type(input, "7");
    await fireEvent.change(input);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(input).not.toHaveAttribute("aria-invalid");

    await user.clear(input);
    await fireEvent.change(input);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    const invalidProps = $state({
      value: 3 as number | undefined,
      variant: VARIANT.NEUTRAL,
      bottom,
      validations: props.validations,
    });
    const invalidRender = render(NumberField, invalidProps);
    const invalidInput = invalidRender.container.querySelector("input") as HTMLInputElement;
    await tick();
    await fireEvent.invalid(invalidInput);
    expect(invalidProps.variant).toBe(VARIANT.INACTIVE);
    expect(invalidInput).toHaveAccessibleErrorMessage(errmsg);
  });
});

describe("NumberField a11y ids", () => {
  test("wires describedby and errormessage ids", async () => {
    const props = $state({
      bottom,
      value: 1 as number | undefined,
      validations: [() => "Invalid number"],
      variant: VARIANT.NEUTRAL,
    });
    const { container, getByRole } = render(NumberField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const desc = container.querySelector(`.${PARTS.BOTTOM}`) as HTMLDivElement;

    expect(input).toHaveAttribute("aria-describedby", desc.id);
    await fireEvent.change(input);
    const alert = getByRole("alert");
    expect(input).toHaveAttribute("aria-errormessage", alert.id);
  });
});
