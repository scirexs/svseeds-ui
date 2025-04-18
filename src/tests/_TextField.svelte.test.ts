import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import TextField from "../lib/_TextField.svelte";
import { AREA, STATE, type StateName } from "../lib/core.ts";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet(
  (
    value: () => string,
    status: () => StateName,
    element: () => TextFieldElement,
  ) => {
    return { render: () => `<span data-testid="${auxid}">${value().length},${status.length},${element?.toString()}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    value: () => string,
    status: () => StateName,
    element: () => TextFieldElement,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${value().length},${status.length},${element?.toString()}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    value: () => string,
    status: () => StateName,
    element: () => TextFieldElement,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${value().length},${status.length},${element?.toString()}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const options = ["test1", "test2"];
  const actionfn = () => {
    return {};
  };

  test("no props", () => {
    const { getByRole } = render(TextField);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
    expect(main.tagName).toBe("INPUT");
    expect(main).toHaveAttribute("type", "text");
    expect(main).not.toHaveAttribute("list");
  });
  test("switch to text area", () => {
    const props = { type: "area" };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(main.tagName).toBe("TEXTAREA");
  });
  test("w/ label", () => {
    const props = { label };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "input" }) as HTMLInputElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild).toBe(main);
  });
  test("w/ label of action input", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const props = { label, action };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "input" }) as HTMLInputElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild).toBe(main);
    expect(action).toHaveBeenCalled();
  });
  test("w/ label of area", () => {
    const props = { label, type: "area" };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "textarea" }) as HTMLTextAreaElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild).toBe(main);
  });
  test("w/ label of action area", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const props = { label, type: "area", action };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "textarea" }) as HTMLTextAreaElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild).toBe(main);
    expect(action).toHaveBeenCalled();
  });
  test("w/ extra, w/o label", () => {
    const props = { extra };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
  });
  test("w/ label, extra", () => {
    const props = { label, extra };
    const { getByRole, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const lbl = getByText(label);
    within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild).toBe(main);
  });
  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { label, extra, aux };
    const { getByRole, getByTestId, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild).toBe(main);
    expect(aux).toHaveBeenCalled();
  });
  test("w/ left", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { left };
    const { getByRole, getByTestId } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement);
    expect(left).toHaveBeenCalled();
  });
  test("w/ right", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { right };
    const { getByRole, getByTestId } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement);
    expect(right).toHaveBeenCalled();
  });
  test("w/ bottom", () => {
    const props = { bottom };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
    expect(main).toHaveAttribute("aria-controls");
  });
  test("w/ bottom of action input", () => {
    const props = { bottom, action: actionfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
    expect(main).toHaveAttribute("aria-controls");
  });
  test("w/ bottom of area", () => {
    const props = { bottom, type: "area" };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
    expect(main).toHaveAttribute("aria-controls");
  });
  test("w/ bottom of action area", () => {
    const props = { bottom, type: "area", action: actionfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
    expect(main).toHaveAttribute("aria-controls");
  });
  test("w/ blank string", () => {
    const props = { label: " ", bottom: " " };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
  });
  test("w/ options", () => {
    const props = { options };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLInputElement;
    // const list = getByRole("listbox") as HTMLDataListElement; is implicit role BUT FAILED
    const list = main.nextElementSibling;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(list);
    const listid = list?.getAttribute("id");
    expect(main).toHaveAttribute("list", listid);
    expect(list?.children).toHaveLength(2);
  });
  test("w/ options of action input", () => {
    const props = { options, action: actionfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLInputElement;
    // const list = getByRole("listbox") as HTMLDataListElement; is implicit role BUT FAILED
    const list = main.nextElementSibling;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(list);
    const listid = list?.getAttribute("id");
    expect(main).toHaveAttribute("list", listid);
    expect(list?.children).toHaveLength(2);
  });
  test("w/ options of textarea", () => {
    const props = { type: "area", options };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLTextAreaElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
  });
  test("w/ empty options", () => {
    const props = { options: [] };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(main).toHaveAttribute("list");
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "text-field";
  const errmsg = "invalid";
  const validationFn = (value: string) => (value.length < 2 ? errmsg : "");
  const validations = [validationFn];

  test("w/ other types", async () => {
    const props = { label: "label", type: "password" };
    const { rerender, getByRole, getByLabelText } = render(TextField, props);
    let main = getByLabelText("label", { selector: "input" }) as HTMLInputElement;
    expect(main).toHaveAttribute("type", "password");

    await rerender({ type: "search" });
    main = getByRole("searchbox") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "search");

    await rerender({ type: "number" });
    main = getByRole("spinbutton") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "number");

    await rerender({ type: "email" });
    main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "email");

    await rerender({ type: "url" });
    main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "url");

    await rerender({ type: "tel" });
    main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "tel");
  });
  test("w/ default value", async () => {
    const value = "default_value";
    const props = { value };
    const { rerender, getByRole } = render(TextField, props);
    let main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveValue(value);

    await rerender({ type: "area", value });
    main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveValue(value);
  });
  test("w/ specify id", () => {
    const id = "id_foo";
    const props = { attributes: { id } };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveAttribute("id", id);
  });
  test("w/ specify ignored attrs", () => {
    const props = { attributes: { value: "v", class: "c", type: "hidden", list: "l" } };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(main).not.toHaveValue("v");
    expect(main).not.toHaveAttribute("class", "c");
    expect(main).not.toHaveAttribute("type", "hidden");
    expect(main).not.toHaveAttribute("list");
  });
  test("w/ specify major attrs", async () => {
    const props = { attributes: { name: "n", placeholder: "p", maxlength: 5, required: true, readonly: true } };
    const { rerender, getByPlaceholderText } = render(TextField, props);
    let main: HTMLInputElement | HTMLTextAreaElement = getByPlaceholderText("p") as HTMLInputElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("maxlength", "5");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("readonly");

    await rerender({ type: "area", ...props });
    main = getByPlaceholderText("p") as HTMLTextAreaElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("maxlength", "5");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("readonly");
  });

  test("major state transition", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      status: STATE.DEFAULT,
      validations: [mockValidation],
    });
    const user = userEvent.setup();
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await user.type(main, "a");
    expect(props.status).toBe(STATE.DEFAULT);
    await user.tab();
    expect(mockValidation).toHaveBeenCalled();
    expect(props.status).toBe(STATE.INACTIVE);
    getByRole("alert") as HTMLOutputElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
    await user.type(main, "a");
    expect(props.status).toBe(STATE.ACTIVE);
    await user.clear(main);
    expect(props.status).toBe(STATE.INACTIVE);
    await user.tab();
    expect(props.status).toBe(STATE.DEFAULT);
  });
  test("w/ required and no validations", async () => {
    const props = $state({
      status: STATE.DEFAULT,
      attributes: { required: true },
    });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await fireEvent.invalid(main); // simulation of main.checkValidity() with empty
    getByRole("alert") as HTMLOutputElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage();
    expect(props.status).toBe(STATE.INACTIVE);
  });
  test("w/ required and custom validations", async () => {
    const props = $state({
      bottom,
      status: STATE.DEFAULT,
      validations,
      attributes: { required: true },
    });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await fireEvent.invalid(main); // simulation of main.checkValidity() with empty
    getByRole("alert") as HTMLOutputElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
    expect(props.status).toBe(STATE.INACTIVE);
  });
  test("w/ custom events used internally", async () => {
    const onchange = vi.fn();
    const oninput = vi.fn();
    const oninvalid = vi.fn();
    const props = $state({
      status: STATE.DEFAULT,
      validations,
      attributes: { onchange, oninput, oninvalid, required: true },
    });
    const user = userEvent.setup();
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await fireEvent.invalid(main); // simulation of main.checkValidity() with empty
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.status).toBe(STATE.INACTIVE);
    await user.type(main, "aa");
    expect(oninput).toHaveBeenCalledTimes(2);
    expect(props.status).toBe(STATE.ACTIVE);
    await user.tab();
    expect(onchange).toHaveBeenCalledTimes(1);
  });
  test("default class of each status", async () => {
    const props = $state({
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.DEFAULT,
      validations,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(props.status).toBe(STATE.DEFAULT);
    expect(whole).toHaveClass(seed, AREA.WHOLE);
    expect(top).toHaveClass(seed, AREA.TOP);
    expect(lbl).toHaveClass(seed, AREA.LABEL);
    expect(ext).toHaveClass(seed, AREA.EXTRA);
    expect(auxdv).toHaveClass(seed, AREA.AUX);
    expect(middle).toHaveClass(seed, AREA.MIDDLE);
    expect(leftdv).toHaveClass(seed, AREA.LEFT);
    expect(main).toHaveClass(seed, AREA.MAIN);
    expect(rightdv).toHaveClass(seed, AREA.RIGHT);
    expect(btm).toHaveClass(seed, AREA.BOTTOM);
    await user.type(main, "a");
    await user.tab();
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(seed, AREA.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(seed, AREA.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(seed, AREA.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(seed, AREA.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(seed, AREA.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(seed, AREA.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(seed, AREA.LEFT, STATE.INACTIVE);
    expect(main).toHaveClass(seed, AREA.MAIN, STATE.INACTIVE);
    expect(rightdv).toHaveClass(seed, AREA.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(seed, AREA.BOTTOM, STATE.INACTIVE);
    await user.type(main, "a");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(seed, AREA.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(seed, AREA.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(seed, AREA.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(seed, AREA.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(seed, AREA.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(seed, AREA.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(seed, AREA.LEFT, STATE.ACTIVE);
    expect(main).toHaveClass(seed, AREA.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(seed, AREA.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(seed, AREA.BOTTOM, STATE.ACTIVE);
  });
  test("w/ string style class of each status", async () => {
    const clsid = "style_id";
    const props = $state({
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.DEFAULT,
      validations,
      style: clsid,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(props.status).toBe(STATE.DEFAULT);
    expect(whole).toHaveClass(clsid, AREA.WHOLE);
    expect(top).toHaveClass(clsid, AREA.TOP);
    expect(lbl).toHaveClass(clsid, AREA.LABEL);
    expect(ext).toHaveClass(clsid, AREA.EXTRA);
    expect(auxdv).toHaveClass(clsid, AREA.AUX);
    expect(middle).toHaveClass(clsid, AREA.MIDDLE);
    expect(leftdv).toHaveClass(clsid, AREA.LEFT);
    expect(main).toHaveClass(clsid, AREA.MAIN);
    expect(rightdv).toHaveClass(clsid, AREA.RIGHT);
    expect(btm).toHaveClass(clsid, AREA.BOTTOM);
    await user.type(main, "a");
    await user.tab();
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(clsid, AREA.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(clsid, AREA.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(clsid, AREA.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(clsid, AREA.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(clsid, AREA.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(clsid, AREA.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(clsid, AREA.LEFT, STATE.INACTIVE);
    expect(main).toHaveClass(clsid, AREA.MAIN, STATE.INACTIVE);
    expect(rightdv).toHaveClass(clsid, AREA.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(clsid, AREA.BOTTOM, STATE.INACTIVE);
    await user.type(main, "a");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(clsid, AREA.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(clsid, AREA.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(clsid, AREA.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(clsid, AREA.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(clsid, AREA.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(clsid, AREA.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(clsid, AREA.LEFT, STATE.ACTIVE);
    expect(main).toHaveClass(clsid, AREA.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(clsid, AREA.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(clsid, AREA.BOTTOM, STATE.ACTIVE);
  });
  test("w/ obj style of each status", async () => {
    const dynObj = {
      constant: "const",
      default: "dyn_default",
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
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.DEFAULT,
      validations,
      style,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = main.parentElement;
    const btm = getByRole("status") as HTMLOutputElement;
    expect(props.status).toBe(STATE.DEFAULT);
    expect(whole).toHaveClass(dynObj.constant, dynObj.default);
    expect(top).toHaveClass(dynObj.constant, dynObj.default);
    expect(lbl).toHaveClass(dynObj.constant, dynObj.default);
    expect(ext).toHaveClass(dynObj.constant, dynObj.default);
    expect(auxdv).toHaveClass(dynObj.constant, dynObj.default);
    expect(middle).toHaveClass(dynObj.constant, dynObj.default);
    expect(leftdv).toHaveClass(dynObj.constant, dynObj.default);
    expect(main).toHaveClass(dynObj.constant, dynObj.default);
    expect(rightdv).toHaveClass(dynObj.constant, dynObj.default);
    expect(btm).toHaveClass(dynObj.constant, dynObj.default);
    await user.type(main, "a");
    await user.tab();
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(top).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(leftdv).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(main).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(rightdv).toHaveClass(dynObj.constant, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.constant, dynObj.inactive);
    await user.type(main, "a");
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(dynObj.constant, dynObj.active);
    expect(top).toHaveClass(dynObj.constant, dynObj.active);
    expect(lbl).toHaveClass(dynObj.constant, dynObj.active);
    expect(ext).toHaveClass(dynObj.constant, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.constant, dynObj.active);
    expect(middle).toHaveClass(dynObj.constant, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.constant, dynObj.active);
    expect(main).toHaveClass(dynObj.constant, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.constant, dynObj.active);
    expect(btm).toHaveClass(dynObj.constant, dynObj.active);
  });
});
