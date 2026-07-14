import axe from "axe-core";
import { beforeEach, describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import MonthPicker from "#svs/MonthPicker.svelte";
import MonthPickerBindable from "./fixtures/MonthPickerBindable.svelte";
import MonthPickerCtxProvider from "./fixtures/MonthPickerCtxProvider.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const ym = (year: number, month: number) => Temporal.PlainYearMonth.from({ year, month });
const selects = (container: HTMLElement) => Array.from(container.querySelectorAll("select")) as HTMLSelectElement[];
const opts = (select: HTMLSelectElement) => Array.from(select.options);
const setWheel = async (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
};
const snippet = (id: string, text: string) =>
  createRawSnippet(() => ({
    render: () => `<span data-testid="${id}">${text}</span>`,
  }));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("_MonthPicker options", () => {
  test("year wheel lists [min.year..max.year] ascending", () => {
    const screen = render(MonthPicker, { value: ym(2021, 6), min: ym(2020, 1), max: ym(2022, 12) });
    expect(opts(selects(screen.container)[0]).map((o) => o.value)).toEqual(["2020", "2021", "2022"]);
  });

  test("month wheel disables months before min.month in the min year", () => {
    const screen = render(MonthPicker, { value: ym(2020, 6), min: ym(2020, 3), max: ym(2022, 12) });
    const months = opts(selects(screen.container)[1]);
    expect(months.slice(0, 2).every((o) => o.disabled)).toBe(true);
    expect(months.slice(2).every((o) => !o.disabled)).toBe(true);
  });

  test("month wheel disables months after max.month in the max year", async () => {
    const screen = render(MonthPicker, { value: ym(2022, 4), min: ym(2020, 1), max: ym(2022, 4) });
    await setWheel(selects(screen.container)[0], "2022");
    const months = opts(selects(screen.container)[1]);
    expect(months.slice(4).every((o) => o.disabled)).toBe(true);
  });

  test("default window spans value.year +/-100 when min/max omitted", () => {
    const screen = render(MonthPicker, { value: ym(2000, 6) });
    const years = opts(selects(screen.container)[0]);
    expect(years[0].value).toBe("1900");
    expect(years[years.length - 1].value).toBe("2100");
  });
});

describe("_MonthPicker value coordination", () => {
  test("changing the month wheel updates value", async () => {
    const screen = render(MonthPickerBindable, { value: ym(2021, 6) });
    await setWheel(selects(screen.container)[1], "9");
    await expect.element(screen.getByTestId("ym")).toHaveTextContent("2021-9");
  });

  test("changing the year wheel updates value, keeping month when in range", async () => {
    const screen = render(MonthPickerBindable, { value: ym(2021, 6), min: ym(2019, 1), max: ym(2022, 12) });
    await setWheel(selects(screen.container)[0], "2019");
    await expect.element(screen.getByTestId("ym")).toHaveTextContent("2019-6");
  });

  test("selecting a boundary year clamps the month into range", async () => {
    const screen = render(MonthPickerBindable, { value: ym(2021, 3), min: ym(2020, 5), max: ym(2022, 12) });
    await setWheel(selects(screen.container)[0], "2020");
    await expect.element(screen.getByTestId("ym")).toHaveTextContent("2020-5");
  });

  test("value never exceeds max or drops below min", async () => {
    const min = ym(2020, 5);
    const max = ym(2022, 4);
    const screen = render(MonthPickerBindable, { value: ym(2021, 8), min, max });
    await setWheel(selects(screen.container)[0], "2020");
    await setWheel(selects(screen.container)[1], "1");
    await expect.element(screen.getByTestId("ym")).toHaveTextContent("2020-5");
    await setWheel(selects(screen.container)[0], "2022");
    await setWheel(selects(screen.container)[1], "12");
    await expect.element(screen.getByTestId("ym")).toHaveTextContent("2022-4");
  });
});

describe("_MonthPicker embedded (context)", () => {
  test("value/min/max/variant come from context and own props are ignored", () => {
    const screen = render(MonthPickerCtxProvider, {
      value: ym(2024, 5),
      min: ym(2024, 3),
      max: ym(2024, 7),
      variant: VARIANT.ACTIVE,
      ownValue: ym(1999, 1),
      ownMin: ym(1990, 1),
      ownMax: ym(1990, 12),
      ownVariant: VARIANT.INACTIVE,
    });
    const wheels = selects(screen.container);
    expect(wheels[0].value).toBe("2024");
    expect(wheels[1].value).toBe("5");
    expect(opts(wheels[0]).map((o) => o.value)).toEqual(["2024"]);
    const months = opts(wheels[1]);
    expect(months.slice(0, 2).every((o) => o.disabled)).toBe(true);
    expect(months.slice(2, 7).every((o) => !o.disabled)).toBe(true);
    expect(months.slice(7).every((o) => o.disabled)).toBe(true);
    expect(screen.container.querySelector(`.${PARTS.WHOLE}`)?.className).toContain(VARIANT.ACTIVE);
  });

  test("wheel changes write through context without mutating the own value prop", async () => {
    const screen = render(MonthPickerCtxProvider, {
      value: ym(2021, 6),
      min: ym(2020, 1),
      max: ym(2025, 12),
      ownValue: ym(1999, 1),
    });
    await setWheel(selects(screen.container)[1], "9");
    await setWheel(selects(screen.container)[0], "2024");
    await expect.element(screen.getByTestId("ctx-ym")).toHaveTextContent("2024-9");
    await expect.element(screen.getByTestId("own-ym")).toHaveTextContent("1999-1");
  });
});

describe("_MonthPicker layout and styling", () => {
  test("order swaps select and tab order", () => {
    const screen = render(MonthPicker, { value: ym(2021, 6), order: ["month", "year"] });
    expect(opts(selects(screen.container)[0]).map((o) => o.value)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  });

  test("renders left/middle/right slots only when provided, in positional order", () => {
    const withSlots = render(MonthPicker, {
      value: ym(2021, 6),
      left: snippet("left", "L"),
      middle: snippet("middle", "M"),
      right: snippet("right", "R"),
    });
    expect(withSlots.container.querySelectorAll(`.${PARTS.LEFT}`)).toHaveLength(1);
    expect(withSlots.container.querySelectorAll(`.${PARTS.MIDDLE}`)).toHaveLength(3);
    expect(withSlots.container.querySelectorAll(`.${PARTS.RIGHT}`)).toHaveLength(1);
    const middle = withSlots.container.querySelector(`.${PARTS.WHOLE} > .${PARTS.MIDDLE}`) as HTMLElement;
    const first = selects(withSlots.container)[0];
    const second = selects(withSlots.container)[1];
    expect(first.compareDocumentPosition(middle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(middle.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const withoutSlots = render(MonthPicker, { value: ym(2021, 6) });
    expect(withoutSlots.container.querySelector(`.${PARTS.WHOLE} > .${PARTS.LEFT}`)).toBeNull();
    expect(withoutSlots.container.querySelector(`.${PARTS.WHOLE} > .${PARTS.RIGHT}`)).toBeNull();
  });

  test("own styling applies to whole and slot parts", () => {
    const screen = render(MonthPicker, {
      value: ym(2021, 6),
      left: snippet("left-style", "L"),
      styling: { whole: "own-whole", left: "own-left" },
    });
    const root = screen.container.querySelector('[role="group"]') as HTMLElement;
    expect(root.className).toContain("own-whole");
    expect(root.querySelector(".own-left")).toBeTruthy();
  });

  test("year/month prop-bag styling reaches each wheel", () => {
    const screen = render(MonthPicker, { value: ym(2021, 6), year: { styling: { whole: "yr-marker" } } });
    expect(screen.container.querySelector(".yr-marker")).toBeTruthy();
  });

  test("variant reaches owned parts", () => {
    const screen = render(MonthPicker, { value: ym(2021, 6), variant: VARIANT.ACTIVE });
    expect(screen.container.querySelector(`.${PARTS.WHOLE}`)?.className).toContain(VARIANT.ACTIVE);
  });
});

describe("accessibility (axe)", () => {
  test("audits the default picker", async () => {
    const { container } = render(MonthPicker, {
      value: ym(2021, 6),
      year: { "aria-label": "Year" },
      month: { "aria-label": "Month" },
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits constrained picker options", async () => {
    const { container } = render(MonthPicker, {
      value: ym(2020, 6),
      min: ym(2020, 3),
      max: ym(2022, 12),
      year: { "aria-label": "Year" },
      month: { "aria-label": "Month" },
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
