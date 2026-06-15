<script module lang="ts">
  import { _setMenuContainerContext, type MenuContainerContext } from "#svs/_MenuList.svelte";
</script>

<script lang="ts">
  import MenuList, { type MenuItemData } from "#svs/_MenuList.svelte";
  import MenuItem from "#svs/_MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined), open = $bindable(false), closed = $bindable(0), orientation = "vertical", listVariant, listStyling, items, useItems = false }:
    { variant?: string; styling?: any; open?: boolean; closed?: number; orientation?: "horizontal" | "vertical"; listVariant?: string; listStyling?: any; items?: MenuItemData[]; useItems?: boolean } = $props();
  const ctx: MenuContainerContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
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

{#if useItems}
  <MenuList {orientation} variant={listVariant} styling={listStyling} {items} />
{:else}
  <MenuList {orientation} variant={listVariant} styling={listStyling}>
    {#snippet children()}
      <MenuItem children={txt("Cut")} />
      <MenuItem children={txt("Copy")} />
      <MenuItem children={txt("Paste")} disabled />
      <MenuItem children={txt("Delete")} />
    {/snippet}
  </MenuList>
{/if}
