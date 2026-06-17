<script module lang="ts">
  import { _setMenuItemContext, type MenuItemContext } from "#svs/MenuItem.svelte";
</script>

<script lang="ts">
  import MenuItem from "#svs/MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined), closed = $bindable(0), onselect, disabled, href, itemStyling }:
    { variant?: string; styling?: any; closed?: number; onselect?: (ev: MouseEvent) => void; disabled?: boolean; href?: string; itemStyling?: any } = $props();
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

<MenuItem {onselect} {disabled} {href} styling={itemStyling} children={label} />
