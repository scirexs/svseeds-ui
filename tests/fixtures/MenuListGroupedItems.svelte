<script module lang="ts">
  import { _setMenuContainerContext, type MenuContainerContext } from "#svs/_MenuList.svelte";
</script>

<script lang="ts">
  import MenuList from "#svs/_MenuList.svelte";
  import MenuGroup from "#svs/_MenuGroup.svelte";
  import MenuItem from "#svs/_MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  let { open = $bindable(false), closed = $bindable(0) }: { open?: boolean; closed?: number } = $props();
  const ctx: MenuContainerContext = {
    get variant() {
      return "neutral";
    },
    get styling() {
      return undefined;
    },
    get open() {
      return open;
    },
    close() {
      closed += 1;
    },
  };
  _setMenuContainerContext(ctx);
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<MenuList>
  {#snippet children()}
    <MenuItem children={txt("Cut")} />
    <MenuGroup label="Edit">
      {#snippet children()}
        <MenuItem children={txt("Copy")} />
        <MenuItem children={txt("Paste")} disabled />
        <MenuItem children={txt("Delete")} />
      {/snippet}
    </MenuGroup>
  {/snippet}
</MenuList>
