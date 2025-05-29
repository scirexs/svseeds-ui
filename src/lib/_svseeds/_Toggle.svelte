<!--
  @component
  default value: `<value>`
  ```ts
  interface ToggleProps {
    main?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    left?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    value?: boolean; // bindable <false>
    type?: "button" | "switch"; // <"button">
    ariaLabel?: string;
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
  }
  ```
-->
<script module lang="ts">
  export interface ToggleProps {
    main?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    left?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, boolean, HTMLButtonElement | undefined]>; // Snippet<[status,value,element]>
    value?: boolean; // bindable <false>
    type?: "button" | "switch"; // <"button">
    ariaLabel?: string;
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    attributes?: HTMLButtonAttributes;
    action?: Action;
    element?: HTMLButtonElement; // bindable
  }
  export type ToggleReqdProps = never;
  export type ToggleBindProps = "value" | "status" | "element";

  type ToggleTarget = { currentTarget: EventTarget & HTMLButtonElement };
  const preset = "svs-toggle";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, PARTS, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { main, left, right, value = $bindable(false), type = "button", ariaLabel, status = $bindable(""), style, attributes, action, element = $bindable() }: ToggleProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  const attrs = omit(attributes, "class", "type", "role", "aria-checked", "aria-pressed", "onclick");
  let neutral = isNeutral(status) ? status : STATE.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  $effect.pre(() => { value;
    untrack(() => toggle());
  });
  function toggle() {
    status = value ? STATE.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  function onclick(ev: MouseEvent & ToggleTarget) {
    value = !value;
    attributes?.["onclick"]?.(ev);
  }
</script>

<!---------------------------------------->

{#if left || right}
  <span class={cls(PARTS.WHOLE, status)} role="group">
    {@render side(PARTS.LEFT, left)}
    {@render button(type)}
    {@render side(PARTS.RIGHT, right)}
  </span>
{:else}
  {@render button(type)}
{/if}

{#snippet side(area: string, body?: Snippet<[string, boolean, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, value, element)}</span>
  {/if}
{/snippet}
{#snippet contents()}
  {#if main}
    {@render main(status, value, element)}
  {/if}
{/snippet}
{#snippet button(role: string)}
  {@const c = cls(PARTS.MAIN, status)}
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
  <span class={cls(PARTS.AUX, status)} style="position: absolute;">
    {@render contents()}
  </span>
{/snippet}
