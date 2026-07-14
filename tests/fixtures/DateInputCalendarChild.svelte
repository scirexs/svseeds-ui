<script module lang="ts">
  import type { CalendarProps } from "#svs/Calendar.svelte";
  import type { DateInputProps } from "#svs/DateInput.svelte";

  interface Props extends Omit<DateInputProps, "value" | "open" | "children"> {
    value?: Temporal.PlainDate;
    open?: boolean;
    childCalendar?: CalendarProps;
  }
</script>

<script lang="ts">
  import Calendar from "#svs/Calendar.svelte";
  import DateInput from "#svs/DateInput.svelte";

  // prettier-ignore
  let { value = $bindable(), open = $bindable(false), childCalendar, ...rest }: Props = $props();
</script>

{#snippet children()}
  <Calendar {...childCalendar as any} />
{/snippet}

<DateInput bind:value bind:open {children} {...rest} />
<output data-testid="value">{value?.toString() ?? ""}</output>
<output data-testid="open">{open}</output>
