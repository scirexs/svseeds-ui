<script module lang="ts">
  import type { CalendarProps } from "#svs/Calendar.svelte";
  import type { SVSVariant } from "#svs/core";

  interface Props extends Omit<CalendarProps, "value" | "display" | "picking" | "min" | "max" | "isDisabled" | "variant"> {
    value?: Temporal.PlainDate;
    display?: Temporal.PlainYearMonth;
    picking?: boolean;
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    variant?: SVSVariant;
    ownValue?: Temporal.PlainDate;
    ownMin?: Temporal.PlainDate;
    ownMax?: Temporal.PlainDate;
    ownIsDisabled?: (d: Temporal.PlainDate) => boolean;
    ownVariant?: SVSVariant;
  }
</script>

<script lang="ts">
  import Calendar, { _setCalendarContext } from "#svs/Calendar.svelte";
  import { VARIANT } from "#svs/core";
  import type { CalendarContext } from "#svs/Calendar.svelte";

  // prettier-ignore
  let { value = $bindable(), display = $bindable(), picking = $bindable(false), min, max, isDisabled, variant = VARIANT.NEUTRAL, ownValue = $bindable(), ownMin, ownMax, ownIsDisabled, ownVariant, ...rest }: Props = $props();

  const ctx: CalendarContext = {
    get value() {
      return value;
    },
    set value(v: Temporal.PlainDate | undefined) {
      value = v;
    },
    get min() {
      return min;
    },
    get max() {
      return max;
    },
    get isDisabled() {
      return isDisabled;
    },
    get variant() {
      return variant;
    },
    get styling() {
      return undefined;
    },
  };
  _setCalendarContext(ctx);
</script>

<Calendar
  bind:value={ownValue}
  bind:display
  bind:picking
  min={ownMin}
  max={ownMax}
  isDisabled={ownIsDisabled}
  variant={ownVariant}
  {...rest as any}
/>
<output data-testid="ctx-value">{value?.toString() ?? ""}</output>
<output data-testid="own-value">{ownValue?.toString() ?? ""}</output>
<output data-testid="display">{display ? `${display.year}-${display.month}` : ""}</output>
