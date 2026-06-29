<script lang="ts">
  import { untrack } from "svelte";
  import Pagination, { type PaginationProps } from "#svs/Pagination.svelte";
  import ComboBox, { type ComboBoxProps } from "#svs/ComboBox.svelte";

  interface Props {
    paging?: PaginationProps;
    input?: ComboBoxProps;
  }

  let { paging = {}, input = {} }: Props = $props();
  let value = $state(untrack(() => paging.value ?? 1));

  $effect(() => {
    paging.value = value;
  });
</script>

<Pagination {...paging} bind:value>
  <ComboBox {...input} />
</Pagination>
