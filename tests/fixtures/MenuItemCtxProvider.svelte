<script module lang="ts">
  import { _setMenuItemContext, type MenuItemContext } from "#svs/_MenuItem.svelte";
</script>

<script lang="ts">
  import MenuItem from "#svs/_MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined), closed = $bindable(0), onselect, disabled, itemStyling }:
    { variant?: string; styling?: any; closed?: number; onselect?: (ev: MouseEvent) => void; disabled?: boolean; itemStyling?: any } = $props();
  const ctx: MenuItemContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
    },
    close() {
      closed += 1;
    },
  };
  _setMenuItemContext(ctx);
  const label = createRawSnippet(() => ({ render: () => `<span>Item</span>` }));
</script>

<MenuItem {onselect} {disabled} styling={itemStyling} children={label} />
