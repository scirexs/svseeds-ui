<script module lang="ts">
  export type BadgeProps = {
    children: Snippet,
    left?: Snippet<[string]>, // Snippet<[status]>
    right?: Snippet<[string]>, // Snippet<[status]>
    type?: "plain" | "link" | "left" | "right", // <"plain">
    href?: string,
    onclick?: MouseEventHandler<HTMLButtonElement> | null,
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
  };
  export type BadgeReqdProps = "children";
  export type BadgeBindProps = "status";

  const preset = "svs-badge";

  import { type Snippet } from "svelte";
  import { type MouseEventHandler } from "svelte/elements";
  import { type SVSStyle, STATE, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { children, left, right, type = "plain", href = "", onclick, status = $bindable(""), style }: BadgeProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
</script>

<!---------------------------------------->

{#if type === "link"}
  <a class={cls(PARTS.WHOLE, status)} {href}>
    {@render whole()}
  </a>
{:else}
  <span class={cls(PARTS.WHOLE, status)}>
    {@render whole()}
  </span>
{/if}

{#snippet side(area: string, btn: boolean, body?: Snippet<[string]>)}
  {#if body}
    {#if btn}
      <button class={cls(area, status)} {onclick}>{@render body(status)}</button>
    {:else}
      <span class={cls(area, status)}>{@render body(status)}</span>
    {/if}
  {/if}
{/snippet}
{#snippet whole()}
  {@render side(PARTS.LEFT, type === "left", left)}
  <span class={cls(PARTS.MAIN, status)}>
    {@render children()}
  </span>
  {@render side(PARTS.RIGHT, type === "right", right)}
{/snippet}
