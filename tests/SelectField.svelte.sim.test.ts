import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, flushSync } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import SelectField from "#svs/SelectField.svelte";
import { PARTS, VARIANT } from "#svs/core";

type SelectFieldElement = HTMLSelectElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet(
  (
    variant: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${auxid}">${variant().length},${value().length},${element?.toString()}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    variant: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${variant().length},${value().length},${element?.toString()}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    variant: () => string,
    value: () => string,
    element: () => SelectFieldElement,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${variant().length},${value().length},${element?.toString()}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const options = new SvelteMap([["value1", "Option 1"], ["value2", "Option 2"], ["value3", "Option 3"]]);
  const attachfn = () => {};

  test("minimum props (options only)", () => {
    const { getByRole } = render(SelectField, { options });
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main.tagName).toBe("SELECT");
    expect(main.children).toHaveLength(4);
    const option = main.children[0] as HTMLOptionElement;
    expect(option.value).toBe("");
    expect(option.textContent).toBe("");
  });
  test("w/ Map options", () => {
    const mapOptions = new Map([["val1", "Text 1"], ["val2", "Text 2"]]);
    const { getByRole } = render(SelectField, { options: mapOptions });
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main.children).toHaveLength(3);
    const placeholder = main.children[0] as HTMLOptionElement;
    const option1 = main.children[1] as HTMLOptionElement;
    const option2 = main.children[2] as HTMLOptionElement;
    expect(placeholder.value).toBe("");
    expect(placeholder.textContent).toBe("");
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
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label of attach select", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { options, label, attach };
    const { getByRole, getByText } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(attach).toHaveBeenCalled();
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
    expect(whole.firstElementChild).toBe(lbl.parentElement);
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
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ reserved bottom", () => {
    const props = { options, reserve: true };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass("svs-select-field", PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main).not.toHaveAttribute("aria-describedby");
  });
  test("w/ bottom of attach select", () => {
    const props = { options, bottom, attach: attachfn };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
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
  test("w/ bottom", () => {
    const props = { options, bottom };
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-select-field";
  const options = new SvelteMap([["val1", "Option 1"], ["val2", "Option 2"]]);
  const errmsg = "invalid selection";
  const validationFn = ({ value }: { value: string }) => (value === "val1" ? errmsg : "");
  const validations = [validationFn];

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ options, reserve: true, value: "val2", variant: VARIANT.NEUTRAL, validations });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(main).not.toHaveAttribute("aria-describedby");

    await user.selectOptions(main, "val1");
    expect(getByRole("alert")).toBe(btm);
    expect(btm).toHaveTextContent(errmsg);

    await user.selectOptions(main, "val2");
    expect(whole.lastElementChild).toBe(btm);
    expect(btm).not.toHaveAttribute("role");
    expect(btm).toHaveTextContent("");
  });

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
    const props = { options, id };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).toHaveAttribute("id", id);
  });
  test("class merged onto select control", () => {
    const props = { options, class: "merged-class" } as any;
    const { getByRole, container } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    const root = container.querySelector('[role="group"]') as HTMLElement;
    expect(main).toHaveClass("merged-class"); // merged onto the control (same as ...rest)
    expect(root).not.toHaveClass("merged-class"); // not on the WHOLE root
  });
  test("w/ specify major attrs", () => {
    const props = { options, name: "select-name", required: true, disabled: true };
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main).toHaveAttribute("name", "select-name");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("disabled");
  });

  test("stays neutral on mount with a pre-filled value", async () => {
    const props = $state({
      options,
      value: "val2",
      variant: VARIANT.NEUTRAL,
      validations,
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await user.selectOptions(main, "val1");
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });
  test("programmatic value change does not leave neutral", () => {
    const props = $state({
      options,
      placeholder: "Select...",
      value: "",
      variant: VARIANT.NEUTRAL,
      validations,
    });
    render(SelectField, props);

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    props.value = "val2";
    flushSync();

    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
  test("renders with an empty options map", () => {
    const { getByRole } = render(SelectField, { options: new SvelteMap<string, string>(), value: "x" });
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(whole).toBeInTheDocument();
    expect(main.children).toHaveLength(0);
  });
  test("placeholder injects a leading empty option with text", () => {
    const { getByRole } = render(SelectField, { options, placeholder: "Select..." });
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main.children).toHaveLength(3);
    const first = main.children[0] as HTMLOptionElement;
    expect(first.value).toBe("");
    expect(first.textContent).toBe("Select...");
    expect(main).toHaveValue("");
  });
  test("placeholder option is persistent and clears back to neutral", async () => {
    const props = $state({
      options,
      placeholder: "Select...",
      variant: VARIANT.NEUTRAL,
      validations,
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    await user.selectOptions(main, "val1");
    expect(main.children).toHaveLength(3);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.selectOptions(main, "");
    expect(main).toHaveValue("");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
  test("empty value injects an empty option until selection", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    expect(main.children).toHaveLength(3);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("");

    await user.selectOptions(main, "val1");
    expect(main.children).toHaveLength(2);
    expect((main.children[0] as HTMLOptionElement).value).toBe("val1");
  });
  test("does not double inject when options already has an empty key", () => {
    const optionsWithEmpty = new SvelteMap([["", "Choose"], ["val1", "Option 1"]]);
    const { getByRole } = render(SelectField, { options: optionsWithEmpty, placeholder: "Select..." });
    const main = getByRole("combobox") as HTMLSelectElement;
    expect(main.children).toHaveLength(2);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("Choose");
  });
  test("blank placeholder provides a persistent empty clear option", async () => {
    const props = $state({
      options,
      placeholder: "",
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    expect(main.children).toHaveLength(3);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("");

    await user.selectOptions(main, "val1");
    expect(main.children).toHaveLength(3);
  });

  test("major state transition", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const options = new SvelteMap([["", ""], ["val1", "Option 1"], ["val2", "Option 2"]]);
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await user.selectOptions(main, "val1");
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "val1", validity: expect.anything(), element: main }),
    );
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);

    await user.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.selectOptions(main, "");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
  test("w/ required and no validations", async () => {
    const optionsWithEmpty = new SvelteMap([["", "Select Option"], ["val1", "Option 1"]]);
    const props = $state({
      options: optionsWithEmpty,
      variant: VARIANT.NEUTRAL,
      required: true,
    });
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    await fireEvent.invalid(main);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage();
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
  test("w/ required and custom validations", async () => {
    const props = $state({
      options,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: string }) => (value === "" ? "required" : "")],
      required: true,
    });
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;
    await fireEvent.invalid(main);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage("required");
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
  test("null validation result is valid", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [() => null],
    });
    const user = userEvent.setup();
    const { getByRole, queryByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    await user.selectOptions(main, "val2");

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();
  });
  test("w/ custom events used internally", async () => {
    const oninvalid = vi.fn();
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations,
      oninvalid,
      required: true,
    });
    const user = userEvent.setup();
    const { getByRole } = render(SelectField, props);
    const main = getByRole("combobox") as HTMLSelectElement;

    await fireEvent.invalid(main);
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
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
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
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
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
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
      styling: clsid,
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
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
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
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.INACTIVE);
    expect(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.INACTIVE);

    await user.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    expect(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
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
      variant: VARIANT.NEUTRAL,
      validations,
      styling,
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
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
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
    expect(props.variant).toBe(VARIANT.INACTIVE);
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
    expect(props.variant).toBe(VARIANT.ACTIVE);
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
