import axe from "axe-core";
import { describe, expect, test } from "vitest";
import { render as svRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { tick } from "svelte";
import Pagination from "#svs/Pagination.svelte";
import { PARTS, VARIANT } from "#svs/core";
import PaginationEmbedded from "./fixtures/PaginationEmbedded.svelte";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const byRole = (container: HTMLElement | ParentNode, role: string) =>
  Array.from(container.querySelectorAll(`[role="${role}"]`)) as HTMLElement[];
const render = (component: any, props?: any) => {
  const result = svRender(component, props);
  const { container } = result;
  return {
    ...result,
    getByRole: (role: string) => byRole(container, role)[0] ?? null,
    getAllByRole: (role: string) => byRole(container, role),
    getButton: (label: string) =>
      Array.from(container.querySelectorAll("button")).find((btn) => btn.getAttribute("aria-label") === label) as HTMLButtonElement,
  };
};
const fireEvent = {
  blur: async (el: HTMLElement) => {
    el.blur();
    await tick();
  },
  click: async (el: HTMLElement) => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
  },
};
const attr = (el: Element, name: string, value?: string | null) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(true);
  else expect(el.getAttribute(name)).toBe(value);
};
const noattr = (el: Element, name: string) => expect(el.hasAttribute(name)).toBe(false);
const has = (el: Element | null | undefined, ...names: string[]) =>
  expect([...(el?.classList ?? [])]).toEqual(expect.arrayContaining(names));
const val = (el: HTMLInputElement, value: string) => expect(el.value).toBe(value);
const optionText = (items: HTMLElement[]) => items.map((item) => item.textContent);

describe("Pagination rendering", () => {
  test("renders with bounds and shows the current page in ComboBox", () => {
    const { container, getByRole, getButton } = render(Pagination, { min: 1, max: 10, value: 5 });
    const nav = container.querySelector("nav") as HTMLElement;
    const combobox = getByRole("combobox") as HTMLInputElement;

    has(nav, "svs-pagination", PARTS.WHOLE, VARIANT.NEUTRAL);
    attr(nav, "aria-label", "Pagination");
    val(combobox, "5");
    attr(getButton("First page"), "aria-disabled", "false");
    attr(getButton("Previous page"), "aria-disabled", "false");
    attr(getButton("Next page"), "aria-disabled", "false");
    attr(getButton("Last page"), "aria-disabled", "false");
  });

  test("overrides the nav aria-label", () => {
    const { container } = render(Pagination, { ariaLabel: "Results pages" });
    const nav = container.querySelector("nav") as HTMLElement;

    attr(nav, "aria-label", "Results pages");
  });

  test("overrides button labels by subset and preserves unset defaults", () => {
    const { getButton } = render(Pagination, { buttonLabels: { left: "Go back", right: "Go forward" } });

    expect(getButton("First page")).toBeTruthy();
    expect(getButton("Go back")).toBeTruthy();
    expect(getButton("Go forward")).toBeTruthy();
    expect(getButton("Last page")).toBeTruthy();
  });

  test("merges caller class and forwards nav attributes", () => {
    const { container } = render(Pagination, { class: "pager", id: "main-pages" });
    const nav = container.querySelector("nav") as HTMLElement;

    has(nav, "svs-pagination", PARTS.WHOLE, VARIANT.NEUTRAL, "pager");
    attr(nav, "id", "main-pages");
  });

  test("buttons move value and stay focusable no-ops at bounds", async () => {
    const props = $state({ min: 1, max: 3, value: 2 });
    const { getByRole, getButton } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;
    const first = getButton("First page");
    const prev = getButton("Previous page");
    const next = getButton("Next page");
    const last = getButton("Last page");

    await fireEvent.click(prev);
    expect(props.value).toBe(1);
    val(combobox, "1");
    attr(first, "aria-disabled", "true");
    attr(prev, "aria-disabled", "true");
    noattr(first, "disabled");
    noattr(prev, "disabled");
    has(first, PARTS.TOP, VARIANT.INACTIVE);
    await fireEvent.click(prev);
    expect(props.value).toBe(1);

    await userEvent.click(next);
    expect(props.value).toBe(2);
    await userEvent.click(last);
    expect(props.value).toBe(3);
    attr(next, "aria-disabled", "true");
    attr(last, "aria-disabled", "true");
    noattr(next, "disabled");
    noattr(last, "disabled");
    await fireEvent.click(next);
    expect(props.value).toBe(3);
  });
});

describe("Pagination value and options", () => {
  test("clamps out-of-range value and clamps again when bounds change", async () => {
    const props = $state({ min: 1, max: 10, value: 50 });
    const { getByRole, rerender } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await tick();
    expect(props.value).toBe(10);
    val(combobox, "10");

    props.max = 6;
    await rerender(props);
    await tick();

    expect(props.value).toBe(6);
    val(combobox, "6");
  });

  test("uses the default magnitude-thinned shortcut list", () => {
    const { getAllByRole } = render(Pagination, { min: 1, max: 100, value: 50 });

    expect(optionText(getAllByRole("option"))).toEqual(["1", "20", "40", "48", "49", "50", "51", "52", "60", "80", "100"]);
  });

  test("replaces shortcut options with explicit options", () => {
    const { getAllByRole } = render(Pagination, { min: 1, max: 10, value: 4, options: [2, 4, 6] });

    expect(optionText(getAllByRole("option"))).toEqual(["2", "4", "6"]);
  });

  test("binds value and commits typed pages", async () => {
    const props = $state({ min: 1, max: 10, value: 5 });
    const { getByRole } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.clear(combobox);
    await userEvent.keyboard("12");
    await userEvent.keyboard("{Enter}");
    expect(props.value).toBe(10);
    val(combobox, "10");

    await userEvent.clear(combobox);
    await userEvent.keyboard("bad");
    await fireEvent.blur(combobox);
    expect(props.value).toBe(10);
    val(combobox, "10");
  });

  test("commits option selection", async () => {
    const props = $state({ min: 1, max: 10, value: 5, options: [3, 8] });
    const { getByRole, getAllByRole } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.click(getAllByRole("option")[1]);

    expect(props.value).toBe(8);
    val(combobox, "8");
  });
});

