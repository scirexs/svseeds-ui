<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <Calendar {...props} />
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
    bottom?: Snippet<[string, () => void]>;
    monthPicker?: Omit<MonthPickerProps, "value" | "min" | "max" | "variant">;
    transition?: TransitionProp;
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
      <div class="main" role="grid">
        <div class="aux" role="row" data-header>
          <span class="extra" role="columnheader" data-header data-weekday />
        </div>
        <div class="aux" role="row">day cells</div>
      </div>
      MonthPicker while picking
    </div>
    <div class="bottom" conditional>{bottom}</div>
  </div>
  ```
  ### Behavior
  - Prev/next page `display`; the label toggles an embedded `_MonthPicker`.
  - Enabled day clicks and Enter/Space select a single `Temporal.PlainDate`.
  - Day cells expose `data-today`, `data-selected`, `data-outside`, `data-disabled`, and `data-weekday`.
  - The weekday-header row and its `columnheader` cells carry `data-header`; the day rows carry `data-*` only on their cells.
  - Arrow, Home/End, PageUp/PageDown, and Shift+PageUp/PageDown update roving focus.
-->
<script module lang="ts">
  export interface CalendarProps {
    value?: Temporal.PlainDate;
    display?: Temporal.PlainYearMonth;
    picking?: boolean;
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    outsideDays?: boolean;
    fixedWeeks?: boolean;
    firstDayOfWeek?: number;
    locale?: string;
    label?: Snippet<[Temporal.PlainYearMonth, string, boolean]>;
    left?: Snippet<[string]>;
    right?: Snippet<[string]>;
    weekday?: Snippet<[number, string]>;
    day?: Snippet<[DayCtx]>;
    bottom?: Snippet<[string, () => void]>;
    monthPicker?: Omit<MonthPickerProps, "value" | "min" | "max" | "variant">;
    transition?: TransitionProp;
    styling?: SVSClass;
    variant?: SVSVariant;
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
  export type TransitionProp = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  export type CalendarReqdProps = never;
  export type CalendarBindProps = "value" | "display" | "picking";

  export const _CALENDAR_PRESET = "svs-calendar";

  import { tick, untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, shouldReduceMotion } from "./_core";
  import MonthPicker from "./MonthPicker.svelte";
  import type { Snippet } from "svelte";
  import type { KeyboardEventHandler, MouseEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
  import type { MonthPickerProps } from "./MonthPicker.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), display = $bindable(), picking = $bindable(false), min, max, isDisabled, outsideDays = false, fixedWeeks = false, firstDayOfWeek = 0, locale, label, left, right, weekday, day, bottom, monthPicker, transition, styling, variant = VARIANT.NEUTRAL }: CalendarProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_CALENDAR_PRESET, styling));
  const uid = $props.id();
  const idCaption = `${uid}-caption`;
  // svelte-ignore state_referenced_locally
  if (display === undefined) display = (value ?? Temporal.Now.plainDateISO()).toPlainYearMonth();
  const today = $derived(Temporal.Now.plainDateISO());

  // *** States *** //
  const initialDisplay = display as Temporal.PlainYearMonth;
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

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    display;
    value;
    untrack(() => syncFocus());
  });
  $effect.pre(() => {
    cellKeys;
    untrack(() => trimCells(cellKeys));
  });

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
      <MonthPicker
        {...monthPicker}
        bind:value={() => currentDisplay(), (v) => (display = v)}
        min={min?.toPlainYearMonth()}
        max={max?.toPlainYearMonth()}
        {variant}
      />
    </div>
  {:else}
    <div class={cls(PARTS.MIDDLE, variant)} transition:tfn|local={tparams}>
      <div class={cls(PARTS.MAIN, variant)} role="grid" tabindex="-1" aria-labelledby={idCaption} onkeydown={hkeydown}>
        <div class={cls(PARTS.AUX, variant)} role="row" data-header>
          {#each weekdayLabels as wl}
            <span class={cls(PARTS.EXTRA, VARIANT.NEUTRAL)} role="columnheader" data-header data-weekday={wl.weekday} aria-label={wl.full}>
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
    </div>
  {/if}

  {#if bottom}
    <div class={cls(PARTS.BOTTOM, variant)}>{@render bottom(variant, setToday)}</div>
  {/if}
</div>
