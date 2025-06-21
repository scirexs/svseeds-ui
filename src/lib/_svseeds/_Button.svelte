<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ButtonProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    left?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    right?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    type?: "submit" | "reset" | "button"; // ("button")
    onclick?: MouseEventHandler<HTMLButtonElement> | null;
    form?: HTMLFormElement; // bindable
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <button class="whole" {type} {onclick} {...attributes} bind:this={element} use:action>
    <span class="left" conditional>{left}</span>
    <span class="main">{children}</span>
    <span class="right" conditional>{right}</span>
  </button>
  ```
-->
<script module lang="ts">
  export interface ButtonProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    left?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    right?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    type?: "submit" | "reset" | "button"; // ("button")
    onclick?: MouseEventHandler<HTMLButtonElement> | null;
    form?: HTMLFormElement; // bindable
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ButtonReqdProps = "children";
  export type ButtonBindProps = "form" | "variant" | "element";

  const preset = "svs-button";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes, type MouseEventHandler } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { children, left, right, type = "button", onclick, form = $bindable(), attributes, action, element = $bindable(), styling, variant = $bindable("") }: ButtonProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const click = onclick ?? attributes?.["onclick"];
  const attrs = omit(attributes, "class", "type", "onclick");

  // *** Event Handlers *** //
  onclick = (ev) => {
    if (form?.checkValidity() ?? true) click?.(ev);
  };
</script>

<!---------------------------------------->

{#if action}
  <button bind:this={element} class={cls(PARTS.WHOLE, variant)} {type} {onclick} {...attrs} use:action>
    {@render whole()}
  </button>
{:else}
  <button bind:this={element} class={cls(PARTS.WHOLE, variant)} {type} {onclick} {...attrs}>
    {@render whole()}
  </button>
{/if}

{#snippet side(area: string, body?: Snippet<[string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(variant, element)}</span>
  {/if}
{/snippet}
{#snippet whole()}
  {@render side(PARTS.LEFT, left)}
  <span class={cls(PARTS.MAIN, variant)}>
    {@render children(variant)}
  </span>
  {@render side(PARTS.RIGHT, right)}
{/snippet}
