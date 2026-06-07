import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import TagsInputField from "#svs/TagsInputField.svelte";
import { PARTS, VARIANT } from "#svs/core";

type TagsInputFieldElement = HTMLInputElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet((values: () => string[], variant: () => string, element: () => TagsInputFieldElement) => {
  return { render: () => `<span data-testid="${auxid}">${variant().length},${values().length},${element?.toString()}</span>` };
});
const leftfn = createRawSnippet((values: () => string[], variant: () => string, element: () => TagsInputFieldElement) => {
  return { render: () => `<span data-testid="${leftid}">${variant().length},${values().length},${element?.toString()}</span>` };
});
const rightfn = createRawSnippet((values: () => string[], variant: () => string, element: () => TagsInputFieldElement) => {
  return { render: () => `<span data-testid="${rightid}">${variant().length},${values().length},${element?.toString()}</span>` };
});

describe("Switching existence of elements", () => {
  test("no props", () => {
    const { getByRole } = render(TagsInputField);
    const whole = getByRole("group") as HTMLDivElement;
    expect(whole.tagName).toBe("DIV");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label", () => {
    const props = { label };
    const { getByRole, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const top = lbl.parentElement;
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(top).toHaveClass("svs-tags-input-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ extra, w/o label", () => {
    const props = { extra };
    const { getByRole } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra", () => {
    const props = { label, extra };
    const { getByRole, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const top = lbl.parentElement;
    expect(whole.children).toHaveLength(2);
    expect(top).toHaveClass("svs-tags-input-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.firstElementChild?.firstElementChild?.firstElementChild).toBe(ext);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { label, extra, aux };
    const { getByRole, getByTestId, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(aux).toHaveBeenCalled();
  });

  test("w/ left", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { left };
    const { getByRole, getByTestId } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement);
    expect(left).toHaveBeenCalled();
  });

  test("w/ right", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { right };
    const { getByRole, getByTestId } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement);
    expect(right).toHaveBeenCalled();
  });

  test("w/ bottom", () => {
    const props = { bottom };
    const { getByRole } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.lastElementChild).toBe(btm);
    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    expect(main).toHaveAccessibleDescription(bottom);
  });

  test("w/ blank string", () => {
    const props = { label: " ", bottom: " " };
    const { getByRole } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.firstElementChild).toBe(main.parentElement);
  });

  test("w/ initial values", () => {
    const values = ["tag1", "tag2"];
    const props = { values };
    const { getByRole, getAllByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const tag1 = getAllByText("tag1");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.firstElementChild).toBe(main.parentElement);
    expect(tag1).toHaveLength(1);
  });

  test("w/ descFirst true", () => {
    const props = { bottom, descFirst: true };
    const { getByRole } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.firstElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    expect(whole.lastElementChild?.firstElementChild).toBe(main.parentElement);
  });
});

