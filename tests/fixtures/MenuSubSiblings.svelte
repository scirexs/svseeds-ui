<script lang="ts">
  import MenuList from "#svs/MenuList.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import MenuSub from "#svs/MenuSub.svelte";
  import { createRawSnippet } from "svelte";

  let { openA = $bindable(false), openB = $bindable(false) }: { openA?: boolean; openB?: boolean } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

{#snippet menu(name: string)}
  <MenuList aria-label={`${name} submenu`}>
    {#snippet children()}
      <MenuItem children={txt(`${name} one`)} />
    {/snippet}
  </MenuList>
{/snippet}

<MenuList aria-label="Main menu">
  {#snippet children()}
    <MenuSub bind:open={openA} label="Sub A">
      {#snippet children()}
        {@render menu("A")}
      {/snippet}
    </MenuSub>
    <MenuSub bind:open={openB} label="Sub B">
      {#snippet children()}
        {@render menu("B")}
      {/snippet}
    </MenuSub>
    <MenuItem children={txt("Plain")} />
  {/snippet}
</MenuList>
