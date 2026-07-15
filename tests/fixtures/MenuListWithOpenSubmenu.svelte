<script lang="ts">
  import MenuList from "#svs/MenuList.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import MenuSub from "#svs/MenuSub.svelte";
  import { createRawSnippet } from "svelte";

  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<MenuList aria-label="Outer">
  {#snippet children()}
    <MenuItem children={txt("Alpha")} />
    <MenuSub open label="More">
      {#snippet children()}
        <MenuList aria-label="Inner">
          {#snippet children()}
            <MenuItem children={txt("Inner One")} />
            <MenuItem children={txt("Inner Two")} />
          {/snippet}
        </MenuList>
      {/snippet}
    </MenuSub>
    <MenuItem children={txt("Zulu")} />
  {/snippet}
</MenuList>
