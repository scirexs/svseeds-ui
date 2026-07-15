<script lang="ts">
  import MenuList from "#svs/MenuList.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import MenuSub from "#svs/MenuSub.svelte";
  import { createRawSnippet } from "svelte";

  // prettier-ignore
  let { open = $bindable(false), disabled = false, orientation = "vertical", standalone = false, styling, subStyling, variant = "neutral", subVariant = "neutral", subClass, onselect }:
    { open?: boolean; disabled?: boolean; orientation?: "horizontal" | "vertical"; standalone?: boolean; styling?: any; subStyling?: any; variant?: string; subVariant?: string; subClass?: string; onselect?: (ev: MouseEvent) => void } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

{#snippet submenu()}
  <MenuList aria-label="Submenu">
    {#snippet children()}
      <MenuItem children={txt("Alpha")} />
      <MenuItem children={txt("Beta")} {onselect} />
    {/snippet}
  </MenuList>
{/snippet}

{#if standalone}
  <MenuSub bind:open {disabled} styling={subStyling} variant={subVariant} class={subClass} label="More" data-id="sub" children={submenu} />
{:else}
  <MenuList {orientation} {styling} {variant} aria-label="Main menu">
    {#snippet children()}
      <MenuItem children={txt("Cut")} />
      <MenuSub
        bind:open
        {disabled}
        styling={subStyling}
        variant={subVariant}
        class={subClass}
        label="More"
        data-id="sub"
        children={submenu}
      />
      <MenuItem children={txt("After")} />
    {/snippet}
  </MenuList>
{/if}
