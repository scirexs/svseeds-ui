<script lang="ts">
  import ToggleGroupField, { type ToggleGroupFieldProps } from "#svs/ToggleGroupField.svelte";
  import ToggleGroup, { type ToggleGroupProps, type ToggleOption } from "#svs/_ToggleGroup.svelte";
  import { untrack } from "svelte";
  import { VARIANT } from "#svs/core";

  interface Props {
    field?: ToggleGroupFieldProps;
    input?: ToggleGroupProps;
  }

  let { field = {}, input = { options: new Map<string, string | ToggleOption>() } }: Props = $props();
  let values = $state(untrack(() => field.values ?? []));
  let variant = $state(untrack(() => field.variant ?? VARIANT.NEUTRAL));
  let elements = $state(untrack(() => field.elements ?? []));

  $effect(() => {
    field.values = values;
    field.variant = variant;
    field.elements = elements;
  });
</script>

<ToggleGroupField {...field} bind:values bind:variant bind:elements>
  <ToggleGroup {...input} />
</ToggleGroupField>
