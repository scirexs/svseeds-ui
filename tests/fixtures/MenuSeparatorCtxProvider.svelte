<script module lang="ts">
  import { setMenuItemContext, type MenuItemContext } from "#svs/_MenuItem.svelte";
</script>

<script lang="ts">
  import MenuSeparator from "#svs/_MenuSeparator.svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined) }: { variant?: string; styling?: any } = $props();
  const ctx: MenuItemContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
    },
    close() {},
  };
  setMenuItemContext(ctx);
</script>

<MenuSeparator />