describe("Specify props & state transition & event handlers", () => {
  const seed = "svs-tags-input-field";
  const errmsg = "invalid";
  const constraintFn = (value: string) => (value.length < 2 ? errmsg : "");
  const validationFn = (values: string[]) => (values.length === 0 ? errmsg : "");
  const constraints = [constraintFn];
  const validations = [validationFn];

  test("w/ default values", () => {
    const values = ["initial"];
    const props = { values };
    const { getByRole, getByText } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveValue("");
    getByText("initial");
  });

  test("w/ min validation", async () => {
    const min = { value: 2, message: "At least 2 tags required" };
    const props = $state({
      variant: VARIANT.NEUTRAL,
      min,
    });
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await fireEvent.invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage("At least 2 tags required");
  });

  test("w/ max constraint", async () => {
    const max = { value: 2, message: "Maximum 2 tags allowed" };
    const values = ["tag1", "tag2"];
    const props = $state({
      values,
      variant: VARIANT.NEUTRAL,
      max,
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "tag3");
    await user.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage("Maximum 2 tags allowed");
  });

  test("major state transition with constraints", async () => {
    const mockConstraint = vi.fn().mockImplementation(constraintFn);
    const props = $state({
      variant: VARIANT.NEUTRAL,
      constraints: [mockConstraint],
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "a");
    await user.keyboard("{Enter}");

    expect(mockConstraint).toHaveBeenCalled();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);

    await user.type(main, "aa");
    await user.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("major state transition with validations", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
    });
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await fireEvent.invalid(main);

    expect(mockValidation).toHaveBeenCalled();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
  });

  test("tag addition and removal", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByText, queryByText } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    // Add a tag
    await user.type(main, "newtag");
    await user.keyboard("{Enter}");

    expect(props.values).toContain("newtag");
    getByText("newtag");

    // Remove the tag
    const removeButton = getByText("newtag").parentElement?.querySelector("button");
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(props.values).not.toContain("newtag");
    expect(queryByText("newtag")).toBeNull();
  });

  test("default class of each variant", async () => {
    const props = $state({
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
    const { getByRole, getByTestId, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(lbl).toHaveClass(seed, PARTS.LABEL);
    expect(ext).toHaveClass(seed, PARTS.EXTRA);
    expect(auxdv).toHaveClass(seed, PARTS.AUX);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT);
    // expect(main).toHaveClass(seed, PARTS.MAIN);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).not.toHaveAttribute("role");

    await fireEvent.invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    // expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);
    expect(btm).toHaveAttribute("role", "alert");

    await user.type(main, "validtag");
    await user.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    // expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.ACTIVE);
    expect(btm).not.toHaveAttribute("role");
  });

  test("w/ string styling class of each variant", async () => {
    const clsid = "style_id";
    const props = $state({
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
    const { getByRole, getByTestId, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(top).toHaveClass(clsid, PARTS.TOP);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    // expect(main).toHaveClass(clsid, PARTS.MAIN);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM);
    expect(btm).not.toHaveAttribute("role");

    await fireEvent.invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.INACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.INACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.INACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.INACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.INACTIVE);
    // expect(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.INACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.INACTIVE);
    expect(btm).toHaveAttribute("role", "alert");

    await user.type(main, "validtag");
    await user.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    // expect(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.ACTIVE);
    expect(btm).not.toHaveAttribute("role");
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
    const { getByRole, getByTestId, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(top).toHaveClass(dynObj.base, dynObj.neutral);
    expect(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    expect(ext).toHaveClass(dynObj.base, dynObj.neutral);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(middle).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    // expect(main).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).not.toHaveAttribute("role");

    await fireEvent.invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.inactive);
    expect(top).toHaveClass(dynObj.base, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.base, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.base, dynObj.inactive);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    // expect(main).toHaveClass(dynObj.base, dynObj.inactive);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveAttribute("role", "alert");

    await user.type(main, "validtag");
    await user.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(top).toHaveClass(dynObj.base, dynObj.active);
    expect(lbl).toHaveClass(dynObj.base, dynObj.active);
    expect(ext).toHaveClass(dynObj.base, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.active);
    expect(middle).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    // expect(main).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).not.toHaveAttribute("role");
  });
});

describe("a11y, structure, form & review fixes", () => {
  const seed = "svs-tags-input-field";
  const errmsg = "invalid";
  const constraintFn = (value: string) => (value.length < 2 ? errmsg : "");
  const validationFn = (values: string[]) => (values.length === 0 ? errmsg : "");

  test("constraints and validations props are not mutated", () => {
    const userConstraints = [constraintFn];
    const userValidations = [validationFn];
    const props = $state({
      min: { value: 2, message: "m" },
      max: { value: 3, message: "x" },
      constraints: userConstraints,
      validations: userValidations,
    });

    render(TagsInputField, props);

    expect(userConstraints).toHaveLength(1);
    expect(userValidations).toHaveLength(1);
  });

  test("name produces hidden inputs and leaves the visible control unnamed", () => {
    const props = { name: "tags", values: ["a", "b"] };
    const { container, getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    const hidden = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');

    expect(main).not.toHaveAttribute("name");
    expect(hidden).toHaveLength(2);
    expect([...hidden].map((input) => input.name)).toEqual(["tags", "tags"]);
    expect([...hidden].map((input) => input.value)).toEqual(["a", "b"]);
  });

  test("name can be resolved from deps.svsTagsInput", () => {
    const props = { values: ["a"], deps: { svsTagsInput: { name: "viaDeps" } } };
    const { container } = render(TagsInputField, props);
    const hidden = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');

    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toHaveAttribute("name", "viaDeps");
    expect(hidden[0]).toHaveValue("a");
  });

  test("deps.svsTagsInput cannot override Field-controlled variant", async () => {
    const props = $state({
      deps: { svsTagsInput: { variant: "somethingElse" } },
      validations: [validationFn],
      variant: VARIANT.NEUTRAL,
    });
    const { getByRole } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;

    await fireEvent.invalid(main);

    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(main).toHaveClass("svs-tags-input", PARTS.MAIN, VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage(errmsg);
  });

  test("empty or whitespace input is not added or validated", async () => {
    const mockConstraint = vi.fn().mockImplementation(constraintFn);
    const props = $state({
      values: [] as string[],
      constraints: [mockConstraint],
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { container, getByRole, queryByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "   ");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual([]);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(mockConstraint).not.toHaveBeenCalled();
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(queryByRole("alert")).toBeNull();
  });

  test("constraint receives the trimmed value handed to onadd", async () => {
    const props = $state({
      values: [] as string[],
      constraints: [constraintFn],
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "  a  ");
    await user.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
  });

  test("trimmed value that satisfies constraints is added", async () => {
    const props = $state({
      values: [] as string[],
      constraints: [constraintFn],
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByText } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "  ab  ");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["ab"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    getByText("ab");
  });

  test("tag removal re-validates and transitions variant", async () => {
    const props = $state({
      values: ["only"],
      min: { value: 2, message: "need 2" },
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "second");
    await user.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.click(getByRole("button", { name: /only/ }));

    expect(props.values).toEqual(["second"]);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("min and max together keep max immediate and min deferred to invalid", async () => {
    const props = $state({
      values: ["t1", "t2"],
      min: { value: 1, message: "min" },
      max: { value: 2, message: "max" },
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "t3");
    await user.keyboard("{Enter}");

    expect(props.values).toHaveLength(2);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage("max");

    await user.click(getByRole("button", { name: /t1/ }));
    await user.click(getByRole("button", { name: /t2/ }));
    await fireEvent.invalid(main);

    expect(props.values).toHaveLength(0);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage("min");
  });

  test("min validation does not surface while typing", async () => {
    const props = $state({
      min: { value: 2, message: "need 2" },
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, queryByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "one");
    await user.keyboard("{Enter}");

    expect(props.variant).not.toBe(VARIANT.INACTIVE);
    expect(queryByRole("alert")).toBeNull();

    await fireEvent.invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(main).toHaveAccessibleErrorMessage("need 2");
  });

  test("events.onadd cancellation via deps", async () => {
    const onadd = vi.fn(() => true);
    const props = $state({
      values: [] as string[],
      deps: { svsTagsInput: { events: { onadd } } },
    });
    const user = userEvent.setup();
    const { getByRole, queryByText } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "blocked");
    await user.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith([], "blocked");
    expect(props.values).toEqual([]);
    expect(queryByText("blocked")).toBeNull();
  });

  test("events.onremove cancellation via deps", async () => {
    const onremove = vi.fn(() => true);
    const props = $state({
      values: ["a"],
      deps: { svsTagsInput: { events: { onremove } } },
    });
    const user = userEvent.setup();
    const { getByRole, getByText } = render(TagsInputField, props);

    await user.click(getByRole("button", { name: /a/ }));

    expect(onremove).toHaveBeenCalledWith(["a"], "a", 0);
    expect(props.values).toEqual(["a"]);
    getByText("a");
  });

  test("onchange passthrough is called", async () => {
    const onchange = vi.fn();
    const props = $state({
      deps: { svsTagsInput: { onchange } },
      variant: VARIANT.NEUTRAL,
    });
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await fireEvent.change(main, { target: { value: "changed" } });

    expect(onchange).toHaveBeenCalled();
  });

  test("reactive label toggles top and aria-labelledby", async () => {
    const props = $state({
      label: undefined as string | undefined,
      bottom,
    });
    const { container, getByRole, getByText } = render(TagsInputField, props);
    const whole = getByRole("group") as HTMLDivElement;

    expect(container.querySelector(`.${PARTS.TOP}`)).toBeNull();
    expect(whole).not.toHaveAttribute("aria-labelledby");

    props.label = "Now labeled";
    await tick();

    const lbl = getByText("Now labeled");
    const top = lbl.parentElement;
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole).toHaveAttribute("aria-labelledby", lbl.id);
  });

  test("reactive bottom updates description wiring", async () => {
    const props = $state({ bottom: "help-1" });
    const { getByRole, getByText, queryByText } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    getByText("help-1");
    expect(main).toHaveAccessibleDescription("help-1");

    props.bottom = "help-2";
    await tick();

    expect(queryByText("help-1")).toBeNull();
    getByText("help-2");
    expect(main).toHaveAccessibleDescription("help-2");
  });

  test("reactive max updates constraints", async () => {
    const props = $state({
      values: ["t1", "t2"],
      max: { value: 2, message: "max" },
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "t3");
    await user.keyboard("{Enter}");
    expect(props.values).toHaveLength(2);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    props.max = { value: 5, message: "max" };
    await tick();
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["t1", "t2", "t3"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("remove button name and type are exposed through Field", () => {
    const props = { values: ["alpha"] };
    const { getByRole } = render(TagsInputField, props);
    const button = getByRole("button", { name: /alpha/ });

    expect(button).toHaveAttribute("type", "button");
  });

  test("bindable element receives the textbox", async () => {
    const props = $state({
      element: undefined as TagsInputFieldElement,
    });
    const { getByRole } = render(TagsInputField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await tick();

    expect(props.element).toBe(main);
  });
});
