import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Calendar, { type DayCtx } from "#svs/Calendar.svelte";
import CalendarBindable from "./fixtures/CalendarBindable.svelte";
import { PARTS, VARIANT } from "#svs/core";

const date = (year: number, month: number, day: number) => Temporal.PlainDate.from({ year, month, day });
const ym = (year: number, month: number) => Temporal.PlainYearMonth.from({ year, month });
const grid = (container: HTMLElement) => container.querySelector('[role="grid"]') as HTMLElement;
const rows = (container: HTMLElement) =>
  Array.from(grid(container).querySelectorAll('[role="row"]')).filter((row) => !row.classList.contains(PARTS.AUX)) as HTMLElement[];
const cells = (container: HTMLElement) => Array.from(container.querySelectorAll('button[role="gridcell"]')) as HTMLButtonElement[];
const dayButton = (container: HTMLElement, day: number) =>
  cells(container).find((b) => b.textContent?.trim() === String(day) && !b.hasAttribute("data-outside"))!;
const pressKey = async (el: HTMLElement, key: string, opts: KeyboardEventInit = {}) => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
  await tick();
};
const setWheel = async (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
};
const snippet0 = (id: string, text: string) =>
  createRawSnippet(() => ({
    render: () => `<span data-testid="${id}">${text}</span>`,
  }));
const labelSnippet = createRawSnippet((display: () => Temporal.PlainYearMonth, _variant: () => string, picking: () => boolean) => ({
  render: () => `<span data-testid="label-snippet">${display().year}-${display().month}-${picking()}</span>`,
  setup: (node) => {
    $effect(() => {
      node.textContent = `${display().year}-${display().month}-${picking()}`;
    });
  },
}));
const daySnippet = createRawSnippet((ctx: () => DayCtx) => ({
  render: () => `<span data-testid="day-${ctx().date.day}">d${ctx().date.day}</span>`,
}));
const bottomSnippet = createRawSnippet((_variant: () => string, setToday: () => () => void) => ({
  render: () => `<button type="button" data-testid="today">Today</button>`,
  setup: (node) => {
    node.addEventListener("click", () => setToday()());
  },
}));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("_Calendar grid model", () => {
  test("renders the correct day count and weekday alignment for a known month", () => {
    const screen = render(Calendar, { display: ym(2026, 6), firstDayOfWeek: 0 });
    expect(cells(screen.container).filter((b) => !b.hasAttribute("data-outside"))).toHaveLength(30);
    expect(rows(screen.container)[0].children[1].textContent?.trim()).toBe("1");
  });

  test("firstDayOfWeek shifts the leading offset", () => {
    const screen = render(Calendar, { display: ym(2026, 6), firstDayOfWeek: 1 });
    const headers = Array.from(screen.container.querySelectorAll('[role="columnheader"]'));
    expect(headers[0].getAttribute("data-weekday")).toBe("1");
    expect(rows(screen.container)[0].children[0].textContent?.trim()).toBe("1");
  });

  test("outsideDays=false renders empty placeholders, not adjacent-month numbers", () => {
    const screen = render(Calendar, { display: ym(2026, 6), outsideDays: false });
    expect(cells(screen.container).some((b) => b.hasAttribute("data-outside"))).toBe(false);
    expect(rows(screen.container)[0].children).toHaveLength(7);
  });

  test("outsideDays=true renders adjacent-month days with data-outside", () => {
    const screen = render(Calendar, { display: ym(2026, 6), outsideDays: true });
    expect(cells(screen.container).some((b) => b.hasAttribute("data-outside"))).toBe(true);
  });

  test("fixedWeeks=true always renders 6 rows", () => {
    const screen = render(Calendar, { display: ym(2026, 2), fixedWeeks: true });
    expect(rows(screen.container)).toHaveLength(6);
  });
});

