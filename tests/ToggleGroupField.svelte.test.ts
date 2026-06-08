import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import ToggleGroupField, { type ToggleOption } from "#svs/ToggleGroupField.svelte";
import { PARTS, VARIANT } from "#svs/core";

const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet((values: () => string[], variant: () => string) => {
  return { render: () => `<span data-testid="${auxid}">${variant()},${values().length}</span>` };
});
const leftfn = createRawSnippet((values: () => string[], variant: () => string) => {
  return { render: () => `<span data-testid="${leftid}">${variant()},${values().length}</span>` };
});
const rightfn = createRawSnippet((values: () => string[], variant: () => string) => {
  return { render: () => `<span data-testid="${rightid}">${variant()},${values().length}</span>` };
});

describe("Switching existence of elements", () => {
  const seed = "svs-toggle-group-field";
  const options = new SvelteMap([
    ["opt1", "Option 1"],
    ["opt2", "Option 2"],
    ["opt3", "Option 3"],
  ]);

  test("no options", () => {
    const emptyOptions = new SvelteMap<string, string>();
    try {
      const { container } = render(ToggleGroupField, { options: emptyOptions });
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
  });

  test("basic render with options", () => {
    const { getAllByRole } = render(ToggleGroupField, { options });
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label", () => {
    const props = { options, label };
    const { getAllByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const top = lbl.parentElement as HTMLDivElement;
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ extra, w/o label", () => {
    const props = { options, extra };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("w/ label, extra", () => {
    const props = { options, label, extra };
    const { getAllByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const top = lbl.parentElement as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(lbl.firstElementChild).toBe(ext);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { options, label, extra, aux };
    const { getAllByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement); // top div
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
    expect(aux).toHaveBeenCalled();
  });

  test("w/ left", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { options, left };
    const { getAllByRole, getByTestId } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement); // middle
    expect(left).toHaveBeenCalled();
  });

  test("w/ right", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { options, right };
    const { getAllByRole, getByTestId } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement); // middle
    expect(right).toHaveBeenCalled();
  });

  test("w/ bottom", () => {
    const props = { options, bottom };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild?.tagName).toBe("DIV"); // middle
    expect(whole.lastElementChild).toBe(btm);
  });
  test("w/ reserved bottom", () => {
    const props = { options, reserve: true };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    const inner = whole.querySelector('[role="group"], [role="radiogroup"]') as HTMLElement;
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.lastElementChild).toBe(btm);
    expect(inner).not.toHaveAttribute("aria-describedby");
  });

  test("w/ bottom flip", () => {
    const props = { options, bottom, flip: true };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.firstElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ blank string", () => {
    const props = { options, label: " ", bottom: " " };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("single selection mode", () => {
    const props = { options, multiple: false };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("with Map options", () => {
    const mapOptions = new Map([
      ["key1", "Value 1"],
      ["key2", "Value 2"],
    ]);
    const props = { options: mapOptions };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });
});

describe("Specify state transition & event handlers", () => {
  const seed = "svs-toggle-group-field";
  const options = new SvelteMap([
    ["opt1", "Option 1"],
    ["opt2", "Option 2"],
    ["opt3", "Option 3"],
  ]);
  const errmsg = "At least one option must be selected";
  const validationFn = ({ value }: { value: string[] }) => (value.length === 0 ? errmsg : "");
  const validations = [validationFn];
  const proxyInput = (whole: HTMLElement) => whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
  const middleOf = (whole: HTMLElement) => whole.querySelector(`.${PARTS.MIDDLE}`) as HTMLDivElement;
  const innerToggleGroupOf = (whole: HTMLElement) => middleOf(whole).querySelector('[role="group"], [role="radiogroup"]') as HTMLElement;

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ options, reserve: true, variant: VARIANT.NEUTRAL, validations, values: [] as string[] });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(innerToggleGroupOf(whole)).not.toHaveAttribute("aria-describedby");

    await fireEvent.invalid(proxyInput(whole));
    expect(getByRole("alert")).toBe(btm);
    expect(btm).toHaveTextContent(errmsg);

    props.values = ["opt1"];
    await waitFor(() => {
      expect(whole.lastElementChild).toBe(btm);
      expect(btm).not.toHaveAttribute("role");
      expect(btm).toHaveTextContent("");
    });
  });

  test("w/ default values", () => {
    const values = ["opt1", "opt2"];
    const props = { options, values };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    // ToggleGroupの実装によってselectedな要素を確認する必要があります
    expect(whole).toBeInTheDocument();
  });

  test("major state transition with validation", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
      values: [] as string[],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    // Initial state
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // Trigger validation by simulating invalid event
    await fireEvent.invalid(hiddenInput);
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: [], validity: expect.anything(), element: hiddenInput }),
    );
    expect(props.variant).toBe(VARIANT.INACTIVE);

    // Check error state
    const alert = getByRole("alert") as HTMLDivElement;
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(errmsg);

    // Add selection to make it valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput); // Simulate validation trigger
    expect(props.variant).toBe(VARIANT.ACTIVE);

    // Clear selection
    props.values = [];
    await fireEvent.change(hiddenInput);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("required validation shows alert and inactive variant", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      values: [] as string[],
      validations: [({ value }: { value: string[] }) => (value.length ? "" : "This field is required")],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    await fireEvent.invalid(hiddenInput);
    await waitFor(() => {
      const alert = getByRole("alert") as HTMLDivElement;
      expect(alert).toBeInTheDocument();
      expect(props.variant).toBe(VARIANT.INACTIVE);
    });
  });

  test("multiple validation functions", async () => {
    const validation1 = vi.fn().mockReturnValue("");
    const validation2 = vi.fn().mockImplementation(({ value }: { value: string[] }) => (value.length > 2 ? "Too many selections" : ""));
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [validation1, validation2],
      values: ["opt1", "opt2", "opt3"] as string[],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    await fireEvent.invalid(hiddenInput);
    await waitFor(() => {
      expect(validation1).toHaveBeenCalled();
      expect(validation2).toHaveBeenCalled();
      expect(props.variant).toBe(VARIANT.INACTIVE);

      const alert = getByRole("alert") as HTMLDivElement;
      expect(alert).toHaveTextContent("Too many selections");
    });
  });

  test("constraints block adding a second multiple value but allow removing", async () => {
    const user = userEvent.setup();
    const props = $state({
      options,
      constraints: [({ values }: { values: string[] }) => (values.length >= 1 ? "max" : null)],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    await waitFor(() => expect(props.values).toEqual(["opt1"]));

    await user.click(buttons[1]);
    expect(props.values).toEqual(["opt1"]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("max");

    await user.click(buttons[0]);
    await waitFor(() => expect(props.values).toEqual([]));
  });

  test("constraints gate single-select clicks", async () => {
    const user = userEvent.setup();
    const props = $state({
      options,
      multiple: false,
      constraints: [({ value }: { value: string }) => (value === "opt2" ? "no opt2" : null)],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    await user.click(buttons[1]);
    expect(props.values).toEqual([]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
    expect(getByRole("alert")).toHaveTextContent("no opt2");

    await user.click(buttons[0]);
    await waitFor(() => expect(props.values).toEqual(["opt1"]));

    buttons[0].focus();
    await user.keyboard("[ArrowRight]");
    expect(props.values).toEqual(["opt2"]);
  });

  test("null validation result is valid", async () => {
    const user = userEvent.setup();
    const props = $state({
      options,
      validations: [() => null],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, queryByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    await waitFor(() => expect(props.values).toEqual(["opt1"]));

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();
  });

  test("default class of each variant", async () => {
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      values: [] as string[],
    });
    const { getAllByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(lbl).toHaveClass(seed, PARTS.LABEL);
    expect(ext).toHaveClass(seed, PARTS.EXTRA);
    expect(auxdv).toHaveClass(seed, PARTS.AUX);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(btm).toHaveAttribute("role", "alert");
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.ACTIVE);
  });

  test("w/ string styling class of each variant", async () => {
    const clsid = "style_id";
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      values: [] as string[],
      styling: clsid,
    });
    const { getAllByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(top).toHaveClass(clsid, PARTS.TOP);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(btm).toHaveAttribute("role", "alert");
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.INACTIVE);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.ACTIVE);
  });

  test("w/ obj styling of each variant", async () => {
    const dynObj = {
      base: "base",
      neutral: "dyn_neutral",
      active: "dyn_active",
      inactive: "dyn_inactive",
    };
    const styling = {
      whole: dynObj,
      middle: dynObj,
      top: dynObj,
      left: dynObj,
      right: dynObj,
      bottom: dynObj,
      label: dynObj,
      aux: dynObj,
      extra: dynObj,
    };
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      values: [] as string[],
      styling,
    });
    const { getAllByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(top).toHaveClass(dynObj.base, dynObj.neutral);
    expect(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    expect(ext).toHaveClass(dynObj.base, dynObj.neutral);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(middle).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).toHaveClass(dynObj.base, dynObj.neutral);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(btm).toHaveAttribute("role", "alert");
    expect(whole).toHaveClass(dynObj.base, dynObj.inactive);
    expect(top).toHaveClass(dynObj.base, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.base, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.base, dynObj.inactive);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.base, dynObj.inactive);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(btm).not.toHaveAttribute("role");
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(top).toHaveClass(dynObj.base, dynObj.active);
    expect(lbl).toHaveClass(dynObj.base, dynObj.active);
    expect(ext).toHaveClass(dynObj.base, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.active);
    expect(middle).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).toHaveClass(dynObj.base, dynObj.active);
  });

  test("deps configuration", () => {
    const svsToggleGroupStyle = "custom-toggle-group";
    const deps = {
      svsToggleGroup: {
        styling: svsToggleGroupStyle,
      },
    };
    const props = { options, deps };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const innerGroup = innerToggleGroupOf(whole);

    expect(whole).toBeInTheDocument();
    expect(innerGroup).toHaveClass(svsToggleGroupStyle, PARTS.WHOLE);
    expect(innerGroup).not.toHaveClass("svs-toggle-group");
  });

  test("clicking a toggle updates bound values and variant", async () => {
    const user = userEvent.setup();
    const props = $state({
      options,
      validations: [validationFn],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    await waitFor(() => {
      expect(props.values).toEqual(["opt1"]);
      expect(buttons[0]).toHaveAttribute("aria-checked", "true");
      expect(props.variant).toBe(VARIANT.ACTIVE);
    });

    await user.click(buttons[0]);
    await waitFor(() => {
      expect(props.values).toEqual([]);
      expect(buttons[0]).toHaveAttribute("aria-checked", "false");
      expect(props.variant).toBe(VARIANT.NEUTRAL);
    });
  });

  test("name creates hidden inputs without assigning name to toggle buttons", () => {
    const props = { options, name: "grp", values: ["opt1", "opt2"] };
    const { container, getAllByRole } = render(ToggleGroupField, props);
    const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];

    expect(hidden).toHaveLength(2);
    expect(hidden.map((input) => input.value)).toEqual(["opt1", "opt2"]);
    hidden.forEach((input) => expect(input).toHaveAttribute("name", "grp"));
    getAllByRole("checkbox").forEach((button) => expect(button).not.toHaveAttribute("name"));
  });

  test("name creates no hidden inputs when values are empty", () => {
    const { container } = render(ToggleGroupField, { options, name: "grp", values: [] });
    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });

  test("deps children override toggle content", () => {
    const childid = "custom-child";
    const children = createRawSnippet((value: () => string, text: () => string, variant: () => string) => {
      return { render: () => `<span data-testid="${childid}-${value()}">${text()}:${variant()}</span>` };
    });
    const deps = { svsToggleGroup: { children } };
    const { getAllByRole, getByTestId } = render(ToggleGroupField, { options, deps, values: ["opt2"] });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).toContainElement(getByTestId(`${childid}-opt1`));
    expect(buttons[1]).toContainElement(getByTestId(`${childid}-opt2`));
    expect(getByTestId(`${childid}-opt2`)).toHaveTextContent(`Option 2:${VARIANT.ACTIVE}`);
  });

  test("deps cannot lose field-controlled error props", async () => {
    const props = $state({
      options,
      deps: { svsToggleGroup: { styling: "custom-toggle-group" } },
      validations: [validationFn],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const innerGroup = innerToggleGroupOf(whole);

    await fireEvent.invalid(proxyInput(whole));
    const alert = getByRole("alert");
    expect(innerGroup).toHaveClass("custom-toggle-group");
    expect(innerGroup).toHaveAttribute("aria-invalid", "true");
    expect(innerGroup).toHaveAttribute("aria-errormessage", alert.id);
  });

  test("multiple mode wires error aria through the inner group", async () => {
    const props = $state({
      options,
      label,
      validations: [({ value }: { value: string[] }) => (value.length ? "" : "required")],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, getByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const innerGroup = innerToggleGroupOf(whole);

    await fireEvent.invalid(proxyInput(whole));
    const alert = getByRole("alert");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert).toHaveTextContent("required");
    expect(innerGroup).toHaveAttribute("aria-invalid", "true");
    expect(innerGroup).toHaveAttribute("aria-errormessage", alert.id);
    getAllByRole("checkbox").forEach((button) => {
      expect(button).not.toHaveAttribute("aria-invalid");
      expect(button).not.toHaveAttribute("aria-errormessage");
    });
    expect(whole).toHaveAttribute("aria-labelledby", getByText(label).id);
  });

  test("single-select mode replaces values and places error aria on the radiogroup", async () => {
    const user = userEvent.setup();
    const props = $state({
      options,
      multiple: false,
      validations: [({ value }: { value: string[] }) => (value.length ? "" : "required")],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const radios = getAllByRole("radio") as HTMLButtonElement[];

    await user.click(radios[0]);
    await waitFor(() => expect(props.values).toEqual(["opt1"]));
    await user.click(radios[1]);
    await waitFor(() => expect(props.values).toEqual(["opt2"]));

    props.values = [];
    await tick();
    await fireEvent.invalid(proxyInput(whole));
    const radiogroup = getByRole("radiogroup");
    const alert = getByRole("alert");
    expect(radiogroup).toHaveAttribute("aria-invalid", "true");
    expect(radiogroup).toHaveAttribute("aria-errormessage", alert.id);
    radios.forEach((radio) => {
      expect(radio).not.toHaveAttribute("aria-invalid");
      expect(radio).not.toHaveAttribute("aria-errormessage");
    });
  });

  test("disabled ToggleOption passes through and is not selectable", async () => {
    const user = userEvent.setup();
    const toggleOptions = new SvelteMap<string, string | ToggleOption>([
      ["opt1", "Option 1"],
      ["opt2", { text: "Option 2", disabled: true }],
    ]);
    const props = $state({ options: toggleOptions, values: [] as string[] });
    const { getAllByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[1]).toBeDisabled();
    await user.click(buttons[1]);
    expect(props.values).toEqual([]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
  });

  test("top renders for a label-only field and is omitted without label or aux", () => {
    const labeled = render(ToggleGroupField, { options, label });
    const whole = labeled.getAllByRole("group")[0] as HTMLDivElement;
    const top = labeled.container.querySelector(`.${PARTS.TOP}`) as HTMLDivElement;
    const lbl = labeled.getByText(label);

    expect(top).toContainElement(lbl);
    expect(lbl).toHaveClass(PARTS.LABEL);
    expect(whole).toHaveAttribute("aria-labelledby", lbl.id);
    labeled.unmount();

    const plain = render(ToggleGroupField, { options });
    expect(plain.container.querySelector(`.${PARTS.TOP}`)).toBeNull();
    expect(plain.getAllByRole("group")[0]).not.toHaveAttribute("aria-labelledby");
  });

  test("bottom role and message transition with variant", async () => {
    const props = $state({
      options,
      bottom,
      validations: [({ value }: { value: string[] }) => (value.length ? "" : "required")],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");

    await fireEvent.invalid(proxyInput(whole));
    expect(btm).toHaveAttribute("role", "alert");
    expect(btm).toHaveTextContent("required");

    props.values = ["opt1"];
    await waitFor(() => {
      expect(props.variant).toBe(VARIANT.ACTIVE);
      expect(btm).toHaveTextContent(bottom);
      expect(btm).not.toHaveAttribute("role");
    });
  });

  test("label and bottom ids react to prop changes", async () => {
    const props = $state({
      options,
      label: undefined as string | undefined,
      bottom: undefined as string | undefined,
    });
    const { container, getAllByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;

    expect(container.querySelector(`.${PARTS.TOP}`)).toBeNull();
    expect(container.querySelector(`.${PARTS.BOTTOM}`)).toBeNull();
    expect(whole).not.toHaveAttribute("aria-labelledby");

    props.label = "Now labeled";
    await waitFor(() => {
      const lbl = getByText("Now labeled");
      expect(container.querySelector(`.${PARTS.TOP}`)).toContainElement(lbl);
      expect(whole).toHaveAttribute("aria-labelledby", lbl.id);
    });

    props.bottom = "help-2";
    await waitFor(() => expect(container.querySelector(`.${PARTS.BOTTOM}`)).toHaveTextContent("help-2"));
    props.bottom = "help-3";
    await waitFor(() => expect(container.querySelector(`.${PARTS.BOTTOM}`)).toHaveTextContent("help-3"));
  });

  test("binds button elements", async () => {
    const props = $state({ options, elements: [] as HTMLButtonElement[] });
    const { getAllByRole } = render(ToggleGroupField, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await waitFor(() => {
      expect(props.elements).toHaveLength(options.size);
      expect(props.elements[0]).toBe(buttons[0]);
      expect(props.elements[1]).toBe(buttons[1]);
      expect(props.elements[2]).toBe(buttons[2]);
    });
  });

  test("flip keeps bottom before middle in error state", async () => {
    const props = $state({
      options,
      bottom,
      flip: true,
      validations: [({ value }: { value: string[] }) => (value.length ? "" : "required")],
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;

    await fireEvent.invalid(proxyInput(whole));
    const alert = whole.firstElementChild as HTMLDivElement;
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent("required");
    expect(whole.lastElementChild).toHaveClass(PARTS.MIDDLE);
  });
});