describe("Pagination onchange", () => {
  test("fires once per moving nav button after value updates", async () => {
    type Call = { event: Event; value: number };
    const calls: Call[] = [];
    const props = $state({
      min: 1,
      max: 10,
      value: 5,
      onchange: (event: Event) => calls.push({ event, value: props.value }),
    });
    const { getButton } = render(Pagination, props);

    await fireEvent.click(getButton("Previous page"));
    await fireEvent.click(getButton("First page"));
    await fireEvent.click(getButton("Next page"));
    await fireEvent.click(getButton("Last page"));

    expect(calls).toHaveLength(4);
    expect(calls.map((call) => call.event.type)).toEqual(["change", "change", "change", "change"]);
    expect(calls.every((call) => call.event instanceof Event)).toBe(true);
    expect(calls.map((call) => call.value)).toEqual([4, 1, 2, 10]);
    expect(props.value).toBe(10);
  });

  test("fires when ComboBox commit lands on a different page", async () => {
    type Call = { event: Event; value: number };
    const calls: Call[] = [];
    const props = $state({
      min: 1,
      max: 10,
      value: 5,
      onchange: (event: Event) => calls.push({ event, value: props.value }),
    });
    const { getByRole } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.clear(combobox);
    await userEvent.keyboard("7");
    await userEvent.keyboard("{Enter}");

    expect(calls).toHaveLength(1);
    expect(calls[0].event.type).toBe("change");
    expect(calls[0].event).toBeInstanceOf(Event);
    expect(calls[0].value).toBe(7);
    expect(props.value).toBe(7);
  });

  test("does not fire for at-bound nav button clicks", async () => {
    const calls: Event[] = [];
    const low = render(Pagination, { min: 1, max: 2, value: 1, onchange: (event: Event) => calls.push(event) });
    await fireEvent.click(low.getButton("First page"));
    await fireEvent.click(low.getButton("Previous page"));

    const high = render(Pagination, { min: 1, max: 2, value: 2, onchange: (event: Event) => calls.push(event) });
    await fireEvent.click(high.getButton("Next page"));
    await fireEvent.click(high.getButton("Last page"));

    expect(calls).toHaveLength(0);
  });

  test("does not fire for unchanged or invalid ComboBox commits", async () => {
    const calls: Event[] = [];
    const props = $state({ min: 1, max: 10, value: 5, onchange: (event: Event) => calls.push(event) });
    const { getByRole } = render(Pagination, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.clear(combobox);
    await userEvent.keyboard("5");
    await userEvent.keyboard("{Enter}");
    expect(props.value).toBe(5);

    await userEvent.clear(combobox);
    await userEvent.keyboard("bad");
    await fireEvent.blur(combobox);
    expect(props.value).toBe(5);
    val(combobox, "5");

    expect(calls).toHaveLength(0);
  });

  test("does not fire for programmatic value changes or bound clamping", async () => {
    const programmaticCalls: Event[] = [];
    const onchange = (event: Event) => programmaticCalls.push(event);
    const { getByRole, rerender } = render(Pagination, { min: 1, max: 10, value: 5, onchange });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await rerender({ min: 1, max: 10, value: 6, onchange });
    await tick();
    val(combobox, "6");
    expect(programmaticCalls).toHaveLength(0);

    const clampCalls: Event[] = [];
    const props = $state({ min: 1, max: 10, value: 50, onchange: (event: Event) => clampCalls.push(event) });
    const clamping = render(Pagination, props);
    const clampingCombobox = clamping.getByRole("combobox") as HTMLInputElement;

    await tick();
    expect(props.value).toBe(10);
    val(clampingCombobox, "10");

    props.max = 4;
    await clamping.rerender(props);
    await tick();
    expect(props.value).toBe(4);
    val(clampingCombobox, "4");

    expect(clampCalls).toHaveLength(0);
  });
});

describe("Pagination ComboBox composition", () => {
  test("forwards the comboBox bag in generated-child mode", () => {
    const { getByRole } = render(Pagination, { min: 1, max: 10, value: 3, comboBox: { placeholder: "Page" } });
    const combobox = getByRole("combobox") as HTMLInputElement;

    attr(combobox, "placeholder", "Page");
  });

  test("caller-written ComboBox self-wires through context and ignores comboBox", async () => {
    const paging = $state({ min: 1, max: 10, value: 5, comboBox: { placeholder: "Ignored" } });
    const { getByRole, getButton } = render(PaginationEmbedded, { paging, input: { placeholder: "Child" } });
    const combobox = getByRole("combobox") as HTMLInputElement;

    attr(combobox, "placeholder", "Child");
    await userEvent.click(getButton("Next page"));

    expect(paging.value).toBe(6);
    val(combobox, "6");
  });
});

describe("accessibility (axe)", () => {
  test("audits the default pagination", async () => {
    const { container } = render(Pagination, { min: 1, max: 10, value: 5, comboBox: { "aria-label": "Page" } });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits pagination with the listbox open", async () => {
    const { container, getByRole } = render(Pagination, { min: 1, max: 10, value: 5, comboBox: { "aria-label": "Page" } });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await tick();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