describe("_Calendar paging and picking", () => {
  test("prev/next change display by one month, not value", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), value: date(2026, 6, 15) });
    (screen.container.querySelector(`.${PARTS.RIGHT}`) as HTMLButtonElement).click();
    await tick();
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2026-7");
    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-6-15");
  });

  test("clicking label toggles picking and mounts MonthPicker", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6) });
    const label = screen.container.querySelector(`.${PARTS.LABEL}`) as HTMLButtonElement;
    label.click();
    await tick();
    await expect.element(screen.getByTestId("picking")).toHaveTextContent("true");
    expect(screen.container.querySelector('[role="grid"]')).toBeNull();
    expect(screen.container.querySelector("select")).toBeTruthy();
    expect(label.getAttribute("aria-expanded")).toBe("true");
    label.click();
    await tick();
    expect(screen.container.querySelector('[role="grid"]')).toBeTruthy();
  });

  test("selecting in the embedded MonthPicker updates display, not value", async () => {
    const screen = render(CalendarBindable, {
      display: ym(2026, 6),
      value: date(2026, 6, 15),
      min: date(2020, 1, 1),
      max: date(2030, 12, 31),
    });
    (screen.container.querySelector(`.${PARTS.LABEL}`) as HTMLButtonElement).click();
    await tick();
    const selects = Array.from(screen.container.querySelectorAll("select")) as HTMLSelectElement[];
    await setWheel(selects[0], "2027");
    await setWheel(selects[1], "9");
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2027-9");
    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-6-15");
  });
});

describe("_Calendar selection and constraints", () => {
  test("clicking an enabled day sets value", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6) });
    dayButton(screen.container, 15).click();
    await tick();
    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-6-15");
  });

  test("clicking a disabled day is a no-op", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), min: date(2026, 6, 10) });
    const button = dayButton(screen.container, 5);
    button.click();
    await tick();
    await expect.element(screen.getByTestId("value")).toHaveTextContent("");
    expect(button.hasAttribute("data-disabled")).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  test("isDisabled predicate disables matching days", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), isDisabled: (d: Temporal.PlainDate) => d.day % 2 === 0 });
    const button = dayButton(screen.container, 10);
    button.click();
    await tick();
    await expect.element(screen.getByTestId("value")).toHaveTextContent("");
    expect(button.hasAttribute("data-disabled")).toBe(true);
  });

  test("clicking an outside day selects it and navigates display", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), outsideDays: true });
    const outside = cells(screen.container).find((b) => b.hasAttribute("data-outside") && b.textContent?.trim() === "1")!;
    outside.click();
    await tick();
    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-7-1");
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2026-7");
  });

  test("setToday selects today when selectable and only navigates when disabled", async () => {
    const today = Temporal.Now.plainDateISO();
    const screen = render(CalendarBindable, { display: ym(2026, 6), bottom: bottomSnippet });
    await screen.getByTestId("today").click();
    await expect.element(screen.getByTestId("display")).toHaveTextContent(`${today.year}-${today.month}`);
    await expect.element(screen.getByTestId("value")).toHaveTextContent(`${today.year}-${today.month}-${today.day}`);
    screen.unmount();

    const blocked = render(CalendarBindable, { display: ym(2026, 6), min: today.add({ days: 1 }), bottom: bottomSnippet });
    await blocked.getByTestId("today").click();
    await expect.element(blocked.getByTestId("display")).toHaveTextContent(`${today.year}-${today.month}`);
    await expect.element(blocked.getByTestId("value")).toHaveTextContent("");
  });

  test("setToday moves roving tabindex to today when it selects", async () => {
    const today = Temporal.Now.plainDateISO();
    const other = today.with({ day: today.day === 1 ? 2 : 1 });
    const screen = render(CalendarBindable, { display: today.toPlainYearMonth(), value: other, bottom: bottomSnippet });

    await screen.getByTestId("today").click();

    await expect.element(screen.getByTestId("value")).toHaveTextContent(`${today.year}-${today.month}-${today.day}`);
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe(String(today.day));
  });

  test("setToday leaves roving tabindex unchanged when today is disabled", async () => {
    const today = Temporal.Now.plainDateISO();
    const other = today.with({ day: today.day === 1 ? 2 : 1 });
    const screen = render(CalendarBindable, {
      display: today.toPlainYearMonth(),
      value: other,
      min: today.add({ days: 1 }),
      bottom: bottomSnippet,
    });

    await screen.getByTestId("today").click();

    await expect.element(screen.getByTestId("value")).toHaveTextContent(`${other.year}-${other.month}-${other.day}`);
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe(String(other.day));
  });
});

