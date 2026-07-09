import axe from "axe-core";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, flushSync, tick } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import SelectField from "#svs/SelectField.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const byText = (node: ParentNode, text: string) =>
  [...node.querySelectorAll("*")].reverse().find((el) => el.textContent?.trim() === text) ?? null;

type SelectFieldElement = HTMLSelectElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet((variant: () => string, value: () => string, element: () => SelectFieldElement) => {
  return { render: () => `<span data-testid="${auxid}">${variant().length},${value().length},${element?.toString()}</span>` };
});
const leftfn = createRawSnippet((variant: () => string, value: () => string, element: () => SelectFieldElement) => {
  return { render: () => `<span data-testid="${leftid}">${variant().length},${value().length},${element?.toString()}</span>` };
});
const rightfn = createRawSnippet((variant: () => string, value: () => string, element: () => SelectFieldElement) => {
  return { render: () => `<span data-testid="${rightid}">${variant().length},${value().length},${element?.toString()}</span>` };
});

describe("Switching existence of elements", () => {
  const options = new SvelteMap([
    ["value1", "Option 1"],
    ["value2", "Option 2"],
    ["value3", "Option 3"],
  ]);
  const attachfn = () => {};

  test("minimum props (options only)", async () => {
    const { container } = render(SelectField, { options });
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main.tagName).toBe("SELECT");
    expect(main.children).toHaveLength(4);
    const option = main.children[0] as HTMLOptionElement;
    expect(option.value).toBe("");
    expect(option.textContent).toBe("");
  });
  test("w/ Map options", async () => {
    const mapOptions = new Map([
      ["val1", "Text 1"],
      ["val2", "Text 2"],
    ]);
    const { container } = render(SelectField, { options: mapOptions });
    const main = container.querySelector("select") as HTMLSelectElement;
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
  test("w/ label", async () => {
    const props = { options, label };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    await expect.element(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label of attach select", async () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { options, label, attach };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    await expect.element(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(attach).toHaveBeenCalled();
  });
  test("w/ extra, w/o label", async () => {
    const props = { options, extra };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ label, extra", async () => {
    const props = { options, label, extra };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    byText(lbl, extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label, extra, aux", async () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { options, label, extra, aux };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    const auxsp = container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(aux).toHaveBeenCalled();
  });
  test("w/ left", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { options, left };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement);
    expect(left).toHaveBeenCalled();
  });
  test("w/ right", async () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { options, right };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement);
    expect(right).toHaveBeenCalled();
  });
  test("w/ bottom", async () => {
    const props = { options, bottom };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    await expect.element(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ reserved bottom", async () => {
    const props = { options, reserve: true };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    await expect.element(btm).toHaveClass("svs-select-field", PARTS.BOTTOM);
    await expect.element(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    await expect.element(main).not.toHaveAttribute("aria-describedby");
  });
  test("w/ bottom of attach select", async () => {
    const props = { options, bottom, attach: attachfn };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    await expect.element(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ blank string", async () => {
    const props = { options, label: " ", bottom: " " };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ bottom", async () => {
    const props = { options, bottom };
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    await expect.element(main).toHaveAccessibleDescription(bottom);
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-select-field";
  const options = new SvelteMap([
    ["val1", "Option 1"],
    ["val2", "Option 2"],
  ]);
  const errmsg = "invalid selection";
  const validationFn = ({ value }: { value: string }) => (value === "val1" ? errmsg : "");
  const validations = [validationFn];

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ options, reserve: true, value: "val2", variant: VARIANT.NEUTRAL, validations });
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    await expect.element(btm).toHaveClass(seed, PARTS.BOTTOM);
    await expect.element(btm).toHaveTextContent("");
    await expect.element(main).not.toHaveAttribute("aria-describedby");

    await userEvent.selectOptions(main, "val1");
    expect(container.querySelector('[role="alert"]')).toBe(btm);
    await expect.element(btm).toHaveTextContent(errmsg);

    await userEvent.selectOptions(main, "val2");
    expect(whole.lastElementChild).toBe(btm);
    await expect.element(btm).not.toHaveAttribute("role");
    await expect.element(btm).toHaveTextContent("");
  });

  test("w/ default value", async () => {
    const value = "val2";
    const props = { options, value };
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    await expect.element(main).toHaveValue(value);
    const selectedOption = main.querySelector("option[selected]") as HTMLOptionElement;
    expect(selectedOption.value).toBe(value);
    expect(selectedOption.textContent).toBe("Option 2");
  });
  test("w/ specify id", async () => {
    const id = "id_foo";
    const props = { options, id };
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    await expect.element(main).toHaveAttribute("id", id);
  });
  test("class merged onto select control", async () => {
    const props = { options, class: "merged-class" } as any;
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    const root = container.querySelector('[role="group"]') as HTMLElement;
    await expect.element(main).toHaveClass("merged-class"); // merged onto the control (same as ...rest)
    await expect.element(root).not.toHaveClass("merged-class"); // not on the WHOLE root
  });
  test("w/ specify major attrs", async () => {
    const props = { options, name: "select-name", required: true, disabled: true };
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    await expect.element(main).toHaveAttribute("name", "select-name");
    await expect.element(main).toHaveAttribute("required");
    await expect.element(main).toHaveAttribute("disabled");
  });

  test("stays neutral on mount with a pre-filled value", async () => {
    const props = $state({
      options,
      value: "val2",
      variant: VARIANT.NEUTRAL,
      validations,
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await userEvent.selectOptions(main, "val1");
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await userEvent.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });
  test("programmatic value change does not leave neutral", async () => {
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
  test("renders with an empty options map", async () => {
    const { container } = render(SelectField, { options: new SvelteMap<string, string>(), value: "x" });
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    await expect.element(whole).toBeInTheDocument();
    expect(main.children).toHaveLength(0);
  });
  test("placeholder injects a leading empty option with text", async () => {
    const { container } = render(SelectField, { options, placeholder: "Select..." });
    const main = container.querySelector("select") as HTMLSelectElement;
    expect(main.children).toHaveLength(3);
    const first = main.children[0] as HTMLOptionElement;
    expect(first.value).toBe("");
    expect(first.textContent).toBe("Select...");
    await expect.element(main).toHaveValue("");
  });
  test("placeholder option is persistent and clears back to neutral", async () => {
    const props = $state({
      options,
      placeholder: "Select...",
      variant: VARIANT.NEUTRAL,
      validations,
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    await userEvent.selectOptions(main, "val1");
    expect(main.children).toHaveLength(3);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await userEvent.selectOptions(main, "");
    await expect.element(main).toHaveValue("");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
  test("empty value injects an empty option until selection", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    expect(main.children).toHaveLength(3);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("");

    await userEvent.selectOptions(main, "val1");
    expect(main.children).toHaveLength(2);
    expect((main.children[0] as HTMLOptionElement).value).toBe("val1");
  });
  test("does not double inject when options already has an empty key", async () => {
    const optionsWithEmpty = new SvelteMap([
      ["", "Choose"],
      ["val1", "Option 1"],
    ]);
    const { container } = render(SelectField, { options: optionsWithEmpty, placeholder: "Select..." });
    const main = container.querySelector("select") as HTMLSelectElement;
    expect(main.children).toHaveLength(2);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("Choose");
  });
  test("blank placeholder provides a persistent empty clear option", async () => {
    const props = $state({
      options,
      placeholder: "",
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    expect(main.children).toHaveLength(3);
    expect((main.children[0] as HTMLOptionElement).value).toBe("");
    expect(main.children[0].textContent).toBe("");

    await userEvent.selectOptions(main, "val1");
    expect(main.children).toHaveLength(3);
  });

  test("major state transition", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const options = new SvelteMap([
      ["", ""],
      ["val1", "Option 1"],
      ["val2", "Option 2"],
    ]);
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await userEvent.selectOptions(main, "val1");
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(expect.objectContaining({ value: "val1", validity: expect.anything(), element: main }));
    expect(props.variant).toBe(VARIANT.INACTIVE);
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await expect.element(main).toHaveAttribute("aria-invalid", "true");
    await expect.element(main).toHaveAccessibleErrorMessage(errmsg);

    await userEvent.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.selectOptions(main, "");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
  test("w/ required and no validations", async () => {
    const optionsWithEmpty = new SvelteMap([
      ["", "Select Option"],
      ["val1", "Option 1"],
    ]);
    const props = $state({
      options: optionsWithEmpty,
      variant: VARIANT.NEUTRAL,
      required: true,
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await expect.element(main).toHaveAttribute("aria-invalid", "true");
    await expect.element(main).toHaveAccessibleErrorMessage();
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
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;
    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await expect.element(main).toHaveAttribute("aria-invalid", "true");
    await expect.element(main).toHaveAccessibleErrorMessage("required");
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
  test("null validation result is valid", async () => {
    const props = $state({
      options,
      variant: VARIANT.NEUTRAL,
      validations: [() => null],
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    await userEvent.selectOptions(main, "val2");

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(container.querySelector('[role="alert"]')).toBeNull();
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
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await userEvent.selectOptions(main, "val2");
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
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    const ext = byText(lbl, extra) as HTMLElement;
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = main.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE);
    await expect.element(top).toHaveClass(seed, PARTS.TOP);
    await expect.element(lbl).toHaveClass(seed, PARTS.LABEL);
    await expect.element(ext).toHaveClass(seed, PARTS.EXTRA);
    await expect.element(auxdv).toHaveClass(seed, PARTS.AUX);
    await expect.element(middle).toHaveClass(seed, PARTS.MIDDLE);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT);
    await expect.element(btm).toHaveClass(seed, PARTS.BOTTOM);

    await userEvent.selectOptions(main, "val1");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    await expect.element(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    await expect.element(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    await expect.element(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    await expect.element(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    await expect.element(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
    await expect.element(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);

    await userEvent.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    await expect.element(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    await expect.element(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    await expect.element(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    await expect.element(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);
    await expect.element(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.ACTIVE);
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
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    const ext = byText(lbl, extra) as HTMLElement;
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = main.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE);
    await expect.element(top).toHaveClass(clsid, PARTS.TOP);
    await expect.element(lbl).toHaveClass(clsid, PARTS.LABEL);
    await expect.element(ext).toHaveClass(clsid, PARTS.EXTRA);
    await expect.element(auxdv).toHaveClass(clsid, PARTS.AUX);
    await expect.element(middle).toHaveClass(clsid, PARTS.MIDDLE);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT);
    await expect.element(main).toHaveClass(clsid, PARTS.MAIN);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    await expect.element(btm).toHaveClass(clsid, PARTS.BOTTOM);

    await userEvent.selectOptions(main, "val1");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.INACTIVE);
    await expect.element(top).toHaveClass(clsid, PARTS.TOP, VARIANT.INACTIVE);
    await expect.element(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.INACTIVE);
    await expect.element(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.INACTIVE);
    await expect.element(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.INACTIVE);
    await expect.element(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.INACTIVE);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.INACTIVE);
    await expect.element(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.INACTIVE);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.INACTIVE);
    await expect.element(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.INACTIVE);

    await userEvent.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    await expect.element(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    await expect.element(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    await expect.element(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    await expect.element(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    await expect.element(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
    await expect.element(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.ACTIVE);
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
    const { container } = render(SelectField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = container.querySelector("label") as HTMLLabelElement;
    const ext = byText(lbl, extra) as HTMLElement;
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("select") as HTMLSelectElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = main.parentElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(top).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(ext).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(middle).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(main).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(btm).toHaveClass(dynObj.base, dynObj.neutral);

    await userEvent.selectOptions(main, "val1");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await expect.element(whole).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(top).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(ext).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(middle).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(main).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    await expect.element(btm).toHaveClass(dynObj.base, dynObj.inactive);

    await userEvent.selectOptions(main, "val2");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(top).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(lbl).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(ext).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(auxdv).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(middle).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(main).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(btm).toHaveClass(dynObj.base, dynObj.active);
  });
});

describe("accessibility (axe)", () => {
  const auditOptions = new SvelteMap([
    ["val1", "Option 1"],
    ["val2", "Option 2"],
  ]);

  test("default render has no violations", async () => {
    const { container } = render(SelectField, { options: auditOptions, label });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("invalid state has no violations", async () => {
    const msg = "invalid selection";
    const props = $state({
      options: auditOptions,
      label,
      value: "val2",
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: string }) => (value === "val1" ? msg : "")],
    });
    const { container } = render(SelectField, props);
    const main = container.querySelector("select") as HTMLSelectElement;

    await userEvent.selectOptions(main, "val1");
    await expect.element(main).toHaveAttribute("aria-invalid", "true");
    await expect.element(main).toHaveAccessibleErrorMessage(msg);
    expect(await axe.run(container)).toHaveNoViolations();
  });
});
