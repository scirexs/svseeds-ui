<script lang="ts">
  import ContextMenu from "#svs/ContextMenu.svelte";
  import MenuItem from "#svs/_MenuItem.svelte";
  import MenuSeparator from "#svs/_MenuSeparator.svelte";
  import { createRawSnippet } from "svelte";

  let { onselect, open = $bindable(false), lock = false }: { onselect?: (ev: MouseEvent) => void; open?: boolean; lock?: boolean } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<ContextMenu bind:open {lock}>
  {#snippet children()}
    <MenuItem children={txt("Cut")} {onselect} />
    <MenuItem children={txt("Copy")} />
    <MenuSeparator />
    <MenuItem children={txt("Paste")} disabled {onselect} />
    <MenuItem children={txt("Delete")} />
  {/snippet}
</ContextMenu>
