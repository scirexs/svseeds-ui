import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import SelectField from "../lib/_svseeds/_SelectField.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

type SelectFieldElement = HTMLSelectElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet(
  (
    status: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${auxid}">${status().length},${value().length},${element?.toString()}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    status: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${status().length},${value().length},${element?.toString()}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    status: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${status().length},${value().length},${element?.toString()}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const options = new SvelteMap([["value1", "Option 1"], ["value2", "Option 2"], ["value3", "Option 3"]]);
  const actionfn = () => {
    return {};
  };

  test("minimum props (options only)", () => {
    const { getByRole } = render(SelectField, { options });
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main.tagName).toBe("SELECT");
    expect(main.children).toHaveLength(3);
  });
  test("w/ Map options", () => {
    const mapOptions = new Map([["val1", "Text 1"], ["val2", "Text 2"]]);
    const { getByRole } = render(SelectField, { options: mapOptions });
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main.children).toHaveLength(2);
    const option1 = main.children[0] as HTMLOptionElement;
    const option2 = main.children[1] as HTMLOptionElement;
    expect(option1.value).toBe("val1");
    expect(option1.textContent).toBe("Text 1");
    expect(option2.value).toBe("val2");
    expect(option2.textContent).toBe("Text 2");
  });
  test("w/ label", () => {
    const props = { options, label };
    const { getByRole, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label of action select", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const props = { options, label, action };
    const { getByRole, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(action).toHaveBeenCalled();
  });
  test("w/ extra, w/o label", () => {
    const props = { options, extra };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ label, extra", () => {
    const props = { options, label, extra };
    const { getByRole, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const lbl = getByText(label);
    within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { options, label, extra, aux };
    const { getByRole, getByTestId, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(aux).toHaveBeenCalled();
  });
  test("w/ left", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { options, left };
    const { getByRole, getByTestId } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement);
    expect(left).toHaveBeenCalled();
  });
  test("w/ right", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { options, right };
    const { getByRole, getByTestId } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement);
    expect(right).toHaveBeenCalled();
  });
  test("w/ bottom", () => {
    const props = { options, bottom };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = getByRole("status") as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ bottom of action select", () => {
    const props = { options, bottom, action: actionfn };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = getByRole("status") as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ blank string", () => {
    const props = { options, label: " ", bottom: " " };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ descFirst", () => {
    const props = { options, bottom, descFirst: true };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = getByRole("status") as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(main).toHaveAccessibleDescription(bottom);
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-select-field";
  const options = new SvelteMap([["val1", "Option 1"], ["val2", "Option 2"]]);
  const errmsg = "invalid selection";
  const validationFn = (value: string) => (value === "val1" ? errmsg : "");
  const validations = [validationFn];

  test("w/ default value", () => {
    const value = "val2";
    const props = { options, value };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).toHaveValue(value);
    const selectedOption = main.querySelector("option[selected]") as HTMLOptionElement;
    expect(selectedOption.value).toBe(value);
    expect(selectedOption.textContent).toBe("Option 2");
  });
  test("w/ specify id", () => {
    const id = "id_foo";
    const props = { options, attributes: { id } };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).toHaveAttribute("id", id);
  });
  test("w/ specify ignored attrs", () => {
    const props = { options, attributes: { value: "ignored", class: "ignored-class" } };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).not.toHaveValue("ignored");
    expect(main).not.toHaveAttribute("class", "ignored-class");
  });
  test("w/ specify major attrs", () => {
    const props = { options, attributes: { name: "select-name", required: true, disabled: true } };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).toHaveAttribute("name", "select-name");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("disabled");
  });

  test("major state transition", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const options = new SvelteMap([["", ""], ["val1", "Option 1"], ["val2", "Option 2"]]);
    const props = $state({
      options,
      status: STATE.NEUTRAL,
      validations: [mockValidation],
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    expect(props.status).toBe(STATE.NEUTRAL);

    await user.selectOptions(main, "val1");
    expect(mockValidation).toHaveBeenCalled();
    expect(props.status).toBe(STATE.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);

    await user.selectOptions(main, "val2");
    expect(props.status).toBe(STATE.ACTIVE);

    await user.selectOptions(main, "");
    expect(props.status).toBe(STATE.NEUTRAL);
  });
  test("w/ required and no validations", async () => {
    const optionsWithEmpty = new SvelteMap([["", "Select Option"], ["val1", "Option 1"]]);
    const props = $state({
      options: optionsWithEmpty,
      status: STATE.NEUTRAL,
      attributes: { required: true },
    });
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    await fireEvent.invalid(main);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage();
    expect(props.status).toBe(STATE.INACTIVE);
  });
  test("w/ required and custom validations", async () => {
    const props = $state({
      options,
      bottom,
      status: STATE.NEUTRAL,
      validations: [(value: string) => value === "" ? "required" : ""],
      attributes: { required: true },
    });
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    await fireEvent.invalid(main);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage("required");
    expect(props.status).toBe(STATE.INACTIVE);
  });
  test("w/ custom events used internally", async () => {
    const oninvalid = vi.fn();
    const props = $state({
      options,
      status: STATE.NEUTRAL,
      validations,
      attributes: { oninvalid, required: true },
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    await fireEvent.invalid(main);
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.status).toBe(STATE.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.status).toBe(STATE.ACTIVE);
  });
  test("default class of each status", async () => {
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(lbl).toHaveClass(seed, PARTS.LABEL);
    expect(ext).toHaveClass(seed, PARTS.EXTRA);
    expect(auxdv).toHaveClass(seed, PARTS.AUX);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT);
    expect(main).toHaveClass(seed, PARTS.MAIN);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);

    await user.selectOptions(main, "val1");
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.INACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, STATE.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, STATE.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.ACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, STATE.ACTIVE);
  });
  test("w/ string style class of each status", async () => {
    const clsid = "style_id";
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
      style: clsid,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(top).toHaveClass(clsid, PARTS.TOP);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    expect(main).toHaveClass(clsid, PARTS.MAIN);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM);

    await user.selectOptions(main, "val1");
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.INACTIVE);
    expect(main).toHaveClass(clsid, PARTS.MAIN, STATE.INACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, STATE.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.ACTIVE);
    expect(main).toHaveClass(clsid, PARTS.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, STATE.ACTIVE);
  });
  test("w/ obj style of each status", async () => {
    const dynObj = {
      base: "base",
      neutral: "dyn_neutral",
      active: "dyn_active",
      inactive: "dyn_inactive",
    };
    const style = {
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
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
      style,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(top).toHaveClass(dynObj.base, dynObj.neutral);
    expect(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    expect(ext).toHaveClass(dynObj.base, dynObj.neutral);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(middle).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(main).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).toHaveClass(dynObj.base, dynObj.neutral);

    await user.selectOptions(main, "val1");
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.inactive);
    expect(top).toHaveClass(dynObj.base, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.base, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.base, dynObj.inactive);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(main).toHaveClass(dynObj.base, dynObj.inactive);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.base, dynObj.inactive);

    await user.selectOptions(main, "val2");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(top).toHaveClass(dynObj.base, dynObj.active);
    expect(lbl).toHaveClass(dynObj.base, dynObj.active);
    expect(ext).toHaveClass(dynObj.base, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.active);
    expect(middle).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(main).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).toHaveClass(dynObj.base, dynObj.active);
  });
});
