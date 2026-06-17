<script lang="ts">
  import Disclosure from "#svs/Disclosure.svelte";
  import { VARIANT } from "#svs/core";

  let inactive = $state<string | undefined>("locked");
  let variant = $state<string>(VARIANT.NEUTRAL);
</script>

<div data-testid="parent-variant">{variant}</div>
<button type="button" data-testid="set-custom" onclick={() => (variant = "custom-while-inactive")}>set custom</button>
<button type="button" data-testid="clear-inactive" onclick={() => (inactive = undefined)}>clear inactive</button>

{#snippet children(variant: string)}
  <div data-testid="test-children">Disclosure Content - {variant}</div>
{/snippet}

<Disclosure label="Disclosure Label" {children} bind:variant {inactive} duration={0} />