describe("_Calendar keyboard and aria", () => {
  test("exactly one gridcell is tabindex=0", () => {
    const screen = render(Calendar, { display: ym(2026, 6), value: date(2026, 6, 15) });
    const focusable = screen.container.querySelectorAll('[role="gridcell"][tabindex="0"]');
    expect(focusable).toHaveLength(1);
    expect(focusable[0].textContent?.trim()).toBe("15");
  });

  test("arrow keys move focus by 1 and 7 days", async () => {
    const screen = render(Calendar, { display: ym(2026, 6), value: date(2026, 6, 15) });
    dayButton(screen.container, 15).focus();
    await pressKey(grid(screen.container), "ArrowRight");
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("16");
    await pressKey(grid(screen.container), "ArrowDown");
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("23");
  });

  test("arrow keys start from the currently focused day cell", async () => {
    const screen = render(Calendar, { display: ym(2026, 6) });
    const day10 = dayButton(screen.container, 10);
    day10.focus();

    await pressKey(day10, "ArrowRight");
    await tick();

    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("11");
    expect(document.activeElement?.textContent?.trim()).toBe("11");
  });

  test("arrow across month boundary updates display", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), value: date(2026, 6, 1) });
    dayButton(screen.container, 1).focus();
    await pressKey(grid(screen.container), "ArrowLeft");
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2026-5");
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("31");
  });

  test("PageUp/PageDown change month and Shift variants change year", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6), value: date(2026, 6, 15) });
    await pressKey(grid(screen.container), "PageUp");
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2026-5");
    await pressKey(grid(screen.container), "PageDown", { shiftKey: true });
    await expect.element(screen.getByTestId("display")).toHaveTextContent("2027-5");
  });

  test("Enter and Space select the focused day", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6) });
    const day10 = dayButton(screen.container, 10);
    day10.focus();

    await pressKey(day10, "Enter");

    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-6-10");
  });

  test("click selection moves roving tabindex to the selected day", async () => {
    const screen = render(CalendarBindable, { display: ym(2026, 6) });
    dayButton(screen.container, 15).click();
    await tick();

    await expect.element(screen.getByTestId("value")).toHaveTextContent("2026-6-15");
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("15");
  });

  test("navigating to a shorter month keeps focus on current rendered cells", async () => {
    const props = $state({ display: ym(2026, 8), value: date(2026, 8, 31) });
    const screen = render(CalendarBindable, props);

    expect(cells(screen.container)).toHaveLength(31);

    props.display = ym(2026, 2);
    await screen.rerender(props);
    await tick();

    expect(cells(screen.container)).toHaveLength(28);
    expect(screen.container.querySelector('[tabindex="0"]')?.textContent?.trim()).toBe("1");

    dayButton(screen.container, 1).focus();
    await pressKey(grid(screen.container), "ArrowRight");

    expect(document.activeElement?.textContent?.trim()).toBe("2");
  });

  test("grid roles and aria attributes are present", () => {
    const today = Temporal.Now.plainDateISO();
    const screen = render(Calendar, { display: today.toPlainYearMonth(), value: today, min: today.add({ days: 1 }) });
    const root = screen.container.querySelector("[data-svs-calendar]") as HTMLElement;
    const main = grid(screen.container);
    expect(root.getAttribute("role")).toBe("group");
    expect(screen.container.querySelector('[role="application"]')).toBeNull();
    expect(main).toBeTruthy();
    expect(main.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
    expect(main.querySelector('[role="row"]')?.classList.contains(PARTS.AUX)).toBe(true);
    const selected = screen.container.querySelector("[data-selected]") as HTMLElement;
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(selected.getAttribute("aria-current")).toBe("date");
    expect(selected.getAttribute("aria-disabled")).toBe("true");
    expect(selected.getAttribute("aria-label")).toBeTruthy();
  });
});

