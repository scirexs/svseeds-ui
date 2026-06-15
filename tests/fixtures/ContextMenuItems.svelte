<script lang="ts">
  import ContextMenu from "#svs/ContextMenu.svelte";
  import MenuList from "#svs/_MenuList.svelte";
  import MenuItem from "#svs/_MenuItem.svelte";
  import MenuSeparator from "#svs/_MenuSeparator.svelte";
  import { createRawSnippet } from "svelte";

  let { onselect, open = $bindable(false), lock = false, styling, variant = "neutral" }: { onselect?: (ev: MouseEvent) => void; open?: boolean; lock?: boolean; styling?: any; variant?: string } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<ContextMenu bind:open {lock} {styling} {variant}>
  {#snippet children()}
    <MenuList>
      {#snippet children()}
        <MenuItem children={txt("Cut")} {onselect} />
        <MenuItem children={txt("Copy")} />
        <MenuSeparator />
        <MenuItem children={txt("Paste")} disabled {onselect} />
        <MenuItem children={txt("Delete")} />
      {/snippet}
    </MenuList>
  {/snippet}
</ContextMenu>
