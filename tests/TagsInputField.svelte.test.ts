import axe from "axe-core";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import TagsInputField from "#svs/TagsInputField.svelte";
import TagsInputFieldEmbedded from "./fixtures/TagsInputFieldEmbedded.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

type TagsInputFieldElement = HTMLInputElement | undefined;
const element = (target: Element | null | undefined) => expect.element(target as HTMLElement | null);
const byBtnName = (root: ParentNode, name: string | RegExp) =>
  [...root.querySelectorAll("button")].find((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    return typeof name === "string" ? label === name : name.test(label);
  }) as HTMLButtonElement;
const byText = (root: ParentNode, text: string) =>
  ([...root.querySelectorAll("*")].find(
    (el) => el.textContent?.trim() === text && ![...el.children].some((child) => child.textContent?.trim() === text),
  ) ??
    [...root.querySelectorAll("*")]
      .filter((el) => el.textContent?.includes(text))
      .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0]) as HTMLElement;
const byTextOrNull = (root: ParentNode, text: string) => byText(root, text) ?? null;
const byAllText = (root: ParentNode, text: string) =>
  [...root.querySelectorAll("*")].filter((el) => el.textContent?.trim() === text) as HTMLElement[];
const paste = async (input: HTMLInputElement, text: string) => {
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  await tick();
};
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

describe("Switching existence of elements", async () => {
  test("no props", async () => {
    const { container } = render(TagsInputField);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    expect(whole.tagName).toBe("DIV");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label", async () => {
    const props = { label };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const top = lbl.parentElement;
    await element(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    await element(top).toHaveClass("svs-tags-input-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ extra, w/o label", async () => {
    const props = { extra };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra", async () => {
    const props = { label, extra };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const ext = byText(lbl, extra);
    const top = lbl.parentElement;
    expect(whole.children).toHaveLength(2);
    await element(top).toHaveClass("svs-tags-input-field", PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    expect(whole.firstElementChild?.firstElementChild?.firstElementChild).toBe(ext);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
  });

  test("w/ label, extra, aux", async () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { label, extra, aux };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const auxsp = container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement);
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV");
    expect(aux).toHaveBeenCalled();
  });

  test("w/ left", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { left };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement);
    expect(left).toHaveBeenCalled();
  });

  test("w/ right", async () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { right };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement);
    expect(right).toHaveBeenCalled();
  });

  test("w/ bottom", async () => {
    const props = { bottom };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.lastElementChild).toBe(btm);
    await element(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    await element(main).toHaveAccessibleDescription(bottom);
  });
  test("w/ reserved bottom", async () => {
    const props = { reserve: true };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    await element(btm).toHaveClass("svs-tags-input-field", PARTS.BOTTOM);
    await element(btm).toHaveTextContent("");
    expect(whole.children).toHaveLength(2);
    expect(whole.lastElementChild).toBe(btm);
    expect(main).not.toHaveAttribute("aria-describedby");
  });

  test("w/ blank string", async () => {
    const props = { label: " ", bottom: " " };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.firstElementChild).toBe(main.parentElement);
  });

  test("w/ initial values", async () => {
    const values = ["tag1", "tag2"];
    const props = { values };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const tag1 = byAllText(container, "tag1");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild?.firstElementChild).toBe(main.parentElement);
    expect(tag1).toHaveLength(1);
  });

  test("w/ bottom", async () => {
    const props = { bottom };
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    await element(btm).toHaveTextContent(bottom);
    expect(btm).not.toHaveAttribute("role");
    expect(whole.firstElementChild?.firstElementChild).toBe(main.parentElement);
  });
});

