import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import NumberField from "#svs/NumberField.svelte";
import { PARTS, VARIANT } from "#svs/core";

type NumberFieldElement = HTMLInputElement | undefined;
const label = "Quantity";
const extra = "(optional)";
const bottom = "Choose a number";
const auxid = "number-aux";
const leftid = "number-left";
const rightid = "number-right";
const snippet = (id: string) => createRawSnippet((value: () => number | undefined, variant: () => string, element: () => NumberFieldElement) => ({
  render: () => `<span data-testid="${id}">${value() ?? "empty"}:${variant()}:${element() ? "element" : "none"}</span>`,
}));
const auxfn = snippet(auxid);
const leftfn = snippet(leftid);
const rightfn = snippet(rightid);
const input = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;
const byText = (container: HTMLElement, text: string) => Array.from(container.querySelectorAll("*")).find((el) => el.textContent?.trim() === text) as HTMLElement;
const change = async (el: HTMLInputElement) => { el.dispatchEvent(new Event("change", { bubbles: true })); await tick(); };
const invalid = async (el: HTMLInputElement) => { el.dispatchEvent(new Event("invalid", { cancelable: true })); await tick(); };

describe("NumberField chrome", () => {
  test("renders label, extra, group labelling, snippets, and bottom description", async () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const { container } = render(NumberField, { label, extra, aux, left, right, bottom, value: 4 });
    const group = container.querySelector('[role="group"]') as HTMLDivElement;
    const lbl = container.querySelector(`.${PARTS.LABEL}`) as HTMLLabelElement;
    const el = container.querySelector(`#${lbl.getAttribute("for")}`) as HTMLInputElement;
    const btm = byText(container, bottom);
    await expect.element(group).toHaveClass("svs-number-field", PARTS.WHOLE);
    expect(group.getAttribute("aria-labelledby")).toBe(lbl.id);
    expect(lbl.getAttribute("for")).toBe(el.id);
    expect(lbl.textContent).toContain(extra);
    await expect.element(lbl.parentElement!).toHaveClass("svs-number-field", PARTS.TOP);
    await expect.element(container.querySelector(`[data-testid="${auxid}"]`)!.parentElement!).toHaveClass("svs-number-field", PARTS.AUX);
    await expect.element(container.querySelector(`[data-testid="${leftid}"]`)!.parentElement!).toHaveClass("svs-number-field", PARTS.LEFT);
    await expect.element(container.querySelector(`[data-testid="${rightid}"]`)!.parentElement!).toHaveClass("svs-number-field", PARTS.RIGHT);
    await expect.element(btm).toHaveClass("svs-number-field", PARTS.BOTTOM);
    await expect.element(el).toHaveAccessibleDescription(bottom);
    expect(aux).toHaveBeenCalled(); expect(left).toHaveBeenCalled(); expect(right).toHaveBeenCalled();
    await expect.element(container.querySelector(`[data-testid="${auxid}"]`) as HTMLElement).toHaveTextContent(`4:${VARIANT.NEUTRAL}:none`);
    await expect.element(container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).toHaveTextContent(`4:${VARIANT.NEUTRAL}:none`);
    await expect.element(container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).toHaveTextContent(`4:${VARIANT.NEUTRAL}:none`);
  });

  test("reserves a bottom message", async () => {
    const { container, rerender } = render(NumberField, { reserve: true });
    const group = container.querySelector('[role="group"]') as HTMLDivElement;
    await expect.element(group.lastElementChild as HTMLElement).toHaveClass("svs-number-field", PARTS.BOTTOM);
    expect(group.lastElementChild?.textContent).toBe("");
    await rerender({ bottom });
    await expect.element(group.lastElementChild as HTMLElement).toHaveClass("svs-number-field", PARTS.BOTTOM);
    expect(group.lastElementChild?.textContent).toBe(bottom);
  });
});

