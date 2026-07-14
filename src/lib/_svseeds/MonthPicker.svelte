<!--
  @component
  ### Usage
  Use standalone, or inside `Calendar` coordinated through context.
  ```svelte
  <MonthPicker {...props} />
  <Calendar>
    <MonthPicker {...props} />
  </Calendar>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MonthPickerProps {
    value?: Temporal.PlainYearMonth; // bindable; current year-month (Temporal.Now)
    min?: Temporal.PlainYearMonth; // lower bound (value.year - 100, month 1)
    max?: Temporal.PlainYearMonth; // upper bound (value.year + 100, month 12)
    order?: ("year" | "month")[]; // (["year","month"])
    locale?: string;
    monthLabel?: (month: number) => string;
    yearLabel?: (year: number) => string;
    left?: Snippet<[string]>; // Snippet<[variant]>
    middle?: Snippet<[string]>; // Snippet<[variant]>
    right?: Snippet<[string]>; // Snippet<[variant]>
    year?: Omit<WheelPickerProps, "options" | "value" | "variant">;
    month?: Omit<WheelPickerProps, "options" | "value" | "variant">;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" role="group">
    <div class="left" conditional>{left}</div>
    <WheelPicker /> year or month
    <div class="middle" conditional>{middle}</div>
    <WheelPicker /> month or year
    <div class="right" conditional>{right}</div>
  </div>
  ```
  ### Behavior
  - Two `_WheelPicker`s coordinate a single `Temporal.PlainYearMonth` value.
  - When embedded in `Calendar`, `value`, `min`, `max`, and `variant` come from context; presentational props stay on MonthPicker.
  - Year/month options are bounded by `min`/`max`, defaulting to a +/-100 year window.
  - Boundary year selection clamps the month into range; `order` controls wheel and tab order.
