import { describe, expect, test, vi } from "vitest";
import { render as svRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import CheckField from "#svs/CheckField.svelte";
import { PARTS, VARIANT } from "#svs/core";
import CheckFieldBindable from "./fixtures/CheckFieldBindable.svelte";

const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const options = new Map([
  ["option1", "Option 1"],
  ["option2", "Option 2"],
  ["option3", "Option 3"],
]);
const auxfn = createRawSnippet((values: () => string[], variant: () => string, elements: () => HTMLInputElement[]) => {
  return { render: () => `<span data-testid="${auxid}">${variant()},${values().length},${elements().length}</span>` };
});
const byRole = (container: HTMLElement, role: string) => Array.from(container.querySelectorAll(`[role="${role}"]`)) as HTMLElement[];
const inputs = (container: HTMLElement, type: "checkbox" | "radio") =>
  Array.from(container.querySelectorAll(`input[type="${type}"]`)) as HTMLInputElement[];
const byTestId = (container: HTMLElement, id: string) => Array.from(container.querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[];
const byText = (node: ParentNode, text: string) => {
  const found = Array.from(node.querySelectorAll("*")).filter((el) => el.textContent?.includes(text));
  return (found.find((el) => !Array.from(el.children).some((child) => child.textContent?.includes(text))) ?? found[0]) as HTMLElement;
};
const render = (component: any, props?: any) => {
  const result = svRender(component, props);
  const { container } = result;
  return {
    ...result,
    getAllByRole: (role: string) => (role === "checkbox" || role === "radio" ? inputs(container, role) : byRole(container, role)),
    getByRole: (role: string) => (role === "checkbox" || role === "radio" ? inputs(container, role)[0] : byRole(container, role)[0]),
    queryByRole: (role: string) =>
      (role === "checkbox" || role === "radio" ? inputs(container, role)[0] : byRole(container, role)[0]) ?? null,
    getByText: (text: string) => byText(container, text),
    queryByText: (text: string) => byText(container, text) ?? null,
    getByTestId: (id: string) => byTestId(container, id)[0],
    getAllByTestId: (id: string) => byTestId(container, id),
  };
};
const within = (node: HTMLElement) => ({
  getByText: (text: string) => byText(node, text),
  getByTestId: (id: string) => byTestId(node, id)[0],
});
const fireEvent = Object.assign(
  async (el: Element, ev: Event) => {
    el.dispatchEvent(ev);
    await tick();
  },
  {
    invalid: async (el: Element) => {
      el.dispatchEvent(new Event("invalid", { cancelable: true }));
      await tick();
    },
  },
);
const has = (el: Element | null | undefined, ...names: string[]) =>
  expect([...(el?.classList ?? [])]).toEqual(expect.arrayContaining(names));
const attr = (el: Element, name: string, value?: string) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(true);
  else expect(el.getAttribute(name)).toBe(value);
};
const noattr = (el: Element, name: string, value?: string) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(false);
  else expect(el.getAttribute(name)).not.toBe(value);
};
const txt = (el: Element | null | undefined, value: string) => expect(el?.textContent).toContain(value);
const checked = (el: HTMLInputElement) => expect(el.checked).toBe(true);
const notChecked = (el: HTMLInputElement) => expect(el.checked).toBe(false);
const required = (el: HTMLInputElement) => expect(el.required).toBe(true);
const notRequired = (el: HTMLInputElement) => expect(el.required).toBe(false);
const referenced = (el: Element, name: "aria-errormessage" | "aria-describedby") => {
  const id = el.getAttribute(name);
  return id ? document.getElementById(id) : null;
};
const aerr = (el: Element, value?: string) => {
  attr(el, "aria-invalid", "true");
  if (value !== undefined) txt(referenced(el, "aria-errormessage"), value);
};
const adesc = (el: Element, value: string) => txt(referenced(el, "aria-describedby"), value);

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
      attr(checkbox, "type", "checkbox");
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
      attr(radio, "type", "radio");
      attr(radio, "name");
    });
  });

  test("w/ label", () => {
    const props = { options, label };
    const { getAllByRole, getByText } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    attr(whole, "aria-labelledby");
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
    adesc(middle, bottom);
  });
  test("w/ reserved bottom", () => {
    const props = { options, reserve: true };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const middle = getAllByRole("group")[1] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    has(btm, "svs-check-field", PARTS.BOTTOM);
    txt(btm, "");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    noattr(middle, "aria-describedby");
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
    adesc(middle, bottom);
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
    adesc(middle, bottom);
  });

  test("w/ blank string", () => {
    const props = { options, label: " ", bottom: " " };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ bottom below middle", () => {
    const props = { options, bottom };
    const { getAllByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    const middle = whole.querySelector(`[role="group"]`) as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(middle);
    expect(whole.lastElementChild).toBe(btm);
  });

  test("w/ empty options", () => {
    const { queryByRole } = render(CheckField, { options: new Map() });
    expect(queryByRole("group")).toBeNull();
  });

  test("shrinking options trims bound elements and recomputes values", async () => {
    const onchange = vi.fn();
    const props = $state({
      options,
      initialValues: ["option1", "option3"],
      onchange,
    });
    const { getAllByRole, getByTestId, rerender } = render(CheckFieldBindable, props);

    await tick();
    txt(getByTestId("elements"), "3");

    props.options = new Map([
      ["option1", "Option 1"],
      ["option2", "Option 2"],
    ]);
    await rerender(props);
    await tick();

    txt(getByTestId("elements"), "2");

    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes[1].checked = true;
    await fireEvent(checkboxes[1], new Event("change", { bubbles: true }));
    await tick();

    expect(onchange).toHaveBeenCalled();
    await vi.waitFor(() => txt(getByTestId("values"), "option1,option2"));
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-check-field";
  const errmsg = "invalid";
  const validationFn = ({ value }: { value: string[] }) => (value.length === 0 ? errmsg : "");
  const validations = [validationFn];

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ options, reserve: true, variant: VARIANT.NEUTRAL, validations, values: [] });
    const { getAllByRole, getByRole } = render(CheckField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const middle = getAllByRole("group")[1] as HTMLDivElement;
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const btm = whole.lastElementChild as HTMLDivElement;
    has(btm, seed, PARTS.BOTTOM);
    txt(btm, "");
    noattr(middle, "aria-describedby");

    await fireEvent.invalid(checkboxes[0]);
    expect(getByRole("alert")).toBe(btm);
    txt(btm, errmsg);

    await userEvent.click(checkboxes[0]);
    expect(whole.lastElementChild).toBe(btm);
    noattr(btm, "role");
    txt(btm, "");
  });

  test("w/ default values", () => {
    const values = ["option1", "option3"];
    const props = { options, values };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    checked(checkboxes[0]);
    notChecked(checkboxes[1]);
    checked(checkboxes[2]);
  });

  test("w/ default values for radio", () => {
    const values = ["option2"];
    const props = { options, values, multiple: false };
    const { getAllByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    notChecked(radios[0]);
    checked(radios[1]);
    notChecked(radios[2]);
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
      noattr(checkbox, "value", "v"); // per-option value wins
      has(checkbox, "c"); // class merged onto each input (same as ...rest)
      noattr(checkbox, "type", "hidden"); // controlled (checkbox)
      attr(checkbox, "name", "custom_name"); // name prop applied
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
      attr(checkbox, "required");
      attr(checkbox, "disabled");
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
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    // Initially neutral
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // Check first option
    await userEvent.click(checkboxes[0]);
    expect(props.values).toContain("option1");
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: ["option1"], validity: expect.anything(), element: checkboxes[0] }),
    );
    expect(props.variant).toBe(VARIANT.ACTIVE);

    // Uncheck to trigger validation error
    await userEvent.click(checkboxes[0]);
    expect(props.values).toHaveLength(0);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // Trigger validation error
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    attr(checkboxes[0], "aria-invalid", "true");
    aerr(checkboxes[0], errmsg);
  });

  test("checkboxes become inactive immediately with non-empty invalid values", async () => {
    const max1 = ({ value }: { value: string[] }) => (value.length > 1 ? "too many" : "");
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [max1],
      values: [],
    });
    const { getAllByRole, getByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await userEvent.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.click(checkboxes[1]);
    expect(props.values).toEqual(["option1", "option2"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    txt(getByRole("alert"), "too many");
    checkboxes.forEach((checkbox) => {
      aerr(checkbox, "too many");
    });

    await userEvent.click(checkboxes[1]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();

    await userEvent.click(checkboxes[0]);
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
    const { getAllByRole, getByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    const middle = getByRole("radiogroup") as HTMLDivElement;

    await userEvent.click(radios[1]);
    expect(props.values).toEqual(["option2"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    attr(middle, "aria-invalid", "true");
    aerr(middle, "bad option");
    radios.forEach((radio) => {
      noattr(radio, "aria-invalid");
      noattr(radio, "aria-errormessage");
    });

    await userEvent.click(radios[0]);
    expect(props.values).toEqual(["option1"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    noattr(middle, "aria-invalid");
  });

  test("neutral guard keeps prefilled invalid values neutral until interaction", async () => {
    const max1 = ({ value }: { value: string[] }) => (value.length > 1 ? "too many" : "");
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [max1],
      values: ["option1", "option2"],
    });
    const { getAllByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(queryByRole("alert")).toBeNull();

    await userEvent.click(checkboxes[0]);
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
    const { getAllByRole, getByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];
    const middle = getByRole("radiogroup") as HTMLDivElement;

    // Initially neutral
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    // For radio buttons, aria-invalid is on the group
    await fireEvent.invalid(radios[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    attr(middle, "aria-invalid", "true");

    // Select first option
    await userEvent.click(radios[0]);
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
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await userEvent.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    checked(checkboxes[0]);

    await userEvent.click(checkboxes[1]);
    expect(props.values).toEqual(["option1"]);
    notChecked(checkboxes[1]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    txt(getByRole("alert"), "max");

    await userEvent.click(checkboxes[0]);
    expect(props.values).toEqual([]);
    notChecked(checkboxes[0]);
  });

  test("checkbox constraints can block a specific candidate", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      constraints: [({ value }: { value: string }) => (value === "option2" ? "no opt2" : null)],
      values: [] as string[],
    });
    const { getAllByRole, getByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await userEvent.click(checkboxes[1]);
    expect(props.values).toEqual([]);
    notChecked(checkboxes[1]);
    txt(getByRole("alert"), "no opt2");

    await userEvent.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);
    checked(checkboxes[0]);
  });

  test("null validation result is valid", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [() => null],
      values: [] as string[],
    });
    const { getAllByRole, queryByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await userEvent.click(checkboxes[0]);

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
    attr(checkboxes[0], "aria-invalid", "true");
    aerr(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("checkbox required group is invalid until one option is selected", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      required: true,
      values: [],
    });
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    checkboxes.forEach((checkbox) => {
      required(checkbox);
      expect(checkbox.checkValidity()).toBe(false);
    });

    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await userEvent.click(checkboxes[0]);
    checkboxes.forEach((checkbox) => {
      notRequired(checkbox);
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
    const { getAllByRole } = render(CheckField, props);
    const radios = getAllByRole("radio") as HTMLInputElement[];

    radios.forEach((radio) => {
      required(radio);
    });

    await userEvent.click(radios[1]);
    radios.forEach((radio) => {
      required(radio);
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
      notRequired(checkbox);
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
    attr(checkboxes[0], "aria-invalid", "true");
    aerr(checkboxes[0], errmsg);
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
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await fireEvent.invalid(checkboxes[0]);
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await userEvent.click(checkboxes[0]);
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
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];

    await userEvent.click(checkboxes[0]);
    expect(props.values).toEqual(["option1"]);

    await userEvent.click(checkboxes[2]);
    expect(props.values).toEqual(["option1", "option3"]);

    await userEvent.click(checkboxes[0]);
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

    await userEvent.click(radios[0]);
    await userEvent.click(radios[1]);
    notChecked(radios[0]);
    checked(radios[1]);
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
    has(whole, seed, PARTS.WHOLE);
    has(top, seed, PARTS.TOP);
    has(lbl, seed, PARTS.LABEL);
    has(ext, seed, PARTS.EXTRA);
    has(auxdv, seed, PARTS.AUX);
    has(middle, seed, PARTS.MIDDLE);
    has(btm, seed, PARTS.BOTTOM);

    // Check first checkbox and verify active state
    await userEvent.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    has(whole, seed, PARTS.WHOLE, VARIANT.ACTIVE);
    has(top, seed, PARTS.TOP, VARIANT.ACTIVE);
    has(lbl, seed, PARTS.LABEL, VARIANT.ACTIVE);
    has(ext, seed, PARTS.EXTRA, VARIANT.ACTIVE);
    has(auxdv, seed, PARTS.AUX, VARIANT.ACTIVE);
    has(middle, seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    has(btm, seed, PARTS.BOTTOM, VARIANT.ACTIVE);

    // Uncheck and trigger invalid state
    await userEvent.click(checkboxes[0]);
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    has(whole, seed, PARTS.WHOLE, VARIANT.INACTIVE);
    has(top, seed, PARTS.TOP, VARIANT.INACTIVE);
    has(lbl, seed, PARTS.LABEL, VARIANT.INACTIVE);
    has(ext, seed, PARTS.EXTRA, VARIANT.INACTIVE);
    has(auxdv, seed, PARTS.AUX, VARIANT.INACTIVE);
    has(middle, seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    has(btm, seed, PARTS.BOTTOM, VARIANT.INACTIVE);
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
    has(whole, clsid, PARTS.WHOLE);
    has(top, clsid, PARTS.TOP);
    has(lbl, clsid, PARTS.LABEL);
    has(ext, clsid, PARTS.EXTRA);
    has(auxdv, clsid, PARTS.AUX);
    has(middle, clsid, PARTS.MIDDLE);
    has(btm, clsid, PARTS.BOTTOM);

    await userEvent.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    has(whole, clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    has(top, clsid, PARTS.TOP, VARIANT.ACTIVE);
    has(lbl, clsid, PARTS.LABEL, VARIANT.ACTIVE);
    has(ext, clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    has(auxdv, clsid, PARTS.AUX, VARIANT.ACTIVE);
    has(middle, clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    has(btm, clsid, PARTS.BOTTOM, VARIANT.ACTIVE);
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
    has(whole, dynObj.base, dynObj.neutral);
    has(top, dynObj.base, dynObj.neutral);
    has(lbl, dynObj.base, dynObj.neutral);
    has(ext, dynObj.base, dynObj.neutral);
    has(auxdv, dynObj.base, dynObj.neutral);
    has(middle, dynObj.base, dynObj.neutral);
    has(btm, dynObj.base, dynObj.neutral);

    await userEvent.click(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    has(whole, dynObj.base, dynObj.active);
    has(top, dynObj.base, dynObj.active);
    has(lbl, dynObj.base, dynObj.active);
    has(ext, dynObj.base, dynObj.active);
    has(auxdv, dynObj.base, dynObj.active);
    has(middle, dynObj.base, dynObj.active);
    has(btm, dynObj.base, dynObj.active);

    await userEvent.click(checkboxes[0]);
    await fireEvent.invalid(checkboxes[0]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    has(whole, dynObj.base, dynObj.inactive);
    has(top, dynObj.base, dynObj.inactive);
    has(lbl, dynObj.base, dynObj.inactive);
    has(ext, dynObj.base, dynObj.inactive);
    has(auxdv, dynObj.base, dynObj.inactive);
    has(middle, dynObj.base, dynObj.inactive);
    has(btm, dynObj.base, dynObj.inactive);
  });

  test("individual checkbox label styling", () => {
    const props = { options, values: ["option1"] };
    const { getAllByRole } = render(CheckField, props);
    const checkboxes = getAllByRole("checkbox") as HTMLInputElement[];
    const labels = checkboxes.map((cb) => cb.parentElement);

    // First checkbox is checked (active), others are neutral
    has(labels[0], seed, PARTS.MAIN, VARIANT.ACTIVE);
    has(labels[1], seed, PARTS.MAIN);
    has(labels[2], seed, PARTS.MAIN);

    // Verify input and span elements within labels
    labels.forEach((label, index) => {
      const input = label?.querySelector("input");
      const span = label?.querySelector("span");
      const expectedState = index === 0 ? VARIANT.ACTIVE : VARIANT.NEUTRAL;

      has(input, seed, PARTS.LEFT, expectedState);
      has(span, seed, PARTS.RIGHT, expectedState);
    });
  });
});
