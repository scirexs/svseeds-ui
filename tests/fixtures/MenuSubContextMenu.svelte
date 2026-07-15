<script lang="ts">
  import ContextMenu from "#svs/ContextMenu.svelte";
  import MenuList from "#svs/MenuList.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import MenuSub from "#svs/MenuSub.svelte";
  import { createRawSnippet } from "svelte";

  let {
    open = $bindable(false),
    subOpen = $bindable(false),
    onselect,
  }: { open?: boolean; subOpen?: boolean; onselect?: (ev: MouseEvent) => void } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<ContextMenu bind:open>
  {#snippet children()}
    <MenuList aria-label="Context menu">
      {#snippet children()}
        <MenuItem children={txt("Cut")} />
        <MenuSub bind:open={subOpen} label="More">
          {#snippet children()}
            <MenuList aria-label="Submenu">
              {#snippet children()}
                <MenuItem children={txt("Leaf")} {onselect} />
              {/snippet}
            </MenuList>
          {/snippet}
        </MenuSub>
      {/snippet}
    </MenuList>
  {/snippet}
</ContextMenu>
