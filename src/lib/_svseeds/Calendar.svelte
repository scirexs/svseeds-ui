<!--
  @component
  ### Usage
  Use standalone, with an optional declarative `MonthPicker` child.
  ```svelte
  <Calendar {...props} />
  <Calendar>
    <MonthPicker {...props} />
  </Calendar>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface CalendarProps {
    value?: Temporal.PlainDate; // bindable; selected date
    display?: Temporal.PlainYearMonth; // bindable; shown month
    picking?: boolean; // bindable (false)
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    outsideDays?: boolean; // (false)
    fixedWeeks?: boolean; // (false)
    firstDayOfWeek?: number; // (0=Sun)
    locale?: string;
    label?: Snippet<[Temporal.PlainYearMonth, string, boolean]>;
    left?: Snippet<[string]>;
    right?: Snippet<[string]>;
    weekday?: Snippet<[number, string]>;
    day?: Snippet<[DayCtx]>;
    bottom?: Snippet<[CalendarCtl, boolean, string]>;
    children?: Snippet;
    monthPicker?: Omit<MonthPickerProps, "value" | "min" | "max" | "variant">;
    transition?: TransitionProp;
    pageTransition?: TransitionProp;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  type DayCtx = {
    date: Temporal.PlainDate;
    variant: string;
    weekday: number;
    today: boolean;
    selected: boolean;
    outside: boolean;
    disabled: boolean;
  };
  type CalendarCtl = {
    setToday: () => void;
    clear: () => void;
  };
  type TransitionProp = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  ```
  ### Anatomy
  ```svelte
  <div class="whole" role="group">
    <div class="top">
      <button class="left" />
      <button class="label" />
      <button class="right" />
    </div>
    <div class="middle">
      <div class="main" role="grid" in out>
        <div class="aux" role="row" data-header>
          <span class="extra" role="columnheader" data-header data-weekday />
        </div>
        <div class="aux" role="row">day cells</div>
      </div>
      {#if picking}{children or MonthPicker}{:else}grid{/if}
    </div>
    <div class="bottom" conditional>{bottom}</div>
  </div>
  ```
  ### Behavior
  - Prev/next page `display`; the label toggles the picking slot.
  - While picking, `children` renders in the middle slot and wins over `monthPicker`; otherwise the internal MonthPicker renders.
  - An embedded MonthPicker self-wires `display`/`min`/`max`/`variant` through context.
  - Enabled day clicks and Enter/Space select a single `Temporal.PlainDate`.
  - Day cells expose `data-today`, `data-selected`, `data-outside`, `data-disabled`, and `data-weekday`.
  - The weekday-header row and its `columnheader` cells carry `data-header`; the day rows carry `data-*` only on their cells.
  - Arrow, Home/End, PageUp/PageDown, and Shift+PageUp/PageDown update roving focus.
  - The grid re-keys when `display` changes; opt-in `pageTransition` slides the page. Its `fn` receives `params.dir` (`-1` previous, `+1` next, `0` none) and, because the grid uses split `in:`/`out:` directives, `direction` is `"in"` for the entering grid and `"out"` for the leaving grid, so the caller can overlay only the leaving grid. Reduced motion falls back to no animation.
  - A cross-slide transition that overlays the leaving grid (`position: absolute`) requires the grid container to provide `position: relative; overflow: hidden`.
  - The `bottom` snippet receives `CalendarCtl` (`setToday`, `clear`), `picking`, and `variant`; `setToday` selects today, jumps to its month, and closes the MonthPicker, while `clear` resets `value` to `undefined`.
