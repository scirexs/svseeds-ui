import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import CheckField from "../lib/_svseeds/_CheckField.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

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
    variant: () => string,
    values: () => string[],
    elements: () => HTMLInputElement[],
  ) => {
    return { render: () => `<span data-testid="${auxid}">${variant()},${values().length},${elements().length}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const actionfn = () => {
    return {};
  };

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
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra", () => {
    const props = { options, label, extra };
    const { getAllByRole, getByText } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
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
    const { getByRole, getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
    expect(middle).toHaveAccessibleDescription(bottom);
  });

  test("w/ bottom and multiple=false", () => {
    const props = { options, bottom, multiple: false };
    const { getByRole, getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
    const middle = whole.querySelector(`[role="radiogroup"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
    expect(middle).toHaveAccessibleDescription(bottom);
  });

  test("w/ bottom of action input", () => {
    const props = { options, bottom, action: actionfn };
    const { getByRole, getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
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

  test("w/ descFirst=true", () => {
    const props = { options, bottom, descFirst: true };
    const { getByRole, getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(whole.lastElementChild).toBe(middle);
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-check-field";
  const errmsg = "invalid";
  const validationFn = (values: string[]) => (values.length === 0 ? errmsg : "");
  const validations = [validationFn];

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
      attributes: {
        value: "v",
        class: "c",
        type: "hidden",
        name: "custom_name",
        onchange: vi.fn(),
      },
    };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toHaveAttribute("value", "v");
      expect(checkbox).not.toHaveAttribute("class", "c");
      expect(checkbox).not.toHaveAttribute("type", "hidden");
      expect(checkbox).toHaveAttribute("name", "custom_name");
    });
  });

  test("w/ specify major attrs", () => {
    const props = {
      options,
      attributes: {
        required: true,
        disabled: true,
        "data-testid": "test-input",
      },
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
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("w/ required and no validations", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      attributes: { required: true },
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

  test("w/ required and custom validations", async () => {
    const props = $state({
      options,
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      attributes: { required: true },
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
      attributes: { onchange, oninvalid, required: true },
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
    const { getByRole, getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = checkboxes[0].parentElement?.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

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
    const { getByRole, getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = groups[1] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;

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
    const { getByRole, getByTestId, getByText, getAllByRole } = render(CheckField, props);
    const groups = getAllByRole("group");
    const whole = groups[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const middle = groups[1] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;

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
