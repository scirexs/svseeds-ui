import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import CheckField from "#svs/_CheckField.svelte";
import { PARTS, VARIANT } from "#svs/core";

const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const options = new Map([
  ["option1", "Option 1"],
  ["option2", "Option 2"],
  ["option3", "Option 3"],
]);
const auxfn = createRawSnippet(
  (
    values: () => string[],
    variant: () => string,
    elements: () => HTMLInputElement[],
  ) => {
    return { render: () => `<span data-testid="${auxid}">${variant()},${values().length},${elements().length}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const attachfn = () => {};

  test("w/ options only", () => {
    const props = { options };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });
  });

  test("w/ options and multiple=false (radio)", () => {
    const props = { options, multiple: false };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const radios = getAllByRole("radio") as HTMLInputElement[];
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.getAttribute("role")).toBe("radiogroup");
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => {
      expect(radio).toHaveAttribute("type", "radio");
      expect(radio).toHaveAttribute("name");
    });
  });

  test("w/ label", () => {
    const props = { options, label };
    const { getAllByRole, getByText } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra", () => {
    const props = { options, label, extra };
    const { getAllByRole, getByText } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { options, label, extra, aux };
    const { getAllByRole, getByTestId, getByText } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(aux).toHaveBeenCalled();
  });

  test("w/ bottom", () => {
    const props = { options, bottom };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
    expect(middle).toHaveAccessibleDescription(bottom);
  });
  test("w/ reserved bottom", () => {
    const props = { options, reserve: true };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const middle = getAllByRole("group")[1] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass("svs-check-field", PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(middle).not.toHaveAttribute("aria-describedby");
  });

  test("w/ bottom and multiple=false", () => {
    const props = { options, bottom, multiple: false };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    const middle = whole.querySelector(`[role="radiogroup"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
    expect(middle).toHaveAccessibleDescription(bottom);
  });

  test("w/ bottom of attach input", () => {
    const props = { options, bottom, attach: attachfn };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
    expect(middle).toHaveAccessibleDescription(bottom);
  });

  test("w/ blank string", () => {
    const props = { options, label: " ", bottom: " " };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ flip=true", () => {
    const props = { options, bottom, flip: true };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.firstElementChild as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(whole.lastElementChild).toBe(middle);
  });

  test("w/ empty options", () => {
    const { queryByRole } = render(CheckField, { options: new Map() });
    expect(queryByRole("group")).toBeNull();
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-check-field";
  const errmsg = "invalid";
  const validationFn = ({ value }: { value: string[] }) => (value.length === 0 ? errmsg : "");
  const validations = [validationFn];

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ options, reserve: true, variant: VARIANT.NEUTRAL, validations, values: [] });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const middle = getAllByRole("group")[1] as HTMLDivElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(middle).not.toHaveAttribute("aria-describedby");

    await fireEvent.invalid(checkboxes[0]);
    expect(getByRole("alert")).toBe(btm);
    expect(btm).toHaveTextContent(errmsg);

    await user.click(checkboxes[0]);
    expect(whole.lastElementChild).toBe(btm);
    expect(btm).not.toHaveAttribute("role");
    expect(btm).toHaveTextContent("");
  });

  test("w/ default values", () => {
    const values = ["option1", "option3"];
    const props = { options, values };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  test("w/ default values for radio", () => {
    const values = ["option2"];
    const props = { options, values, multiple: false };
    const { getAllByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  test("w/ specify ignored attrs", () => {
    const props = {
      options,
      value: "v",
      class: "c",
      type: "hidden",
      name: "custom_name",
      onchange: vi.fn(),
    } as any;
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toHaveAttribute("value", "v"); // per-option value wins
      expect(checkbox).toHaveClass("c"); // class merged onto each input (same as ...rest)
      expect(checkbox).not.toHaveAttribute("type", "hidden"); // controlled (checkbox)
      expect(checkbox).toHaveAttribute("name", "custom_name"); // name prop applied
    });
  });

  test("w/ specify major attrs", () => {
    const props = {
      options,
      required: true,
      disabled: true,
      "data-testid": "test-input",
    };
    const { getAllByTestId } = render(CheckField, props);
    const checkboxes = getAllByTestId("test-input") as HTMLInputElement[];
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute("required");
      expect(checkbox).toHaveAttribute("disabled");
    });
  });

  test("major state transition with checkboxes", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    // Initially neutral
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // Check first option
    await user.click(checkboxes[0]);
    expect(props.values).toContain("option1");
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: ["option1"], validity: expect.anything(), element: checkboxes[0] }),
    );
    expect(props.variant).toBe(VARIANT.ACTIVE);

    // Uncheck to trigger validation error
    await user.click(checkboxes[0]);
    expect(props.values).toHaveLength(0);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // Trigger validation error
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(checkboxes[0]).toHaveAttribute("aria-invalid", "true");
    expect(checkboxes[0]).toHaveAccessibleErrorMessage(errmsg);
  });

  test("checkboxes become inactive immediately with non-empty invalid values", async () => {
    const max1 = ({ value }: { value: string[] }) => (value.length > 1 ? "too many" : "");
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [max1],
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.click(checkboxes[1]);
    expect(props.values).toEqual(["option1", "option2"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("too many");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAccessibleErrorMessage("too many");
    });

    await user.click(checkboxes[1]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();

    await user.click(checkboxes[0]);
    expect(props.values).toEqual([]);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("radios become inactive immediately with non-empty invalid values", async () => {
    const noOption2 = ({ value }: { value: string[] }) => (value[0] === "option2" ? "bad option" : "");
    const props = $state({
      options,
      multiple: false,
      variant: VARIANT.NEUTRAL,
      validations: [noOption2],
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    const middle = getByRole("radiogroup") as HTMLDivElement;

    await user.click(radios[1]);
    expect(props.values).toEqual(["option2"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(middle).toHaveAttribute("aria-invalid", "true");
    expect(middle).toHaveAccessibleErrorMessage("bad option");
    radios.forEach((radio) => {
      expect(radio).not.toHaveAttribute("aria-invalid");
      expect(radio).not.toHaveAttribute("aria-errormessage");
    });

    await user.click(radios[0]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(middle).not.toHaveAttribute("aria-invalid");
  });

  test("neutral guard keeps prefilled invalid values neutral until interaction", async () => {
    const max1 = ({ value }: { value: string[] }) => (value.length > 1 ? "too many" : "");
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [max1],
      values: ["option1", "option2"],
    });
    const user = userEvent.setup();
    const { getAllByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(queryByRole("alert")).toBeNull();

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option2"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("major state transition with radio buttons", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      options,
      multiple: false,
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    const middle = getByRole("radiogroup") as HTMLDivElement;

    // Initially neutral
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // For radio buttons, aria-invalid is on the group
    await fireEvent.invalid(radios[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(middle).toHaveAttribute("aria-invalid", "true");

    // Select first option
    await user.click(radios[0]);
    expect(props.values).toEqual(["option1"]);
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: ["option1"], validity: expect.anything(), element: radios[0] }),
    );
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("checkbox constraints block adding a second value but allow removing", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      constraints: [({ values }: { values: string[] }) => (values.length >= 1 ? "max" : null)],
      values: [] as string[],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    expect(checkboxes[0]).toBeChecked();

    await user.click(checkboxes[1]);
    expect(props.values).toEqual(["option1"]);
    expect(checkboxes[1]).not.toBeChecked();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("max");

    await user.click(checkboxes[0]);
    expect(props.values).toEqual([]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  test("checkbox constraints can block a specific candidate", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      constraints: [({ value }: { value: string }) => (value === "option2" ? "no opt2" : null)],
      values: [] as string[],
    });
    const user = userEvent.setup();
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await user.click(checkboxes[1]);
    expect(props.values).toEqual([]);
    expect(checkboxes[1]).not.toBeChecked();
    expect(getByRole("alert")).toHaveTextContent("no opt2");

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    expect(checkboxes[0]).toBeChecked();
  });

  test("null validation result is valid", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [() => null],
      values: [] as string[],
    });
    const user = userEvent.setup();
    const { getAllByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await user.click(checkboxes[0]);

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();
  });

  test("w/ required and no validations", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      required: true,
      values: [],
    });
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await fireEvent.invalid(checkboxes[0]);
    getByRole("alert") as HTMLDivElement;
    expect(checkboxes[0]).toHaveAttribute("aria-invalid", "true");
    expect(checkboxes[0]).toHaveAccessibleErrorMessage();
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("checkbox required group is invalid until one option is selected", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      required: true,
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeRequired();
      expect(checkbox.checkValidity()).toBe(false);
    });

    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.click(checkboxes[0]);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeRequired();
      expect(checkbox.checkValidity()).toBe(true);
    });
  });

  test("radio required remains native after selection", async () => {
    const props = $state({
      options,
      multiple: false,
      required: true,
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];

    radios.forEach((radio) => {
      expect(radio).toBeRequired();
    });

    await user.click(radios[1]);
    radios.forEach((radio) => {
      expect(radio).toBeRequired();
      expect(radio.checkValidity()).toBe(true);
    });
  });

  test("satisfied checkbox required is not spread statically", () => {
    const props = {
      options,
      required: true,
      values: ["option1"],
    };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeRequired();
    });
  });

  test("w/ required and custom validations", async () => {
    const props = $state({
      options,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      required: true,
      values: [],
    });
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await fireEvent.invalid(checkboxes[0]);
    getByRole("alert") as HTMLDivElement;
    expect(checkboxes[0]).toHaveAttribute("aria-invalid", "true");
    expect(checkboxes[0]).toHaveAccessibleErrorMessage(errmsg);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("w/ custom events used internally", async () => {
    const onchange = vi.fn();
    const oninvalid = vi.fn();
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations,
      onchange,
      oninvalid,
      required: true,
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await fireEvent.invalid(checkboxes[0]);
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.click(checkboxes[0]);
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("oninvalid prevents native event default", async () => {
    const oninvalid = vi.fn();
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      oninvalid,
      required: true,
      values: [],
    });
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const ev = new Event("invalid", { cancelable: true });
    const preventDefault = vi.spyOn(ev, "preventDefault");

    await fireEvent(checkboxes[0], ev);
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("values binding accumulates and removes checked options", async () => {
    const props = $state({
      options,
      values: [],
    });
    const user = userEvent.setup();
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);

    await user.click(checkboxes[2]);
    expect(props.values).toEqual(["option1", "option3"]);

    await user.click(checkboxes[0]);
    expect(props.values).toEqual(["option3"]);
  });

  test("elements binding is populated", () => {
    const props = $state({
      options,
      elements: [] as HTMLInputElement[],
    });

    render(CheckField, props);
    expect(props.elements).toHaveLength(options.size);
    props.elements.forEach((element) => {
      expect(element).toBeInstanceOf(HTMLInputElement);
    });
  });

  test("attach is applied to each input", () => {
    const attach = vi.fn();
    render(CheckField, { options, attach });
    expect(attach).toHaveBeenCalledTimes(options.size);
  });

  test("name is shared across the group", async () => {
    const user = userEvent.setup();
    const defaultProps = $state({ options, values: [] });
    const { getAllByRole, unmount } = render(CheckField, defaultProps);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const generatedName = checkboxes[0].name;

    expect(generatedName).toBeTruthy();
    checkboxes.forEach((checkbox) => {
      expect(checkbox.name).toBe(generatedName);
    });
    unmount();

    const radioProps = $state({ options, multiple: false, name: "custom_name", values: [] });
    const { getAllByRole: getAllRadioByRole } = render(CheckField, radioProps);
    const radios = getAllRadioByRole("radio") as HTMLInputElement[];

    radios.forEach((radio) => {
      expect(radio.name).toBe("custom_name");
    });

    await user.click(radios[0]);
    await user.click(radios[1]);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
    expect(radioProps.values).toEqual(["option2"]);
  });

  test("default class of each variant", async () => {
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      values: [],
    });
    const user = userEvent.setup();
    const { getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = checkboxes[0].parentElement?.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(lbl).toHaveClass(seed, PARTS.LABEL);
    expect(ext).toHaveClass(seed, PARTS.EXTRA);
    expect(auxdv).toHaveClass(seed, PARTS.AUX);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);

    // Check first checkbox and verify active state
    await user.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.ACTIVE);

    // Uncheck and trigger invalid state
    await user.click(checkboxes[0]);
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);
  });

  test("w/ string styling class of each variant", async () => {
    const clsid = "style_id";
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      styling: clsid,
      values: [],
    });
    const user = userEvent.setup();
    const { getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = groups[1] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(top).toHaveClass(clsid, PARTS.TOP);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM);

    await user.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
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
      main: dynObj,
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
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      styling,
      values: [],
    });
    const user = userEvent.setup();
    const { getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = groups[1] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(top).toHaveClass(dynObj.base, dynObj.neutral);
    expect(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    expect(ext).toHaveClass(dynObj.base, dynObj.neutral);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(middle).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).toHaveClass(dynObj.base, dynObj.neutral);

    await user.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(top).toHaveClass(dynObj.base, dynObj.active);
    expect(lbl).toHaveClass(dynObj.base, dynObj.active);
    expect(ext).toHaveClass(dynObj.base, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.active);
    expect(middle).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).toHaveClass(dynObj.base, dynObj.active);

    await user.click(checkboxes[0]);
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.inactive);
    expect(top).toHaveClass(dynObj.base, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.base, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.base, dynObj.inactive);
  });

  test("individual checkbox label styling", () => {
    const props = { options, values: ["option1"] };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const labels = checkboxes.map((cb) => cb.parentElement);

    // First checkbox is checked (active), others are neutral
    expect(labels[0]).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    expect(labels[1]).toHaveClass(seed, PARTS.MAIN);
    expect(labels[2]).toHaveClass(seed, PARTS.MAIN);

    // Verify input and span elements within labels
    labels.forEach((label, index) => {
      const input = label?.querySelector("input");
      const span = label?.querySelector("span");
      const expectedState = index === 0 ? VARIANT.ACTIVE : VARIANT.NEUTRAL;

      expect(input).toHaveClass(seed, PARTS.LEFT, expectedState);
      expect(span).toHaveClass(seed, PARTS.RIGHT, expectedState);
    });
  });
});