-->
<script module lang="ts">
  export interface CalendarProps {
    value?: Temporal.PlainDate; // bindable; selected date
    display?: Temporal.PlainYearMonth; // bindable; shown month
    picking?: boolean; // bindable (false)
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    outsideDays?: boolean; // (false)
    fixedWeeks?: boolean; // (false)
    firstDayOfWeek?: number; // (0=Sun)
    locale?: string;
    label?: Snippet<[Temporal.PlainYearMonth, string, boolean]>;
    left?: Snippet<[string]>;
    right?: Snippet<[string]>;
    weekday?: Snippet<[number, string]>;
    day?: Snippet<[DayCtx]>;
    bottom?: Snippet<[CalendarCtl, boolean, string]>;
    children?: Snippet;
    monthPicker?: Omit<MonthPickerProps, "value" | "min" | "max" | "variant">;
    transition?: TransitionProp;
    pageTransition?: TransitionProp;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type DayCtx = {
    date: Temporal.PlainDate;
    variant: string;
    weekday: number;
    today: boolean;
    selected: boolean;
    outside: boolean;
    disabled: boolean;
  };
  export type CalendarCtl = {
    setToday: () => void;
    clear: () => void;
  };
  export type TransitionProp = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  export type CalendarReqdProps = never;
  export type CalendarBindProps = "value" | "display" | "picking";

  export const _CALENDAR_PRESET = "svs-calendar";

  import { tick, untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, shouldReduceMotion } from "./_core";
  import MonthPicker, { _setMonthPickerContext } from "./MonthPicker.svelte";
  import type { Snippet } from "svelte";
  import type { KeyboardEventHandler, MouseEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
  import type { MonthPickerContext, MonthPickerProps } from "./MonthPicker.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), display = $bindable(), picking = $bindable(false), min, max, isDisabled, outsideDays = false, fixedWeeks = false, firstDayOfWeek = 0, locale, label, left, right, weekday, day, bottom, children, monthPicker, transition, pageTransition, styling, variant = VARIANT.NEUTRAL }: CalendarProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_CALENDAR_PRESET, styling));
  const uid = $props.id();
  const idCaption = `${uid}-caption`;
  // svelte-ignore state_referenced_locally
  if (display === undefined) display = (value ?? Temporal.Now.plainDateISO()).toPlainYearMonth();
  const initialDisplay = display as Temporal.PlainYearMonth;
  const today = $derived(Temporal.Now.plainDateISO());
  const ctxMin = $derived(min?.toPlainYearMonth());
  const ctxMax = $derived(max?.toPlainYearMonth());
  const ctxVariant = $derived(variant);
  const mpCtx: MonthPickerContext = {
    get value() {
      return currentDisplay();
    },
    set value(v: Temporal.PlainYearMonth | undefined) {
      if (v) display = v;
    },
    get min() {
      return ctxMin;
    },
    get max() {
      return ctxMax;
    },
    get variant() {
      return ctxVariant;
    },
    get styling() {
      return undefined;
    },
  };
  _setMonthPickerContext(mpCtx);

  // *** States *** //
  let dir = $state(0);
  let prevYm = initialDisplay;
  let focused = $state(value && sameMonth(value, initialDisplay) ? value : firstOf(initialDisplay));
  let cells = $state<Record<string, HTMLElement>>({});
  const firstWeekday = $derived(normWeekday(firstDayOfWeek));
  const monthStart = $derived(firstOf(currentDisplay()));
  const captionText = $derived(monthStart.toLocaleString(locale, { year: "numeric", month: "long" }));
  const appLabel = $derived(`Calendar, ${captionText}`);
  const weekdayLabels = $derived.by(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const long = new Intl.DateTimeFormat(locale, { weekday: "long" });
    return Array.from({ length: 7 }, (_, i) => {
      const weekday = (firstWeekday + i) % 7;
      const d = dateForWeekday(weekday);
      return { weekday, text: short.format(d), full: long.format(d) };
    });
  });
  const weeks = $derived.by(() => {
    const first = monthStart;
    const lead = (weekdayOf(first) - firstWeekday + 7) % 7;
    const rows = fixedWeeks ? 6 : Math.ceil((lead + first.daysInMonth) / 7);
    const start = first.subtract({ days: lead });
    return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, c) => start.add({ days: r * 7 + c })));
  });
  const cellKeys = $derived.by(() => {
    const shown = currentDisplay();
    const keys = new Set<string>();
    for (const week of weeks) {
      for (const cell of week) {
        if (outsideDays || sameMonth(cell, shown)) keys.add(cell.toString());
      }
    }
    return keys;
  });
  const reduced = $derived(shouldReduceMotion());
  const tfn = $derived(!reduced && transition?.fn ? transition.fn : noop);
  const tparams = $derived(transition?.params as any);
  const pfn = $derived(!reduced && pageTransition?.fn ? pageTransition.fn : noop);
  const pparams = $derived({ ...((pageTransition?.params ?? {}) as object), dir });

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    display;
    value;
    untrack(() => sync());
  });
  $effect.pre(() => {
    cellKeys;
    untrack(() => trimCells(cellKeys));
  });

  function sync() {
    const cur = currentDisplay();
    if (!cur.equals(prevYm)) {
      dir = Temporal.PlainYearMonth.compare(cur, prevYm);
      prevYm = cur;
    }
    syncFocus();
  }
  function syncFocus() {
    const shown = currentDisplay();
    if (sameMonth(focused, shown)) return;
    focused = value && sameMonth(value, shown) ? value : firstOf(shown);
  }
  function currentDisplay(): Temporal.PlainYearMonth {
    return display ?? initialDisplay;
  }
  function noop() {
    return {};
  }
  function firstOf(ym: Temporal.PlainYearMonth): Temporal.PlainDate {
    return Temporal.PlainDate.from({ year: ym.year, month: ym.month, day: 1 });
  }
  function normWeekday(n: number): number {
    return ((Math.trunc(n) % 7) + 7) % 7;
  }
  function weekdayOf(d: Temporal.PlainDate): number {
    return d.dayOfWeek % 7;
  }
  function sameMonth(d: Temporal.PlainDate, ym: Temporal.PlainYearMonth): boolean {
    return d.year === ym.year && d.month === ym.month;
  }
  function dateForWeekday(weekday: number): Date {
    return new Date(Date.UTC(2023, 0, 1 + weekday));
  }
  function inRange(d: Temporal.PlainDate): boolean {
    if (min && Temporal.PlainDate.compare(d, min) < 0) return false;
    if (max && Temporal.PlainDate.compare(d, max) > 0) return false;
    return true;
  }
  function disabled(d: Temporal.PlainDate): boolean {
    return !inRange(d) || !!isDisabled?.(d);
  }
  function selected(d: Temporal.PlainDate): boolean {
    return !!value?.equals(d);
  }
  function variantOf(d: Temporal.PlainDate): string {
    if (disabled(d)) return VARIANT.INACTIVE;
    if (selected(d)) return VARIANT.ACTIVE;
    return VARIANT.NEUTRAL;
  }
  function ctx(d: Temporal.PlainDate): DayCtx {
    return {
      date: d,
      variant: variantOf(d),
      weekday: weekdayOf(d),
      today: today.equals(d),
      selected: selected(d),
      outside: !sameMonth(d, currentDisplay()),
      disabled: disabled(d),
    };
  }
  function labelOf(d: Temporal.PlainDate): string {
    return d.toLocaleString(locale, { dateStyle: "long" });
  }
  function displayOf(d: Temporal.PlainDate) {
    display = d.toPlainYearMonth();
  }
  function prevMonth() {
    display = currentDisplay().subtract({ months: 1 });
  }
  function nextMonth() {
    display = currentDisplay().add({ months: 1 });
  }
  function select(d: Temporal.PlainDate) {
    if (disabled(d)) return;
    value = d;
    focused = d;
    if (!sameMonth(d, currentDisplay())) displayOf(d);
  }
  function setToday() {
    displayOf(today);
    select(today);
    picking = false;
  }
  function clear() {
    value = undefined;
  }
  function move(d: Temporal.PlainDate) {
    focused = d;
    if (!sameMonth(d, currentDisplay())) displayOf(d);
    tick().then(() => focusDate(d));
  }
  function focusDate(d: Temporal.PlainDate) {
    cells[d.toString()]?.focus();
  }
  function trimCells(keys: Set<string>) {
    for (const key of Object.keys(cells)) {
      if (!keys.has(key)) delete cells[key];
    }
  }
  function weekEdge(toEnd: boolean): Temporal.PlainDate {
    const offset = (weekdayOf(focused) - firstWeekday + 7) % 7;
    return focused.add({ days: toEnd ? 6 - offset : -offset });
  }

  // *** Event Handlers *** //
  const hprev: MouseEventHandler<HTMLButtonElement> = () => prevMonth();
  const hnext: MouseEventHandler<HTMLButtonElement> = () => nextMonth();
  const hlabel: MouseEventHandler<HTMLButtonElement> = () => (picking = !picking);
  const hkeydown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    let next: Temporal.PlainDate | undefined;
    if (ev.key === "ArrowLeft") next = focused.subtract({ days: 1 });
    else if (ev.key === "ArrowRight") next = focused.add({ days: 1 });
    else if (ev.key === "ArrowUp") next = focused.subtract({ days: 7 });
    else if (ev.key === "ArrowDown") next = focused.add({ days: 7 });
    else if (ev.key === "Home") next = weekEdge(false);
    else if (ev.key === "End") next = weekEdge(true);
    else if (ev.key === "PageUp") next = focused.subtract(ev.shiftKey ? { years: 1 } : { months: 1 });
    else if (ev.key === "PageDown") next = focused.add(ev.shiftKey ? { years: 1 } : { months: 1 });
    else if (ev.key === "Enter" || ev.key === " ") select(focused);
    else return;
    ev.preventDefault();
    if (next) move(next);
  };
  const ctl: CalendarCtl = { setToday, clear };
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-label={appLabel} data-svs-calendar={uid}>
  <div class={cls(PARTS.TOP, variant)}>
    <button class={cls(PARTS.LEFT, variant)} type="button" onclick={hprev}
      >{#if left}{@render left(variant)}{:else}Previous{/if}</button
    >
    <button id={idCaption} class={cls(PARTS.LABEL, variant)} type="button" aria-expanded={picking} onclick={hlabel}>
      {#if label}{@render label(currentDisplay(), variant, picking)}{:else}{captionText}{/if}
    </button>
    <button class={cls(PARTS.RIGHT, variant)} type="button" onclick={hnext}
      >{#if right}{@render right(variant)}{:else}Next{/if}</button
    >
  </div>

  {#if picking}
    <div class={cls(PARTS.MIDDLE, variant)} transition:tfn|local={tparams}>
      {#if children}{@render children()}{:else}<MonthPicker {...monthPicker} />{/if}
    </div>
  {:else}
    <div class={cls(PARTS.MIDDLE, variant)} transition:tfn|local={tparams}>
      {#key currentDisplay().toString()}
        <div
          class={cls(PARTS.MAIN, variant)}
          role="grid"
          tabindex="-1"
          aria-labelledby={idCaption}
          onkeydown={hkeydown}
          in:pfn|local={pparams}
          out:pfn|local={pparams}
        >
          <div class={cls(PARTS.AUX, variant)} role="row" data-header>
            {#each weekdayLabels as wl}
              <span
                class={cls(PARTS.EXTRA, VARIANT.NEUTRAL)}
                role="columnheader"
                data-header
                data-weekday={wl.weekday}
                aria-label={wl.full}
              >
                {#if weekday}{@render weekday(wl.weekday, variant)}{:else}{wl.text}{/if}
              </span>
            {/each}
          </div>
          {#each weeks as week}
            <div class={cls(PARTS.AUX, variant)} role="row">
              {#each week as cell}
                {@const outside = !sameMonth(cell, currentDisplay())}
                {#if outside && !outsideDays}
                  <span class={cls(PARTS.EXTRA, VARIANT.NEUTRAL)} role="gridcell" aria-hidden="true"></span>
                {:else}
                  {@const c = ctx(cell)}
                  <button
                    class={cls(PARTS.EXTRA, c.variant)}
                    type="button"
                    role="gridcell"
                    tabindex={cell.equals(focused) ? 0 : -1}
                    bind:this={cells[cell.toString()]}
                    aria-selected={c.selected}
                    aria-disabled={c.disabled || undefined}
                    aria-current={c.today ? "date" : undefined}
                    aria-label={labelOf(cell)}
                    data-date={cell.toString()}
                    data-today={c.today || undefined}
                    data-selected={c.selected || undefined}
                    data-outside={c.outside || undefined}
                    data-disabled={c.disabled || undefined}
                    data-weekday={c.weekday}
                    onfocus={() => (focused = cell)}
                    onclick={() => select(cell)}
                  >
                    {#if day}{@render day(c)}{:else}{cell.day}{/if}
                  </button>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      {/key}
    </div>
  {/if}

  {#if bottom}
    <div class={cls(PARTS.BOTTOM, variant)}>{@render bottom(ctl, picking, variant)}</div>
  {/if}
</div>
