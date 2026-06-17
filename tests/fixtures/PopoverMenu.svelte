<script lang="ts">
  import Popover from "#svs/Popover.svelte";
  import MenuList from "#svs/MenuList.svelte";
  import MenuItem from "#svs/MenuItem.svelte";
  import { createRawSnippet } from "svelte";

  let { open = $bindable(false), onselect, hover = false, styling, variant = "neutral" }: { open?: boolean; onselect?: (ev: MouseEvent) => void; hover?: boolean; styling?: any; variant?: string } = $props();
  const txt = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));
</script>

<Popover bind:open {hover} {styling} {variant} ariaRole="menu" label="Open">
  {#snippet children()}
    <MenuList>
      {#snippet children()}
        <MenuItem children={txt("Cut")} {onselect} />
        <MenuItem children={txt("Copy")} />
        <MenuItem children={txt("Paste")} {onselect} />
      {/snippet}
    </MenuList>
  {/snippet}
</Popover>
