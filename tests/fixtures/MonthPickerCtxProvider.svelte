<script module lang="ts">
  export interface MonthPickerCtxProviderProps {
    value?: Temporal.PlainYearMonth;
    min?: Temporal.PlainYearMonth;
    max?: Temporal.PlainYearMonth;
    variant?: string;
    ownValue?: Temporal.PlainYearMonth;
    ownMin?: Temporal.PlainYearMonth;
    ownMax?: Temporal.PlainYearMonth;
    ownVariant?: string;
  }
</script>

<script lang="ts">
  import MonthPicker, { _setMonthPickerContext } from "#svs/MonthPicker.svelte";
  import { VARIANT } from "#svs/core";
  import type { MonthPickerContext } from "#svs/MonthPicker.svelte";

  // prettier-ignore
  let { value = $bindable(Temporal.PlainYearMonth.from({ year: 2021, month: 6 })), min, max, variant = VARIANT.NEUTRAL, ownValue = $bindable(), ownMin, ownMax, ownVariant }: MonthPickerCtxProviderProps = $props();

  const ctx: MonthPickerContext = {
    get value() {
      return value;
    },
    set value(v: Temporal.PlainYearMonth | undefined) {
      if (v) value = v;
    },
    get min() {
      return min;
    },
    get max() {
      return max;
    },
    get variant() {
      return variant;
    },
    get styling() {
      return undefined;
    },
  };
  _setMonthPickerContext(ctx);
</script>

<MonthPicker bind:value={ownValue} min={ownMin} max={ownMax} variant={ownVariant} />
<output data-testid="ctx-ym">{value ? `${value.year}-${value.month}` : ""}</output>
<output data-testid="own-ym">{ownValue ? `${ownValue.year}-${ownValue.month}` : ""}</output>
