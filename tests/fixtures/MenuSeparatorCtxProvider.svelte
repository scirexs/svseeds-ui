<script module lang="ts">
  import { _setMenuItemContext, type MenuItemContext } from "#svs/_MenuItem.svelte";
</script>

<script lang="ts">
  import MenuSeparator from "#svs/_MenuSeparator.svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined), orientation, ariaOrientation }:
    { variant?: string; styling?: any; orientation?: "horizontal" | "vertical"; ariaOrientation?: "horizontal" | "vertical" } = $props();
  const ctx: MenuItemContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
    },
    get orientation() {
      return orientation;
    },
    close() {},
  };
  _setMenuItemContext(ctx);
</script>

<MenuSeparator {ariaOrientation} />
