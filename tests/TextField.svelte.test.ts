import axe from "axe-core";
import { describe, expect, test, vi } from "vitest";
import { render as svRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import TextField from "#svs/TextField.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement | undefined;
const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet((value: () => string, variant: () => string, element: () => TextFieldElement) => {
  return { render: () => `<span data-testid="${auxid}">${value().length},${variant.length},${element?.toString()}</span>` };
});
const leftfn = createRawSnippet((value: () => string, variant: () => string, element: () => TextFieldElement) => {
  return { render: () => `<span data-testid="${leftid}">${value().length},${variant.length},${element?.toString()}</span>` };
});
const rightfn = createRawSnippet((value: () => string, variant: () => string, element: () => TextFieldElement) => {
  return { render: () => `<span data-testid="${rightid}">${value().length},${variant.length},${element?.toString()}</span>` };
});

const byRole = (container: HTMLElement, role: string) => {
  const selectors: Record<string, string> = {
    alert: '[role="alert"]',
    combobox: "input",
    group: '[role="group"]',
    searchbox: 'input[type="search"]',
    status: '[role="status"]',
    textbox: "input, textarea",
  };
  return Array.from(container.querySelectorAll(selectors[role] ?? `[role="${role}"]`)) as HTMLElement[];
};
const byTestId = (container: ParentNode, id: string) => Array.from(container.querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[];
const byText = (container: ParentNode, text: string) => {
  const nodes = Array.from(container.querySelectorAll("*")) as HTMLElement[];
  const node = [...nodes].reverse().find((element) => {
    const direct = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join("")
      .trim();
    return direct === text || element.textContent?.trim() === text;
  });
  if (!node) throw new Error(`No element with text ${text}`);
  return node;
};
const labelControl = (container: ParentNode, label: string, selector?: string) => {
  const target = Array.from(container.querySelectorAll("label")).find((node) => node.textContent?.includes(label));
  return target?.htmlFor ? container.querySelector(`#${target.htmlFor}`) : target?.querySelector(selector ?? "input, textarea");
};
const within = (container: HTMLElement) => ({
  getByText: (text: string) => byText(container, text),
  getByTestId: (id: string) => byTestId(container, id)[0],
});
const render = (component: any, props?: any) => {
  const result = svRender(component, props);
  const { container } = result;
  return {
    ...result,
    getByLabelText: (label: string, options?: { selector?: string }) => labelControl(container, label, options?.selector),
    getByPlaceholderText: (placeholder: string) => container.querySelector(`[placeholder="${placeholder}"]`),
    getByRole: (role: string) => {
      const node = byRole(container, role)[0];
      if (!node) throw new Error(`No element with role ${role}`);
      return node;
    },
    getByTestId: (id: string) => byTestId(container, id)[0],
    getByText: (text: string) => byText(container, text),
    queryByRole: (role: string) => byRole(container, role)[0] ?? null,
    queryByTestId: (id: string) => byTestId(container, id)[0] ?? null,
    queryByText: (text: string) => byText(container, text) ?? null,
  };
};
const invalid = async (element: Element) => {
  element.dispatchEvent(new Event("invalid", { cancelable: true }));
  await tick();
};

describe("Switching existence of elements", () => {
  const options = new Set(["test1", "test2"]);
  const attachfn = () => {};

  test("no props", () => {
    const { getByRole } = render(TextField);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main.tagName).toBe("INPUT");
    expect(main).toHaveAttribute("type", "text");
    expect(main).not.toHaveAttribute("list");
  });
  test("switch to text area", () => {
    const props = { type: "textarea" as const };
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
    const top = lbl.parentElement;
    expect(top).toHaveClass("svs-text-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label of attach input", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { label, attach };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "input" }) as HTMLInputElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    const top = lbl.parentElement;
    expect(top).toHaveClass("svs-text-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(attach).toHaveBeenCalled();
  });
  test("w/ label of area", () => {
    const props = { label, type: "textarea" as const };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "textarea" }) as HTMLTextAreaElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    const top = lbl.parentElement;
    expect(top).toHaveClass("svs-text-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
  });
  test("w/ label of attach area", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { label, type: "textarea" as const, attach };
    const { getByRole, getByLabelText, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByLabelText(label, { selector: "textarea" }) as HTMLTextAreaElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    const top = lbl.parentElement;
    expect(top).toHaveClass("svs-text-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
    expect(attach).toHaveBeenCalled();
  });
  test("w/ extra, w/o label", () => {
    const props = { extra };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ label, extra", () => {
    const props = { label, extra };
    const { getByRole, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const lbl = getByText(label);
    within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    const top = lbl.parentElement;
    expect(top).toHaveClass("svs-text-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
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
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(whole.lastElementChild).toBe(main.parentElement);
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
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ reserved bottom", () => {
    const props = { reserve: true };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass("svs-text-field", PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(main).not.toHaveAttribute("aria-describedby");
  });
  test("w/ bottom of attach input", () => {
    const props = { bottom, attach: attachfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ bottom of area", () => {
    const props = { bottom, type: "textarea" as const };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ bottom of attach area", () => {
    const props = { bottom, type: "textarea" as const, attach: attachfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main.parentElement);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ blank string", () => {
    const props = { label: " ", bottom: " " };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main.parentElement);
  });
  test("w/ options", () => {
    const props = { options };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLInputElement;
    // const list = getByRole("listbox") as HTMLDataListElement; is implicit role BUT FAILED
    const list = main.nextElementSibling;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.children).toHaveLength(2);
    expect(whole.firstElementChild?.firstElementChild).toBe(main);
    expect(whole.firstElementChild?.lastElementChild).toBe(list);
    const listid = list?.getAttribute("id");
    expect(main).toHaveAttribute("list", listid);
    expect(list?.children).toHaveLength(2);
  });
  test("w/ options of attach input", () => {
    const props = { options, attach: attachfn };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("combobox") as HTMLInputElement;
    // const list = getByRole("listbox") as HTMLDataListElement; is implicit role BUT FAILED
    const list = main.nextElementSibling;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.children).toHaveLength(2);
    expect(whole.firstElementChild?.firstElementChild).toBe(main);
    expect(whole.firstElementChild?.lastElementChild).toBe(list);
    const listid = list?.getAttribute("id");
    expect(main).toHaveAttribute("list", listid);
    expect(list?.children).toHaveLength(2);
  });
  test("w/ options of textarea", () => {
    const props = { type: "textarea" as const, options };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLTextAreaElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild?.lastElementChild).toBe(main);
  });
  test("w/ empty options", () => {
    const props = { options: new Set<string>() };
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
    expect(whole.firstElementChild?.lastElementChild).toBe(main);
    expect(main).not.toHaveAttribute("list");
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const seed = "svs-text-field";
  const errmsg = "invalid";
  const validationFn = ({ value }: { value: string }) => (value.length < 2 ? errmsg : "");
  const validations = [validationFn];

  test("w/ other types", async () => {
    const props = { label: "label", type: "password" as const };
    const { rerender, getByRole, getByLabelText } = render(TextField, props);
    let main = getByLabelText("label", { selector: "input" }) as HTMLInputElement;
    expect(main).toHaveAttribute("type", "password");

    await rerender({ type: "search" });
    main = getByRole("searchbox") as HTMLInputElement;
    expect(main).toHaveAttribute("type", "search");

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

    await rerender({ type: "textarea" as const, value });
    main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveValue(value);
  });
  test("w/ specify id", () => {
    const id = "id_foo";
    const props = { id };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(main).toHaveAttribute("id", id);
  });
  test("class merged onto control, list controlled", () => {
    const props = { class: "c", list: "l" } as any;
    const { getByRole, container } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    const root = container.querySelector('[role="group"]') as HTMLElement;
    expect(main).toHaveClass("c"); // merged onto the control (same as ...rest)
    expect(root).not.toHaveClass("c"); // not on the WHOLE root
    expect(main).not.toHaveAttribute("list"); // controlled (no options)
  });
  test("w/ specify major attrs", async () => {
    const props = { name: "n", placeholder: "p", maxlength: 5, required: true, readonly: true };
    const { rerender, getByPlaceholderText } = render(TextField, props);
    let main: HTMLInputElement | HTMLTextAreaElement = getByPlaceholderText("p") as HTMLInputElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("maxlength", "5");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("readonly");

    await rerender({ type: "textarea" as const, ...props });
    main = getByPlaceholderText("p") as HTMLTextAreaElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("maxlength", "5");
    expect(main).toHaveAttribute("required");
    expect(main).toHaveAttribute("readonly");
  });

  test("major state transition", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
    });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await user.type(main, "a");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await user.tab();
    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(expect.objectContaining({ value: "a", validity: expect.anything(), element: main }));
    expect(props.variant).toBe(VARIANT.INACTIVE);
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
    await user.type(main, "a");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await user.clear(main);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await user.type(main, "a");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await user.type(main, "a");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await user.tab();
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });
  test("w/ required and no validations", async () => {
    const props = $state({
      variant: VARIANT.NEUTRAL,
      required: true,
    });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await invalid(main); // simulation of main.checkValidity() with empty
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage();
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
  test("w/ required and custom validations", async () => {
    const props = $state({
      bottom,
      variant: VARIANT.NEUTRAL,
      validations,
      required: true,
    });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await invalid(main); // simulation of main.checkValidity() with empty
    getByRole("alert") as HTMLDivElement;
    expect(main).toHaveAttribute("aria-invalid", "true");
    expect(main).toHaveAccessibleErrorMessage(errmsg);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
  test("w/ custom events used internally", async () => {
    const onchange = vi.fn();
    const oninput = vi.fn();
    const oninvalid = vi.fn();
    const props = $state({
      variant: VARIANT.NEUTRAL,
      validations,
      onchange,
      oninput,
      oninvalid,
      required: true,
    });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await invalid(main); // simulation of main.checkValidity() with empty
    expect(oninvalid).toHaveBeenCalledTimes(1);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await user.type(main, "aa");
    expect(oninput).toHaveBeenCalledTimes(2);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await user.tab();
    expect(onchange).toHaveBeenCalledTimes(1);
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
    const user = userEvent;
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
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
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
    await user.type(main, "a");
    await user.tab();
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
    expect(btm).toHaveAttribute("role", "alert");
    await user.type(main, "a");
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
    const user = userEvent;
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
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
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
    await user.type(main, "a");
    await user.tab();
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
    expect(btm).toHaveAttribute("role", "alert");
    await user.type(main, "a");
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
    const user = userEvent;
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
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
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
    await user.type(main, "a");
    await user.tab();
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
    expect(btm).toHaveAttribute("role", "alert");
    await user.type(main, "a");
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

describe("a11y, structure & textarea attrs", () => {
  const seed = "svs-text-field";
  const errmsg = "invalid";
  const validationFn = ({ value }: { value: string }) => (value.length < 2 ? errmsg : "");
  const validations = [validationFn];

  test("bottom role transitions: none, alert, none", async () => {
    const props = $state({ bottom, variant: VARIANT.NEUTRAL, validations });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");

    await user.type(main, "a");
    await user.tab();
    expect(getByRole("alert")).toBe(btm);
    expect(btm).toHaveTextContent(errmsg);

    await user.type(main, "a");
    expect(btm).not.toHaveAttribute("role");
    expect(btm).toHaveTextContent(bottom);
  });

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ reserve: true, variant: VARIANT.NEUTRAL, validations });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).toHaveTextContent("");
    expect(main).not.toHaveAttribute("aria-describedby");

    await user.type(main, "a");
    await user.tab();
    expect(getByRole("alert")).toBe(btm);
    expect(btm).toHaveTextContent(errmsg);

    await user.type(main, "a");
    expect(whole.lastElementChild).toBe(btm);
    expect(btm).not.toHaveAttribute("role");
    expect(btm).toHaveTextContent("");
  });

  test("help text is not a live region in neutral", () => {
    const props = { bottom };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(() => getByRole("status")).toThrow();
    expect(main).toHaveAccessibleDescription(bottom);
  });

  test("label-only field is wrapped in top", () => {
    const props = { label };
    const { getByRole, getByText } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const lbl = getByText(label);
    const top = lbl.parentElement as HTMLDivElement;
    expect(top.tagName).toBe("DIV");
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
  });

  test("aux-only field renders top without a label", () => {
    const props = { aux: auxfn };
    const { getByRole, getByTestId } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const auxsp = getByTestId(auxid);
    const top = auxsp.parentElement?.parentElement as HTMLDivElement;
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(top.querySelector("label")).toBeNull();
  });

  test("no label and no aux renders no top", () => {
    const props = { bottom };
    const { container, getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    expect(container.querySelector(`.${PARTS.TOP}`)).toBeNull();
    expect(whole.firstElementChild).toBe(main.parentElement);
  });

  test("dynamic bottom updates reactively", async () => {
    const { rerender, getByRole, getByText } = render(TextField, { bottom: "help-1" });
    const main = getByRole("textbox") as HTMLInputElement;
    getByText("help-1");
    expect(main).toHaveAccessibleDescription("help-1");

    await rerender({ bottom: "help-2" });
    getByText("help-2");
    expect(main).toHaveAccessibleDescription("help-2");
  });

  test("error message restores bottom text when valid again", async () => {
    const props = $state({ bottom, variant: VARIANT.NEUTRAL, validations });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const whole = getByRole("group") as HTMLDivElement;
    const main = getByRole("textbox") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;

    await user.type(main, "a");
    await user.tab();
    expect(btm).toHaveTextContent(errmsg);

    await user.type(main, "a");
    expect(btm).toHaveTextContent(bottom);
  });

  test('type="textarea" renders a textarea', () => {
    const props = { type: "textarea" as const };
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLTextAreaElement;
    expect(main.tagName).toBe("TEXTAREA");
  });

  test("cols, rows and wrap apply to textarea only", () => {
    const textareaProps = { type: "textarea" as const, cols: 30, rows: 5, wrap: "hard" as const };
    const textareaRender = render(TextField, textareaProps);
    const textarea = textareaRender.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute("cols", "30");
    expect(textarea).toHaveAttribute("rows", "5");
    expect(textarea).toHaveAttribute("wrap", "hard");
    textareaRender.unmount();

    const inputProps = { cols: 30, rows: 5, wrap: "hard" as const };
    const inputRender = render(TextField, inputProps);
    const input = inputRender.getByRole("textbox") as HTMLInputElement;
    expect(input).not.toHaveAttribute("cols");
    expect(input).not.toHaveAttribute("rows");
    expect(input).not.toHaveAttribute("wrap");
  });

  test("bottom renders after middle", () => {
    const lastRender = render(TextField, { bottom });
    const lastWhole = lastRender.getByRole("group") as HTMLDivElement;
    const lastMain = lastRender.getByRole("textbox") as HTMLInputElement;
    expect(lastWhole.firstElementChild).toBe(lastMain.parentElement);
    expect(lastWhole.lastElementChild).toHaveTextContent(bottom);
  });

  test("bindable element exposes the control", () => {
    const props = $state({ element: undefined as TextFieldElement });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(props.element).toBe(main);
  });

  test("snippet args receive reactive value, variant and element", async () => {
    const stateid = "test-state";
    let valueArg: (() => string) | undefined;
    let variantArg: (() => string) | undefined;
    let elementArg: (() => TextFieldElement) | undefined;
    const statefn = createRawSnippet((value: () => string, variant: () => string, element: () => TextFieldElement) => {
      valueArg = value;
      variantArg = variant;
      elementArg = element;
      return { render: () => `<span data-testid="${stateid}">${value().length},${variant()},${element()?.tagName}</span>` };
    });
    const props = $state({ left: statefn, value: "", variant: VARIANT.NEUTRAL });
    const user = userEvent;
    const { getByRole, getByTestId } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    expect(getByTestId(stateid)).toHaveTextContent("0,neutral,undefined");

    await user.type(main, "abc");
    expect(valueArg?.()).toBe("abc");
    expect(variantArg?.()).toBe(VARIANT.NEUTRAL);
    expect(elementArg?.()).toBe(main);
  });

  test("validations receive ValidityState", async () => {
    const validation = vi.fn(({ value, validity }: { value: string; validity: ValidityState }) =>
      !value && validity.valueMissing ? errmsg : "",
    );
    const props = $state({
      required: true,
      variant: VARIANT.NEUTRAL,
      validations: [validation],
    });
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await invalid(main);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent(errmsg);
    const actualValidity = validation.mock.calls.at(-1)?.[0].validity as ValidityState;
    expect(actualValidity.valueMissing).toBe(true);
  });

  test("multiple validations short-circuit on first message", async () => {
    const first = vi.fn(({ value }: { value: string }) => (value.length < 2 ? "first" : ""));
    const second = vi.fn(({ value }: { value: string }) => (value.includes("x") ? "second" : ""));
    const props = $state({ variant: VARIANT.NEUTRAL, validations: [first, second] });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    first.mockClear();
    second.mockClear();

    await user.type(main, "a");
    await user.tab();
    expect(getByRole("alert")).toHaveTextContent("first");
    expect(second).not.toHaveBeenCalled();
  });

  test("null validation result is valid", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL, validations: [() => null] });
    const user = userEvent;
    const { getByRole, queryByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await user.type(main, "a");
    await user.tab();

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();
  });

  test("custom neutral variant is preserved and restored", async () => {
    const props = $state({ variant: "warning", validations });
    const user = userEvent;
    const { getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;
    await user.type(main, "a");
    await user.tab();
    expect(props.variant).toBe(VARIANT.INACTIVE);

    await user.type(main, "a");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.clear(main);
    expect(props.variant).toBe("warning");
  });
});

describe("accessibility (axe)", () => {
  test("default render has no violations", async () => {
    const { container } = render(TextField, { label });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("invalid state has no violations", async () => {
    const msg = "invalid";
    const props = $state({
      label,
      required: true,
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: string }) => (value.length < 2 ? msg : "")],
    });
    const { container, getByRole } = render(TextField, props);
    const main = getByRole("textbox") as HTMLInputElement;

    await invalid(main);
    await expect.element(main).toHaveAttribute("aria-invalid", "true");
    await expect.element(getByRole("alert")).toHaveTextContent(msg);
    expect(await axe.run(container)).toHaveNoViolations();
  });
});
