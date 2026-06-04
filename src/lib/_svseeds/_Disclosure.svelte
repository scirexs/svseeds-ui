<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DisclosureProps extends Omit<HTMLDetailsAttributes, "children"> {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (200)
    attach?: Attachment;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLDetailsAttributes are passed to <details> via ...rest; `class` is merged onto root
  }
  ```
  ### Anatomy
  ```svelte
  <details class={["whole", class]} {...rest} bind:this={element} {@attach attach}>
    <summary class="label">
      {label}
    </summary>
    <div class="main" transition:slide={{ duration }}>
      {children}
    </div>
  </details>
  ```
-->
<script module lang="ts">
  export interface DisclosureProps extends Omit<HTMLDetailsAttributes, "children"> {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (200)
    attach?: Attachment;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type DisclosureReqdProps = "label" | "children";
  export type DisclosureBindProps = "open" | "variant" | "element";

  const DEFAULT_DURATION = 200;
  const noMotion = shouldReduceMotion();
  const preset = "svs-disclosure";

  class ToggleGurad {
    #active = false;
    get active(): boolean {
      return this.#active;
    }
    activate(duration: number) {
      this.#active = true;
      setTimeout(() => (this.#active = false), duration);
    }
  }

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLDetailsAttributes, type MouseEventHandler, type ToggleEventHandler } from "svelte/elements";
  import { slide } from "svelte/transition";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, children, open = $bindable(false), duration = -1, ontoggle, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, onclick, ...rest }: DisclosureProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);
  const guard = new ToggleGurad();
  let hidden = $state(!open);
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  $effect.pre(() => {
    open;
    untrack(() => toggleOpen());
  });
  function toggleOpen() {
    guard.activate(duration);
    if (open) {
      toggle(true);
    } else {
      setTimeout(() => toggle(false), duration);
    }
  }
  function toggle(bool: boolean) {
    if (!element) return;
    element.open = bool;
    hidden = !element.open;
    variant = bool ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  function hclick(ev: Parameters<MouseEventHandler<HTMLElement>>[0]) {
    onclick?.(ev as Parameters<MouseEventHandler<HTMLDetailsElement>>[0]);
    ev.preventDefault();
    if (guard.active) return;
    if (!element?.open) hidden = false;
    open = !open;
  }
  function htoggle(ev: Parameters<ToggleEventHandler<HTMLDetailsElement>>[0]) {
    ontoggle?.(ev);
    if (element?.open && !open) {
      hidden = false;
      open = true;
    }
  }
  $effect(() => untrack(() => toggle(open)));
</script>

<!---------------------------------------->

<details bind:this={element} class={[cls(PARTS.WHOLE, variant), c]} {...rest} ontoggle={htoggle} {@attach attach}>
  {@render inner()}
</details>

{#snippet inner()}
  <summary class={cls(PARTS.LABEL, variant)} onclick={hclick}>
    {#if typeof label === "string"}
      {label}
    {:else if typeof label === "function"}
      {@render label(open, variant)}
    {/if}
  </summary>
  {#if open}
    <div class={cls(PARTS.MAIN, variant)} transition:slide={{ duration: dur }}>
      {@render children(variant)}
    </div>
  {/if}
  {#if hidden}
    <div class={cls(PARTS.MAIN, variant)}>
      {@render children(variant)}
    </div>
  {/if}
{/snippet}
