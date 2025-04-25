<script module lang="ts">
  export type ButtonProps = {
    children: Snippet,
    left?: Snippet<[string, HTMLButtonElement | undefined]>, // Snippet<[status,element]>
    right?: Snippet<[string, HTMLButtonElement | undefined]>, // Snippet<[status,element]>
    type?: "submit" | "reset" | "button", // <"button">
    onclick?: MouseEventHandler<HTMLButtonElement> | null,
    form?: HTMLFormElement, // bindable
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLButtonAttributes,
    action?: Action,
    element?: HTMLButtonElement, // bindable
  };
  export type ButtonReqdProps = "children";
  export type ButtonBindProps = "form" | "status" | "element";

  const preset = "svs-button";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes, type MouseEventHandler } from "svelte/elements";
  import { type SVSStyle, STATE, AREA, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { children, left, right, type = "button", onclick, form = $bindable(), status = $bindable(STATE.DEFAULT), style, attributes, action, element = $bindable()}: ButtonProps = $props();

  // *** Initialize *** //
  const cls = fnClass(preset, style);
  const click = onclick ?? attributes?.["onclick"];
  const attrs = omit(attributes, "class", "type", "onclick");

  // *** Event Handlers *** //
  onclick = (ev) => {
    if (form?.checkValidity() ?? true) click?.(ev);
  };
</script>

<!---------------------------------------->

{#if action}
  <button bind:this={element} class={cls(AREA.WHOLE, status)} {type} {onclick} {...attrs} use:action>
    {@render whole()}
  </button>
{:else}
  <button bind:this={element} class={cls(AREA.WHOLE, status)} {type} {onclick} {...attrs}>
    {@render whole()}
  </button>
{/if}

{#snippet side(area: string, body?: Snippet<[string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, element)}</span>
  {/if}
{/snippet}
{#snippet whole()}
  {@render side(AREA.LEFT, left)}
  <span class={cls(AREA.MAIN, status)}>
    {@render children()}
  </span>
  {@render side(AREA.RIGHT, right)}
{/snippet}
