<script lang="ts">
  import { untrack } from "svelte";
  import DateField, { type DateFieldProps } from "#svs/DateField.svelte";
  import DateInput, { type DateInputProps } from "#svs/DateInput.svelte";
  import { VARIANT } from "#svs/core";

  interface Props {
    field?: DateFieldProps;
    child?: DateInputProps;
  }

  let { field = {}, child = {} }: Props = $props();
  let value = $state(untrack(() => field.value));
  let variant = $state(untrack(() => field.variant ?? VARIANT.NEUTRAL));
  let element = $state(untrack(() => field.element));

  $effect(() => {
    field.value = value;
    field.variant = variant;
    field.element = element;
  });
</script>

<DateField {...field} bind:value bind:variant bind:element>
  <DateInput {...child} />
</DateField>
