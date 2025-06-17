<!--
  @component
  default value: `(value)`
  ```ts
  interface ToggleProps {
    children: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
-->
<script module lang="ts">
  export interface ToggleProps {
    children: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ToggleReqdProps = "children";
  export type ToggleBindProps = "value" | "variant" | "element";

  type ToggleTarget = { currentTarget: EventTarget & HTMLButtonElement };
  const preset = "svs-toggle";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { children, left, right, value = $bindable(false), role = "button", ariaLabel, attributes, action, element = $bindable(), styling, variant = $bindable("") }: ToggleProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "type", "role", "aria-checked", "aria-pressed", "onclick");
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  let state = $derived(role === "button" ? { "aria-pressed": value } : { "aria-checked": value });

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  $effect.pre(() => { value;
    untrack(() => toggle());
  });
  function toggle() {
    variant = value ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  function onclick(ev: MouseEvent & ToggleTarget) {
    value = !value;
    attributes?.["onclick"]?.(ev);
  }
</script>

<!---------------------------------------->

{#if left || right}
  <span class={cls(PARTS.WHOLE, variant)} role="group">
    {@render side(PARTS.LEFT, left)}
    {@render button()}
    {@render side(PARTS.RIGHT, right)}
  </span>
{:else}
  {@render button()}
{/if}

{#snippet side(area: string, body?: Snippet<[boolean, string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet button()}
  {@const r = role === "button" ? undefined : role}
  {@const c = cls(PARTS.MAIN, variant)}
  {#if action}
    <button bind:this={element} class={c} type="button" role={r} aria-label={ariaLabel} {onclick} {...state} {...attrs} use:action>
      {@render children(value, variant, element)}
    </button>
  {:else}
    <button bind:this={element} class={c} type="button" role={r} aria-label={ariaLabel} {onclick} {...state} {...attrs}>
      {@render children(value, variant, element)}
    </button>
  {/if}
{/snippet}