describe("NumberField default child and binding", () => {
  test("forwards numeric configuration, snippets, stack, and children replacement", async () => {
    const configured = render(NumberField, { name: "qty", numberInput: { integer: true, spin: true, options: new Set([1, 2]), ariaDecLabel: "Less", ariaIncLabel: "More" } });
    const el = input(configured.container);
    const list = configured.container.querySelector("datalist") as HTMLDataListElement;
    await tick();
    await expect.element(el).toHaveAttribute("type", "text");
    await expect.element(el).toHaveAttribute("inputmode", "numeric");
    await expect.element(el).toHaveAttribute("name", "qty");
    expect(el.getAttribute("list")).toBe(list.id); expect(list.querySelectorAll("option")).toHaveLength(2);
    expect(configured.container.querySelector('[aria-label="Less"]')?.isConnected).toBe(true);
    expect(configured.container.querySelector('[aria-label="More"]')?.isConnected).toBe(true);
    const decrement = createRawSnippet(() => ({ render: () => "<i data-testid='dec'></i>" }));
    const increment = createRawSnippet(() => ({ render: () => "<i data-testid='inc'></i>" }));
    const snippets = render(NumberField, { numberInput: { spin: true, decrement, increment, stack: true } });
    expect(snippets.container.querySelector("[data-testid='dec']")?.isConnected).toBe(true);
    expect(snippets.container.querySelector("[data-testid='inc']")?.isConnected).toBe(true);
    expect(snippets.container.querySelector(`.${PARTS.AUX}`)).not.toBeNull();
    const children = createRawSnippet(() => ({ render: () => "<span data-testid='replacement'>custom</span>" }));
    const replacement = render(NumberField, { children });
    expect(replacement.container.querySelector("[data-testid='replacement']")?.isConnected).toBe(true);
    expect(replacement.container.querySelector("input")).toBeNull();
  });

  test("syncs values and programmatic updates", async () => {
    const props = $state({ value: undefined as number | undefined });
    const { container } = render(NumberField, props);
    const el = input(container);
    await userEvent.type(el, "7"); expect(props.value).toBe(7);
    await userEvent.clear(el); expect(props.value).toBeUndefined();
    const programmatic = $state({ value: 3 as number | undefined });
    const programmaticRender = render(NumberField, programmatic);
    const programmaticInput = input(programmaticRender.container);
    await expect.element(programmaticInput).toHaveValue("3");
    programmatic.value = 8; await programmaticRender.rerender(programmatic);
    await expect.element(programmaticInput).toHaveValue("8");
  });

  test("preserves min/max/step validation through NumberInput", async () => {
    const props = $state({ value: undefined as number | undefined, variant: VARIANT.NEUTRAL, numberInput: { min: 2, max: 6, step: 2 } });
    const { container } = render(NumberField, props);
    const el = input(container);
    await userEvent.type(el, "5"); await change(el);
    expect(props.value).toBe(6); await expect.element(el).toHaveValue("6"); expect(props.variant).toBe(VARIANT.ACTIVE);
  });
});

describe("NumberField variant state machine and a11y", () => {
  test("becomes active on valid changes, including zero", async () => {
    const props = $state({ value: undefined as number | undefined, variant: VARIANT.NEUTRAL });
    const rendered = render(NumberField, props);
    const el = input(rendered.container);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await userEvent.type(el, "7"); await change(el);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    const zero = $state({ value: 0 as number | undefined, variant: VARIANT.NEUTRAL });
    const zeroRender = render(NumberField, zero);
    await change(input(zeroRender.container));
    expect(zero.variant).toBe(VARIANT.ACTIVE);
  });

  test("shows, wires, and clears validation errors; invalid events mark inactive", async () => {
    const errmsg = "Too low";
    const props = $state({ value: undefined as number | undefined, variant: VARIANT.NEUTRAL, bottom, validations: [({ value }: { value: number | undefined }) => value !== undefined && value < 5 ? errmsg : null] });
    const { container } = render(NumberField, props);
    const el = input(container);
    await userEvent.type(el, "3"); await change(el);
    const alert = container.querySelector('[role="alert"]') as HTMLElement;
    expect(props.variant).toBe(VARIANT.INACTIVE); expect(alert.textContent).toBe(errmsg);
    await expect.element(el).toHaveAttribute("aria-invalid", "true"); await expect.element(el).toHaveAccessibleErrorMessage(errmsg);
    await userEvent.clear(el); await userEvent.type(el, "7"); await change(el);
    expect(props.variant).toBe(VARIANT.ACTIVE); expect(el.hasAttribute("aria-invalid")).toBe(false);
    await userEvent.clear(el); await change(el); expect(props.variant).toBe(VARIANT.NEUTRAL);
    const invalidProps = $state({ value: 3 as number | undefined, variant: VARIANT.NEUTRAL, bottom, validations: props.validations });
    const invalidRender = render(NumberField, invalidProps); const invalidInput = input(invalidRender.container);
    await tick(); await invalid(invalidInput);
    expect(invalidProps.variant).toBe(VARIANT.INACTIVE); await expect.element(invalidInput).toHaveAccessibleErrorMessage(errmsg);
  });

  test("wires describedby and errormessage IDs", async () => {
    const props = $state({ bottom, value: 1 as number | undefined, validations: [() => "Invalid number"], variant: VARIANT.NEUTRAL });
    const { container } = render(NumberField, props);
    const el = input(container); const desc = container.querySelector(`.${PARTS.BOTTOM}`) as HTMLElement;
    expect(el.getAttribute("aria-describedby")).toBe(desc.id);
    await change(el);
    const alert = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.getAttribute("aria-errormessage")).toBe(alert.id);
  });
});
