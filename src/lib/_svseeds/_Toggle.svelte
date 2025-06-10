<!--
  @component
  default value: `(value)`
  ```ts
  interface ToggleProps {
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    type?: "button" | "switch"; // ("button")
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
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    type?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ToggleReqdProps = never;
  export type ToggleBindProps = "value" | "variant" | "element";

  type ToggleTarget = { currentTarget: EventTarget & HTMLButtonElement };
  const preset = "svs-toggle";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { children, left, right, value = $bindable(false), type = "button", ariaLabel, attributes, action, element = $bindable(), styling, variant = $bindable("") }: ToggleProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "type", "role", "aria-checked", "aria-pressed", "onclick");
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

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
    {@render button(type)}
    {@render side(PARTS.RIGHT, right)}
  </span>
{:else}
  {@render button(type)}
{/if}

{#snippet side(area: string, body?: Snippet<[boolean, string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet contents()}
  {#if children}
    {@render children(value, variant, element)}
  {/if}
{/snippet}
{#snippet button(role: string)}
  {@const c = cls(PARTS.MAIN, variant)}
  {#if role === "button"}
    {#if action}
      <button bind:this={element} class={c} type="button" aria-pressed={value} aria-label={ariaLabel} {onclick} {...attrs} use:action>
        {@render contents()}
      </button>
    {:else}
      <button bind:this={element} class={c} type="button" aria-pressed={value} aria-label={ariaLabel} {onclick} {...attrs}>
        {@render contents()}
      </button>
    {/if}
  {:else}
    {@const style = "position: relative;"}
    {#if action}
      <button bind:this={element} class={c} {style} type="button" {role} aria-checked={value} aria-label={ariaLabel} {onclick} {...attrs} use:action>
        {@render thumb()}
      </button>
    {:else}
      <button bind:this={element} class={c} {style} type="button" {role} aria-checked={value} aria-label={ariaLabel} {onclick} {...attrs}>
        {@render thumb()}
      </button>
    {/if}
  {/if}
{/snippet}
{#snippet thumb()}
  <span class={cls(PARTS.AUX, variant)} style="position: absolute;">
    {@render contents()}
  </span>
{/snippet}