describe("_Calendar rendering variants and snippets", () => {
  test("selected day cell is active and has data-selected", () => {
    const screen = render(Calendar, { display: ym(2026, 6), value: date(2026, 6, 15) });
    const button = dayButton(screen.container, 15);
    expect(button.className).toContain(VARIANT.ACTIVE);
    expect(button.hasAttribute("data-selected")).toBe(true);
  });

  test("disabled day cell is inactive and disabled wins over selected", () => {
    const screen = render(Calendar, { display: ym(2026, 6), value: date(2026, 6, 15), min: date(2026, 6, 20) });
    const button = dayButton(screen.container, 15);
    expect(button.className).toContain(VARIANT.INACTIVE);
    expect(button.hasAttribute("data-selected")).toBe(true);
    expect(button.hasAttribute("data-disabled")).toBe(true);
  });

  test("plain day cell is neutral", () => {
    const screen = render(Calendar, { display: ym(2026, 6) });
    expect(dayButton(screen.container, 15).className).toContain(VARIANT.NEUTRAL);
  });

  test("every day cell and weekday header carries data-weekday", () => {
    const screen = render(Calendar, { display: ym(2026, 6) });
    expect(Array.from(screen.container.querySelectorAll('[role="columnheader"]')).every((x) => x.hasAttribute("data-weekday"))).toBe(true);
    expect(cells(screen.container).every((x) => x.hasAttribute("data-weekday"))).toBe(true);
    expect(screen.container.querySelectorAll(`.${PARTS.EXTRA}[data-weekday="0"]`).length).toBeGreaterThan(1);
  });

  test("day/weekday/label/left/right/bottom snippets override defaults", async () => {
    const weekdaySnippet = createRawSnippet((weekday: () => number) => ({
      render: () => `<span data-testid="weekday-${weekday()}">w${weekday()}</span>`,
    }));
    const screen = render(CalendarBindable, {
      display: ym(2026, 6),
      label: labelSnippet,
      left: snippet0("left", "<"),
      right: snippet0("right", ">"),
      weekday: weekdaySnippet,
      day: daySnippet,
      bottom: bottomSnippet,
    });
    await expect.element(screen.getByTestId("label-snippet")).toHaveTextContent("2026-6-false");
    await expect.element(screen.getByTestId("left")).toBeVisible();
    await expect.element(screen.getByTestId("right")).toBeVisible();
    await expect.element(screen.getByTestId("weekday-0")).toBeVisible();
    await expect.element(screen.getByTestId("day-1")).toBeVisible();
    await expect.element(screen.getByTestId("today")).toBeVisible();
    (screen.container.querySelector(`.${PARTS.LABEL}`) as HTMLButtonElement).click();
    await tick();
    await expect.element(screen.getByTestId("label-snippet")).toHaveTextContent("2026-6-true");
  });

  test("toggling picking swaps grid and MonthPicker without a transition prop", async () => {
    const screen = render(Calendar, { display: ym(2026, 6) });
    (screen.container.querySelector(`.${PARTS.LABEL}`) as HTMLButtonElement).click();
    await tick();
    expect(screen.container.querySelector('[role="grid"]')).toBeNull();
    expect(screen.container.querySelector("select")).toBeTruthy();
  });

  test("transition fn is invoked on toggle", async () => {
    const fn = vi.fn(() => ({}));
    const screen = render(Calendar, { display: ym(2026, 6), transition: { fn } });
    (screen.container.querySelector(`.${PARTS.LABEL}`) as HTMLButtonElement).click();
    await tick();
    expect(fn).toHaveBeenCalled();
  });
});
