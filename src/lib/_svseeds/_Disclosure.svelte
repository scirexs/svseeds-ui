<!--
  @component
  default value: `(value)`
  ```ts
  interface DisclosureProps {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (400)
    attributes?: HTMLDetailsAttributes;
    action?: Action;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
-->
<script module lang="ts">
  export interface DisclosureProps {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (400)
    attributes?: HTMLDetailsAttributes;
    action?: Action;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type DisclosureReqdProps = "label" | "children";
  export type DisclosureBindProps = "open" | "variant" | "element";

  type DisclosureTarget = { currentTarget: EventTarget & HTMLDetailsElement };
  const DEFAULT_DURATION = 400;
  const preset = "svs-disclosure";

  const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
  class ToggleGurad {
    #active = false;
    get active(): boolean {
      return this.#active;
    }
    activate(duration: number) {
      this.#active = true;
      sleep(duration).then(() => this.#active = false);
    }
  }

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLDetailsAttributes } from "svelte/elements";
  import { slide } from "svelte/transition";
  import { type SVSClass, VARIANT, PARTS, fnClass, isNeutral, isUnsignedInteger, omit } from "./core";
</script>

<script lang="ts">
  let { label, children, open = $bindable(false), duration = -1, attributes, action, element = $bindable(), styling, variant = $bindable("") }: DisclosureProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  if (!isUnsignedInteger(duration)) duration = DEFAULT_DURATION;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "open", "ontoggle");
  const guard = new ToggleGurad();
  let hidden = $state(!open);
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  $effect.pre(() => {
    open;
    untrack(() => toggleOpen());
  });
  function toggleOpen() {
    guard.activate(duration);
    if (open) {
      toggle(true);
    } else {
      sleep(duration).then(() => toggle(false));
    }
  }
  function toggle(bool: boolean) {
    if (!element) return;
    element.open = bool;
    hidden = !element.open;
    variant = bool ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  function onclick(ev: Event) {
    ev.preventDefault();
    if (guard.active) return;
    if (!element?.open) hidden = false;
    open = !open;
  }
  function ontoggle(ev: Event & DisclosureTarget) {
    attributes?.ontoggle?.(ev);
    if (element?.open && !open) {
      hidden = false;
      open = true;
    }
  }
  $effect(() => untrack(() => toggle(open)));
</script>

<!---------------------------------------->

{#if action}
  <details bind:this={element} class={cls(PARTS.WHOLE, variant)} {ontoggle} {...attrs} use:action>
    {@render inner()}
  </details>
{:else}
  <details bind:this={element} class={cls(PARTS.WHOLE, variant)} {ontoggle} {...attrs}>
    {@render inner()}
  </details>
{/if}

{#snippet inner()}
  <summary class={cls(PARTS.LABEL, variant)} {onclick}>
    {#if typeof label === "string"}
      {label}
    {:else if typeof label === "function"}
      {@render label(open, variant)}
    {/if}
  </summary>
  {#if open}
    <div class={cls(PARTS.MAIN, variant)} transition:slide={{ duration }}>
      {@render children(variant)}
    </div>
  {/if}
  {#if hidden}
    <div class={cls(PARTS.MAIN, variant)}>
      {@render children(variant)}
    </div>
  {/if}
{/snippet}
