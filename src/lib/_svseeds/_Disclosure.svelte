<script module lang="ts">
  export type DisclosureProps = {
    label: string | Snippet<[string]>, // Snippet<[status]>
    children: Snippet,
    open?: boolean, // bindable <false>
    duration?: number, // <400>
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLDetailsAttributes;
    action?: Action,
    element?: HTMLDetailsElement, // bindable
  };
  export type DisclosureReqdProps = "label" | "children";
  export type DisclosureBindProps = "open" | "status" | "elementent";

  type DisclosureTarget = { currentTarget: EventTarget & HTMLDetailsElement };
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
  import { type SVSStyle, STATE, AREA, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { label, children, open = $bindable(false), duration = 400, status = $bindable(""), style, attributes, action, element = $bindable() }: DisclosureProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const attrs = omit(attributes, "class", "open", "ontoggle");
  const guard = new ToggleGurad();
  let hidden = $state(!open);
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  const initOpen = () => { if (element) element.open = open };
  $effect(() => untrack(() => initOpen()));

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
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
    status = bool ? STATE.ACTIVE : neutral;
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
</script>

<!---------------------------------------->

{#if action}
  <details bind:this={element} class={cls(AREA.WHOLE, status)} {ontoggle} {...attrs} use:action>
    {@render inner()}
  </details>
{:else}
  <details bind:this={element} class={cls(AREA.WHOLE, status)} {ontoggle} {...attrs}>
    {@render inner()}
  </details>
{/if}

{#snippet inner()}
  <summary class={cls(AREA.LABEL, status)} {onclick}>
    {#if typeof label === "string"}
      {label}
    {:else if typeof label === "function"}
      {@render label(status)}
    {/if}
  </summary>
  {#if open}
    <div class={cls(AREA.MAIN, status)} transition:slide={{ duration }}>
      {@render children()}
    </div>
  {/if}
  {#if hidden}
    <div class={cls(AREA.MAIN, status)}>
      {@render children()}
    </div>
  {/if}
{/snippet}
