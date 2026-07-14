<script module lang="ts">
  import Calendar from "#svs/Calendar.svelte";
  import MonthPicker from "#svs/MonthPicker.svelte";
  import type { CalendarProps } from "#svs/Calendar.svelte";
  import type { MonthPickerProps } from "#svs/MonthPicker.svelte";

  interface Props extends Omit<CalendarProps, "value" | "display" | "picking" | "children"> {
    value?: Temporal.PlainDate;
    display?: Temporal.PlainYearMonth;
    picking?: boolean;
    mode?: "marker" | "monthpicker";
    childMonthPicker?: Omit<MonthPickerProps, "value" | "min" | "max" | "variant">;
  }
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), display = $bindable(), picking = $bindable(false), mode = "monthpicker", childMonthPicker, ...rest }: Props = $props();
</script>

{#snippet children()}
  {#if mode === "marker"}
    <span data-testid="calendar-child">child</span>
  {:else}
    <MonthPicker {...childMonthPicker as any} />
  {/if}
{/snippet}

<Calendar bind:value bind:display bind:picking {...rest as any} {children} />
<output data-testid="value">{value ? `${value.year}-${value.month}-${value.day}` : ""}</output>
<output data-testid="display">{display ? `${display.year}-${display.month}` : ""}</output>
<output data-testid="picking">{picking}</output>