-->
<script module lang="ts">
  export interface MonthPickerProps {
    value?: Temporal.PlainYearMonth; // bindable; current year-month (Temporal.Now)
    min?: Temporal.PlainYearMonth; // lower bound (value.year - 100, month 1)
    max?: Temporal.PlainYearMonth; // upper bound (value.year + 100, month 12)
    order?: ("year" | "month")[]; // (["year","month"])
    locale?: string;
    monthLabel?: (month: number) => string;
    yearLabel?: (year: number) => string;
    left?: Snippet<[string]>; // Snippet<[variant]>
    middle?: Snippet<[string]>; // Snippet<[variant]>
    right?: Snippet<[string]>; // Snippet<[variant]>
    year?: Omit<WheelPickerProps, "options" | "value" | "variant">;
    month?: Omit<WheelPickerProps, "options" | "value" | "variant">;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MonthPickerReqdProps = never;
  export type MonthPickerBindProps = "value";

  export interface MonthPickerContext extends SVSContext {
    get value(): Temporal.PlainYearMonth | undefined;
    set value(v: Temporal.PlainYearMonth | undefined);
    get min(): Temporal.PlainYearMonth | undefined;
    get max(): Temporal.PlainYearMonth | undefined;
  }
  export const [_getMonthPickerContext, _setMonthPickerContext] = _createContext<MonthPickerContext>();

  export const _MONTHPICKER_PRESET = "svs-monthpicker";

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, _createContext } from "./_core";
  import WheelPicker from "./WheelPicker.svelte";
  import type { Snippet } from "svelte";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
  import type { WheelPickerProps, WheelOption } from "./WheelPicker.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), min, max, order = ["year", "month"], locale, monthLabel, yearLabel, left, middle, right, year, month, styling, variant = VARIANT.NEUTRAL }: MonthPickerProps = $props();
  const ctx = _getMonthPickerContext();

  // *** Initialize *** //
  const effValue = $derived(ctx ? ctx.value : value);
  const effMin = $derived(ctx ? ctx.min : min);
  const effMax = $derived(ctx ? ctx.max : max);
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const cls = $derived(_fnClass(_MONTHPICKER_PRESET, styling ?? ctx?.styling));
  // svelte-ignore state_referenced_locally
  if (!ctx && value === undefined) value = Temporal.Now.plainDateISO().toPlainYearMonth();
  const initial = (ctx?.value ?? value ?? Temporal.Now.plainDateISO().toPlainYearMonth()) as Temporal.PlainYearMonth;

  // *** States *** //
  const lo = $derived(effMin ?? Temporal.PlainYearMonth.from({ year: initial.year - 100, month: 1 }));
  const hi = $derived(effMax ?? Temporal.PlainYearMonth.from({ year: initial.year + 100, month: 12 }));
  const axes = $derived.by((): ("year" | "month")[] => {
    const first = order[0] === "month" ? "month" : "year";
    const second = order[1] && order[1] !== first ? order[1] : first === "year" ? "month" : "year";
    return [first, second];
  });

  // *** Reactive Handlers *** //
  const yearOptions = $derived.by((): WheelOption[] => {
    const options: WheelOption[] = [];
    for (let y = lo.year; y <= hi.year; y += 1) options.push({ value: String(y), text: textYear(y) });
    return options;
  });
  const monthOptions = $derived.by((): WheelOption[] => {
    const options: WheelOption[] = [];
    const ym = current();
    for (let m = 1; m <= 12; m += 1)
      options.push({ value: String(m), text: textMonth(m), disabled: m < minMonth(ym.year) || m > maxMonth(ym.year) });
    return options;
  });

  $effect.pre(() => {
    lo;
    hi;
    effValue;
    untrack(() => sync());
  });

  function sync() {
    const ym = current();
    const next = clamp(ym);
    if (Temporal.PlainYearMonth.compare(next, ym) !== 0) setValue(next);
  }
  function setYear(v: string) {
    const ym = current();
    const y = Number(v);
    const m = Math.min(Math.max(ym.month, minMonth(y)), maxMonth(y));
    setValue(clamp(Temporal.PlainYearMonth.from({ year: y, month: m })));
  }
  function setMonth(v: string) {
    const ym = current();
    setValue(clamp(Temporal.PlainYearMonth.from({ year: ym.year, month: Number(v) })));
  }
  function setValue(v: Temporal.PlainYearMonth | undefined) {
    if (ctx) ctx.value = v;
    else value = v;
  }
  function current(): Temporal.PlainYearMonth {
    return effValue ?? initial;
  }
  function clamp(ym: Temporal.PlainYearMonth): Temporal.PlainYearMonth {
    if (Temporal.PlainYearMonth.compare(ym, lo) < 0) return lo;
    if (Temporal.PlainYearMonth.compare(ym, hi) > 0) return hi;
    return ym;
  }
  function minMonth(y: number): number {
    return y === lo.year ? lo.month : 1;
  }
  function maxMonth(y: number): number {
    return y === hi.year ? hi.month : 12;
  }
  function textYear(y: number): string {
    return yearLabel?.(y) ?? Temporal.PlainDate.from({ year: y, month: 1, day: 1 }).toLocaleString(locale, { year: "numeric" });
  }
  function textMonth(m: number): string {
    return monthLabel?.(m) ?? Temporal.PlainDate.from({ year: current().year, month: m, day: 1 }).toLocaleString(locale, { month: "long" });
  }
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, effVariant)} role="group">
  {#if left}
    <div class={cls(PARTS.LEFT, effVariant)}>{@render left(effVariant)}</div>
  {/if}
  {@render wheel(axes[0])}
  {#if middle}
    <div class={cls(PARTS.MIDDLE, effVariant)}>{@render middle(effVariant)}</div>
  {/if}
  {@render wheel(axes[1])}
  {#if right}
    <div class={cls(PARTS.RIGHT, effVariant)}>{@render right(effVariant)}</div>
  {/if}
</div>

{#snippet wheel(axis: "year" | "month")}
  {#if axis === "year"}
    <WheelPicker loop={false} {...year} options={yearOptions} bind:value={() => String(current().year), setYear} variant={effVariant} />
  {:else}
    <WheelPicker loop={true} {...month} options={monthOptions} bind:value={() => String(current().month), setMonth} variant={effVariant} />
  {/if}
{/snippet}
