<script module lang="ts">
  import { _setMenuItemContext, type MenuItemContext } from "#svs/MenuItem.svelte";
</script>

<script lang="ts">
  import MenuGroup from "#svs/MenuGroup.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  // prettier-ignore
  let { variant = $bindable("neutral"), styling = $bindable(undefined), groupStyling }:
    { variant?: string; styling?: any; groupStyling?: any } = $props();
  const ctx: MenuItemContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
    },
    close() {},
  };
  _setMenuItemContext(ctx);
  const item = createRawSnippet(() => ({ render: () => `<span>Item</span>` }));
</script>

<MenuGroup label="Edit" styling={groupStyling}>
  {#snippet children()}
    <MenuItem children={item} />
    <MenuItem children={item} />
  {/snippet}
</MenuGroup>