describe("Specify props & state transition & event handlers", async () => {
  const seed = "svs-tags-input-field";
  const errmsg = "invalid";
  const constraintFn = ({ value }: { value: string }) => (value.length < 2 ? errmsg : "");
  const validationFn = ({ value }: { value: string[] }) => (value.length === 0 ? errmsg : "");
  const validations = [validationFn];

  test("reserved bottom stays mounted across error transition", async () => {
    const props = $state({ reserve: true, variant: VARIANT.NEUTRAL, validations });
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const btm = whole.lastElementChild as HTMLDivElement;
    await element(btm).toHaveClass(seed, PARTS.BOTTOM);
    await element(btm).toHaveTextContent("");
    expect(main).not.toHaveAttribute("aria-describedby");

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(container.querySelector('[role="alert"]') as HTMLDivElement).toBe(btm);
    await element(btm).toHaveTextContent(errmsg);

    await userEvent.type(main, "validtag");
    await userEvent.keyboard("{Enter}");
    expect(whole.lastElementChild).toBe(btm);
    expect(btm).not.toHaveAttribute("role");
    await element(btm).toHaveTextContent("");
  });

  test("w/ default values", async () => {
    const values = ["initial"];
    const props = { values };
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;
    await element(main).toHaveValue("");
    byText(container, "initial");
  });

  test("w/ min-equivalent validation", async () => {
    const props = $state({
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: string[] }) => (value.length < 2 ? "At least 2 tags required" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;
    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("At least 2 tags required");
  });

  test("w/ max-equivalent constraint", async () => {
    const values = ["tag1", "tag2"];
    const props = $state({
      values,
      variant: VARIANT.NEUTRAL,
      constraints: [({ values }: { values: string[] }) => (values.length >= 2 ? "Maximum 2 tags allowed" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "tag3");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("Maximum 2 tags allowed");
  });

  test("paste commits all values that pass constraints", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      constraints: [({ value }: { value: string }) => (value === "bad" ? "bad value" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await paste(main, "ok,bad,ok2");
    await tick();

    expect(props.values).toEqual(["ok", "ok2"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("bad value");
  });

  test("paste with all-passing values commits the whole batch", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      constraints: [() => null],
    });
    const { container } = render(TagsInputField, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,b,c");
    await tick();

    expect(props.values).toEqual(["a", "b", "c"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test("count constraint caps a single paste", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      constraints: [({ values }: { values: string[] }) => (values.length >= 2 ? "max 2" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await paste(main, "a,b,c");
    await tick();

    expect(props.values).toEqual(["a", "b"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("max 2");
  });

  test("single add still validates", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      constraints: [({ value }: { value: string }) => (value === "bad" ? "bad value" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "bad");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("bad value");
  });

  test("failed add message does not persist after external values update", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      constraints: [({ value }: { value: string }) => (value === "bad" ? "bad value" : null)],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "bad");
    await userEvent.keyboard("{Enter}");
    await element(main).toHaveAccessibleErrorMessage("bad value");

    props.values = ["ok"];
    await tick();

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test("field separator prop reaches the default control", async () => {
    const props = $state({
      values: [] as string[],
      tagsInput: { separator: ";" },
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "a,");

    expect(props.values).toEqual([]);

    await userEvent.type(main, ";");

    expect(props.values).toEqual(["a,"]);
  });

  test("field paste=false disables paste splitting", async () => {
    const props = $state({
      values: [] as string[],
      tagsInput: { paste: false },
    });
    const { container } = render(TagsInputField, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(props.values).toEqual([]);
  });

  test("tagsInput bag forwards arbitrary child props to the default control", async () => {
    const props = $state({
      values: ["a"] as string[],
      tagsInput: { removeAriaLabel: (t: string) => `del ${t}` },
    });
    const { container } = render(TagsInputField, props);

    expect(byBtnName(container, "del a")).toBeTruthy();
  });

  test("major state transition with constraints", async () => {
    const mockConstraint = vi.fn().mockImplementation(constraintFn);
    const props = $state({
      variant: VARIANT.NEUTRAL,
      constraints: [mockConstraint],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "a");
    await userEvent.keyboard("{Enter}");

    expect(mockConstraint).toHaveBeenCalled();
    expect(mockConstraint).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "a", values: [], validity: expect.anything(), element: main }),
    );
    expect(props.variant).toBe(VARIANT.INACTIVE);
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await element(main).toHaveAttribute("aria-invalid", "true");
    await element(main).toHaveAccessibleErrorMessage(errmsg);

    await userEvent.type(main, "aa");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("major state transition with validations", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      variant: VARIANT.NEUTRAL,
      validations: [mockValidation],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();

    expect(mockValidation).toHaveBeenCalled();
    expect(mockValidation).toHaveBeenLastCalledWith(expect.objectContaining({ value: [], validity: expect.anything(), element: main }));
    expect(props.variant).toBe(VARIANT.INACTIVE);
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await element(main).toHaveAttribute("aria-invalid", "true");
    await element(main).toHaveAccessibleErrorMessage(errmsg);
  });

  test("tag addition and removal", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    // Add a tag
    await userEvent.type(main, "newtag");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toContain("newtag");
    byText(container, "newtag");

    // Remove the tag
    const removeButton = byText(container, "newtag").parentElement?.querySelector("button");
    if (removeButton) {
      await userEvent.click(removeButton);
    }

    expect(props.values).not.toContain("newtag");
    expect(byTextOrNull(container, "newtag")).toBeNull();
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
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const ext = byText(lbl, extra);
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await element(whole).toHaveClass(seed, PARTS.WHOLE);
    await element(top).toHaveClass(seed, PARTS.TOP);
    await element(lbl).toHaveClass(seed, PARTS.LABEL);
    await element(ext).toHaveClass(seed, PARTS.EXTRA);
    await element(auxdv).toHaveClass(seed, PARTS.AUX);
    await element(middle).toHaveClass(seed, PARTS.MIDDLE);
    await element(leftdv).toHaveClass(seed, PARTS.LEFT);
    // await element(main).toHaveClass(seed, PARTS.MAIN);
    await element(rightdv).toHaveClass(seed, PARTS.RIGHT);
    await element(btm).toHaveClass(seed, PARTS.BOTTOM);
    expect(btm).not.toHaveAttribute("role");

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    await element(top).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    await element(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    await element(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.INACTIVE);
    await element(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.INACTIVE);
    await element(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.INACTIVE);
    await element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    // await element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    await element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
    await element(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.INACTIVE);
    await element(btm).toHaveAttribute("role", "alert");

    await userEvent.type(main, "validtag");
    await userEvent.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    await element(top).toHaveClass(seed, PARTS.TOP, VARIANT.ACTIVE);
    await element(lbl).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    await element(ext).toHaveClass(seed, PARTS.EXTRA, VARIANT.ACTIVE);
    await element(auxdv).toHaveClass(seed, PARTS.AUX, VARIANT.ACTIVE);
    await element(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.ACTIVE);
    await element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    // await element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    await element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);
    await element(btm).toHaveClass(seed, PARTS.BOTTOM, VARIANT.ACTIVE);
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
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const ext = byText(lbl, extra);
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await element(whole).toHaveClass(clsid, PARTS.WHOLE);
    await element(top).toHaveClass(clsid, PARTS.TOP);
    await element(lbl).toHaveClass(clsid, PARTS.LABEL);
    await element(ext).toHaveClass(clsid, PARTS.EXTRA);
    await element(auxdv).toHaveClass(clsid, PARTS.AUX);
    await element(middle).toHaveClass(clsid, PARTS.MIDDLE);
    await element(leftdv).toHaveClass(clsid, PARTS.LEFT);
    // await element(main).toHaveClass(clsid, PARTS.MAIN);
    await element(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    await element(btm).toHaveClass(clsid, PARTS.BOTTOM);
    expect(btm).not.toHaveAttribute("role");

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.INACTIVE);
    await element(top).toHaveClass(clsid, PARTS.TOP, VARIANT.INACTIVE);
    await element(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.INACTIVE);
    await element(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.INACTIVE);
    await element(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.INACTIVE);
    await element(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.INACTIVE);
    await element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.INACTIVE);
    // await element(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.INACTIVE);
    await element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.INACTIVE);
    await element(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.INACTIVE);
    await element(btm).toHaveAttribute("role", "alert");

    await userEvent.type(main, "validtag");
    await userEvent.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    await element(top).toHaveClass(clsid, PARTS.TOP, VARIANT.ACTIVE);
    await element(lbl).toHaveClass(clsid, PARTS.LABEL, VARIANT.ACTIVE);
    await element(ext).toHaveClass(clsid, PARTS.EXTRA, VARIANT.ACTIVE);
    await element(auxdv).toHaveClass(clsid, PARTS.AUX, VARIANT.ACTIVE);
    await element(middle).toHaveClass(clsid, PARTS.MIDDLE, VARIANT.ACTIVE);
    await element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    // await element(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    await element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
    await element(btm).toHaveClass(clsid, PARTS.BOTTOM, VARIANT.ACTIVE);
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
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = byText(container, label);
    const ext = byText(lbl, extra);
    const auxdv = (container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).parentElement;
    const top = lbl.parentElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const main = container.querySelector("input") as HTMLInputElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;
    const middle = whole.firstElementChild?.nextElementSibling;
    const btm = whole.lastElementChild as HTMLDivElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await element(whole).toHaveClass(dynObj.base, dynObj.neutral);
    await element(top).toHaveClass(dynObj.base, dynObj.neutral);
    await element(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    await element(ext).toHaveClass(dynObj.base, dynObj.neutral);
    await element(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    await element(middle).toHaveClass(dynObj.base, dynObj.neutral);
    await element(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    // await element(main).toHaveClass(dynObj.base, dynObj.neutral);
    await element(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    await element(btm).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).not.toHaveAttribute("role");

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(whole).toHaveClass(dynObj.base, dynObj.inactive);
    await element(top).toHaveClass(dynObj.base, dynObj.inactive);
    await element(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    await element(ext).toHaveClass(dynObj.base, dynObj.inactive);
    await element(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    await element(middle).toHaveClass(dynObj.base, dynObj.inactive);
    await element(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    // await element(main).toHaveClass(dynObj.base, dynObj.inactive);
    await element(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    await element(btm).toHaveClass(dynObj.base, dynObj.inactive);
    await element(btm).toHaveAttribute("role", "alert");

    await userEvent.type(main, "validtag");
    await userEvent.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await element(whole).toHaveClass(dynObj.base, dynObj.active);
    await element(top).toHaveClass(dynObj.base, dynObj.active);
    await element(lbl).toHaveClass(dynObj.base, dynObj.active);
    await element(ext).toHaveClass(dynObj.base, dynObj.active);
    await element(auxdv).toHaveClass(dynObj.base, dynObj.active);
    await element(middle).toHaveClass(dynObj.base, dynObj.active);
    await element(leftdv).toHaveClass(dynObj.base, dynObj.active);
    // await element(main).toHaveClass(dynObj.base, dynObj.active);
    await element(rightdv).toHaveClass(dynObj.base, dynObj.active);
    await element(btm).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).not.toHaveAttribute("role");
  });
});

describe("a11y, structure, form & review fixes", async () => {
  const seed = "svs-tags-input-field";
  const errmsg = "invalid";
  const constraintFn = ({ value }: { value: string }) => (value.length < 2 ? errmsg : "");
  const validationFn = ({ value }: { value: string[] }) => (value.length === 0 ? errmsg : "");

  test("constraints and validations props are not mutated", async () => {
    const userConstraints = [constraintFn];
    const userValidations = [validationFn];
    const props = $state({
      constraints: userConstraints,
      validations: userValidations,
    });

    render(TagsInputField, props);

    expect(userConstraints).toHaveLength(1);
    expect(userValidations).toHaveLength(1);
  });

  test("name produces hidden inputs and leaves the visible control unnamed", async () => {
    const props = { name: "tags", values: ["a", "b"] };
    const { container } = render(TagsInputField, props);
    const main = container.querySelector('input:not([type="hidden"])') as HTMLInputElement;
    const hidden = container.querySelectorAll('input[type="hidden"]') as NodeListOf<HTMLInputElement>;

    expect(main).not.toHaveAttribute("name");
    expect(hidden).toHaveLength(2);
    expect([...hidden].map((input) => input.name)).toEqual(["tags", "tags"]);
    expect([...hidden].map((input) => input.value)).toEqual(["a", "b"]);
  });

  test("name set on field renders hidden inputs", async () => {
    const props = { values: ["a"], name: "tags" };
    const { container } = render(TagsInputField, props);
    const hidden = container.querySelectorAll('input[type="hidden"]') as NodeListOf<HTMLInputElement>;

    expect(hidden).toHaveLength(1);
    await element(hidden[0]).toHaveAttribute("name", "tags");
    await element(hidden[0]).toHaveValue("a");
  });

  test("embedded TagsInput's own variant prop is ignored", async () => {
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { variant: "somethingElse" },
    });
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "validtag");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.ACTIVE);
    await element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    await element(main).toHaveClass("svs-tags-input", PARTS.MAIN, VARIANT.ACTIVE);
    expect(main).not.toHaveClass("somethingElse");
  });

  test("empty or whitespace input is not added or validated", async () => {
    const mockConstraint = vi.fn().mockImplementation(constraintFn);
    const props = $state({
      values: [] as string[],
      constraints: [mockConstraint],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "   ");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual([]);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(mockConstraint).not.toHaveBeenCalled();
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test("constraint receives the trimmed value handed to onadd", async () => {
    const props = $state({
      values: [] as string[],
      constraints: [constraintFn],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "  a  ");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.INACTIVE);
    container.querySelector('[role="alert"]') as HTMLDivElement;
    await element(main).toHaveAccessibleErrorMessage(errmsg);
  });

  test("trimmed value that satisfies constraints is added", async () => {
    const props = $state({
      values: [] as string[],
      constraints: [constraintFn],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "  ab  ");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["ab"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    byText(container, "ab");
  });

  test("tag removal re-validates and transitions variant", async () => {
    const props = $state({
      values: ["only"],
      validations: [({ value }: { value: string[] }) => (value.length < 2 ? "need 2" : null)],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "second");
    await userEvent.keyboard("{Enter}");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.click(byBtnName(container, /only/));

    expect(props.values).toEqual(["second"]);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("min and max together keep max immediate and min deferred to invalid", async () => {
    const props = $state({
      values: ["t1", "t2"],
      validations: [({ value }: { value: string[] }) => (value.length < 1 ? "min" : null)],
      constraints: [({ values }: { values: string[] }) => (values.length >= 2 ? "max" : null)],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "t3");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toHaveLength(2);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("max");

    await userEvent.click(byBtnName(container, /t1/));
    await userEvent.click(byBtnName(container, /t2/));
    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();

    expect(props.values).toHaveLength(0);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("min");
  });

  test("min validation does not surface while typing", async () => {
    const props = $state({
      validations: [({ value }: { value: string[] }) => (value.length < 2 ? "need 2" : null)],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "one");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).not.toBe(VARIANT.INACTIVE);
    expect(container.querySelector('[role="alert"]')).toBeNull();

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("need 2");
  });

  test("null validation result is valid", async () => {
    const props = $state({
      validations: [() => null],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "one");
    await userEvent.keyboard("{Enter}");

    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test("tagsInput bag is ignored when an embedded child owns its props", async () => {
    const props = $state({
      values: [] as string[],
      tagsInput: { separator: ";" },
    });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { separator: "|" },
    });
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "a;");

    expect(props.values).toEqual([]);

    await userEvent.type(main, "|");

    expect(props.values).toEqual(["a;"]);
  });

  test("events.onadd on embedded child cancels add and composes with field", async () => {
    const onadd = vi.fn(() => []);
    const props = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { events: { onadd } },
    });
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "blocked");
    await userEvent.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(props.values).toEqual([]);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(byTextOrNull(container, "blocked")).toBeNull();

    const onadd2 = vi.fn();
    const props2 = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
    });
    const rendered = render(TagsInputFieldEmbedded, {
      field: props2,
      input: { events: { onadd: onadd2 } },
    });
    const main2 = rendered.container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main2, "allowed");
    await userEvent.keyboard("{Enter}");

    expect(onadd2).toHaveBeenCalledWith({ values: [], added: ["allowed"] });
    expect(props2.values).toEqual(["allowed"]);
    expect(props2.variant).toBe(VARIANT.ACTIVE);
    byText(rendered.container, "allowed");
  });

  test("events.onremove on embedded child cancels removal", async () => {
    const onremove = vi.fn(() => []);
    const props = $state({
      values: ["a", "b"],
    });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { events: { onremove } },
    });

    await userEvent.click(byBtnName(container, /a/));

    expect(onremove).toHaveBeenCalledWith({ values: ["a", "b"], removed: ["a"] });
    expect(props.values).toEqual(["a", "b"]);
    byText(container, "a");
    byText(container, "b");
  });

  test("onchange on embedded child composes with field validation", async () => {
    const onchange = vi.fn();
    const props = $state({
      variant: VARIANT.ACTIVE,
    });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { onchange },
    });
    const main = container.querySelector("input") as HTMLInputElement;

    main.value = "changed";
    main.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();

    expect(onchange).toHaveBeenCalled();
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("reactive label toggles top and aria-labelledby", async () => {
    const props = $state({
      label: undefined as string | undefined,
      bottom,
    });
    const { container } = render(TagsInputField, props);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;

    expect(container.querySelector(`.${PARTS.TOP}`)).toBeNull();
    expect(whole).not.toHaveAttribute("aria-labelledby");

    props.label = "Now labeled";
    await tick();

    const lbl = byText(container, "Now labeled");
    const top = lbl.parentElement;
    await element(top).toHaveClass(seed, PARTS.TOP);
    expect(whole.firstElementChild).toBe(top);
    await element(whole).toHaveAttribute("aria-labelledby", lbl.id);
  });

  test("reactive bottom updates description wiring", async () => {
    const props = $state({ bottom: "help-1" });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    byText(container, "help-1");
    await element(main).toHaveAccessibleDescription("help-1");

    props.bottom = "help-2";
    await tick();

    expect(byTextOrNull(container, "help-1")).toBeNull();
    byText(container, "help-2");
    await element(main).toHaveAccessibleDescription("help-2");
  });

  test("reactive constraints update", async () => {
    const props = $state({
      values: ["t1", "t2"],
      constraints: [({ values }: { values: string[] }) => (values.length >= 2 ? "max" : null)],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "t3");
    await userEvent.keyboard("{Enter}");
    expect(props.values).toHaveLength(2);
    expect(props.variant).toBe(VARIANT.INACTIVE);

    props.constraints = [({ values }: { values: string[] }) => (values.length >= 5 ? "max" : null)];
    await tick();
    await userEvent.type(main, "t3");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["t1", "t2", "t3"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });

  test("remove button name and type are exposed through Field", async () => {
    const props = { values: ["alpha"] };
    const { container } = render(TagsInputField, props);
    const button = byBtnName(container, /alpha/);

    await element(button).toHaveAttribute("type", "button");
  });

  test("bindable element receives the textbox", async () => {
    const props = $state({
      element: undefined as TagsInputFieldElement,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await tick();

    expect(props.element).toBe(main);
  });
});

describe("Compound / children", async () => {
  test("default child renders without children", async () => {
    const { container } = render(TagsInputField);
    const whole = container.querySelector('[role="group"]') as HTMLDivElement;
    const middle = container.querySelector(`.${PARTS.MIDDLE}`) as HTMLElement;
    const main = middle.querySelector("input") as HTMLInputElement;

    await element(middle).toBeInTheDocument();
    expect([...middle.querySelectorAll("input")]).toHaveLength(1);
    await element(main.parentElement).toHaveClass("svs-tags-input-field", "svs-tags-input", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(whole.firstElementChild).toBe(middle);
  });

  test("explicit child wires value add to field", async () => {
    const props = $state({ values: [] as string[] });
    const { container } = render(TagsInputFieldEmbedded, { field: props });
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "x");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["x"]);
    byText(container, "x");
  });

  test("explicit child receives validation message aria from field", async () => {
    const props = $state({
      validations: [() => "too few"],
      bottom,
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputFieldEmbedded, { field: props });
    const main = container.querySelector("input") as HTMLInputElement;

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();

    const alert = container.querySelector('[role="alert"]') as HTMLDivElement;
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(alert).toHaveTextContent("too few");
    await element(main).toHaveAttribute("aria-invalid", "true");
    await element(main).toHaveAttribute("aria-errormessage", alert.id);
    await element(main).toHaveAccessibleErrorMessage("too few");
  });

  test("explicit child honours presentational props", async () => {
    const props = $state({ values: ["a"] });
    const { container } = render(TagsInputFieldEmbedded, {
      field: props,
      input: { side: "right" },
    });
    const main = container.querySelector("input") as HTMLInputElement;
    const tags = container.querySelector(".svs-tags-input.aux");

    await element(tags).toBeInTheDocument();
    expect(main.nextElementSibling).toBe(tags);
  });

  test("element binding flows to field with explicit child", async () => {
    const props = $state({
      element: undefined as TagsInputFieldElement,
    });
    const { container } = render(TagsInputFieldEmbedded, { field: props });
    const main = container.querySelector("input") as HTMLInputElement;

    await tick();

    expect(props.element).toBe(main);
  });

  test("min and max still validate through the default child", async () => {
    const props = $state({
      values: ["a", "b"],
      validations: [({ value }: { value: string[] }) => (value.length < 1 ? "min" : null)],
      constraints: [({ values }: { values: string[] }) => (values.length >= 2 ? "max" : null)],
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(main, "c");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["a", "b"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await element(main).toHaveAccessibleErrorMessage("max");
  });
});

describe("accessibility (axe)", () => {
  test("default render has no violations", async () => {
    const { container } = render(TagsInputField, { label });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("invalid state has no violations", async () => {
    const msg = "invalid";
    const props = $state({
      label,
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: string[] }) => (value.length === 0 ? msg : "")],
    });
    const { container } = render(TagsInputField, props);
    const main = container.querySelector("input") as HTMLInputElement;

    main.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    await element(main).toHaveAttribute("aria-invalid", "true");
    await element(main).toHaveAccessibleErrorMessage(msg);
    expect(await axe.run(container)).toHaveNoViolations();
  });
});
