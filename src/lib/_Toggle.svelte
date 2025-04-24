<script module lang="ts">
  export type ToggleProps = {
    label?: string, // for aria-label; should be used if no label tag or no text in main
    main?: Snippet<[string, boolean, HTMLButtonElement | undefined]>, // Snippet<[status,value,element]>
    left?: Snippet<[string, boolean, HTMLButtonElement | undefined]>, // Snippet<[status,value,element]>
    right?: Snippet<[string, boolean, HTMLButtonElement | undefined]>, // Snippet<[status,value,element]>
    value?: boolean, // bindable <true>
    type?: "button" | "switch", // <"button">
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLButtonAttributes;
    action?: Action,
    element?: HTMLButtonElement, // bindable
  };
  export type ToggleReqdProps = never;
  export type ToggleBindProps = "value" | "status" | "element";

  type ToggleTarget = { currentTarget: EventTarget & HTMLButtonElement };
  const preset = "svs-toggle";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, AREA, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { label, main, left, right, value = $bindable(false), type = "button", status = $bindable(""), style, attributes, action, element = $bindable() }: ToggleProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const attrs = omit(attributes, "class", "id", "type", "role", "aria-checked", "onclick");
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;

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
  <span class={cls(AREA.WHOLE, status)} role="group">
    {@render side(AREA.LEFT, left)}
    {@render button(type)}
    {@render side(AREA.RIGHT, right)}
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
  {@const c = cls(AREA.MAIN, status)}
  {#if role === "button"}
    {#if action}
      <button bind:this={element} class={c} type="button" aria-pressed={value} aria-label={label} {onclick} {...attrs} use:action>
        {@render contents()}
      </button>
    {:else}
      <button bind:this={element} class={c} type="button" aria-pressed={value} aria-label={label} {onclick} {...attrs}>
        {@render contents()}
      </button>
    {/if}
  {:else}
    {@const style = "position: relative;"}
    {#if action}
      <button bind:this={element} class={c} {style} type="button" {role} aria-checked={value} aria-label={label} {onclick} {...attrs} use:action>
        {@render thumb()}
      </button>
    {:else}
      <button bind:this={element} class={c} {style} type="button" {role} aria-checked={value} aria-label={label} {onclick} {...attrs}>
        {@render thumb()}
      </button>
    {/if}
  {/if}
{/snippet}
{#snippet thumb()}
  <span class={cls(AREA.AUX, status)} style="position: absolute;">
    {@render contents()}
  </span>
{/snippet}
