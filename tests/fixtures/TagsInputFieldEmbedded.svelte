<script lang="ts">
  import TagsInputField, { type TagsInputFieldProps } from "#svs/TagsInputField.svelte";
  import TagsInput, { type TagsInputProps } from "#svs/TagsInput.svelte";
  import { untrack } from "svelte";
  import { VARIANT } from "#svs/core";

  interface Props {
    field?: TagsInputFieldProps;
    input?: TagsInputProps;
  }

  let { field = {}, input = {} }: Props = $props();
  let values = $state(untrack(() => field.values ?? []));
  let variant = $state(untrack(() => field.variant ?? VARIANT.NEUTRAL));
  let element = $state(untrack(() => field.element));

  $effect(() => {
    field.values = values;
    field.variant = variant;
    field.element = element;
  });
</script>

<TagsInputField {...field} bind:values bind:variant bind:element>
  <TagsInput {...input} />
</TagsInputField>
