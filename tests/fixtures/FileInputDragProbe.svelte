<script lang="ts">
  import FileInput from "#svs/_FileInput.svelte";

  interface Props {
    files?: File[];
    rejectBy?: ("accept" | "maxSize" | "maxFiles")[];
    accept?: string;
    multiple?: boolean;
  }

  let { files = $bindable([]), rejectBy = $bindable([]), accept, multiple = false }: Props = $props();
</script>

<FileInput bind:files bind:rejectBy droppable {accept} {multiple}>
  {#snippet children(_files, dragover)}
    <span data-testid="drag">{dragover}</span>
  {/snippet}
</FileInput>
