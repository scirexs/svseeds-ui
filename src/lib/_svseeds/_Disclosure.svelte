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
    inactive?: string; // reason; when set: aria-disabled + aria-description, variant->INACTIVE, open/toggle suppressed
    attach?: Attachment;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLDetailsAttributes are passed to <details> via ...rest; `class` is merged onto root
  }
  ```
  ### Anatomy
  `main` renders through separate animated/static paths; slide uses sanitized `dur`.
  ```svelte
  <details class={["whole", class]} {...rest} bind:this={element} {@attach attach}>
    <summary class="label" aria-disabled aria-description>
      {label}
    </summary>
    {#if open}
      <div class="main" transition:slide={{ duration: dur }}>
        {children}
      </div>
    {/if}
    {#if hidden}
      <div class="main">
        {children}
      </div>
    {/if}
  </details>
  ```
-->
<script module lang="ts">
  export interface DisclosureProps extends Omit<HTMLDetailsAttributes, "children"> {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (200)
    inactive?: string; // reason; when set: aria-disabled + aria-description, variant->INACTIVE, open/toggle suppressed
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

  class ToggleGuard {
    #active = false;
    get active(): boolean {
      return this.#active;
    }
    activate(duration: number) {
      this.#active = true;
      setTimeout(() => (this.#active = false), duration);
    }
  }

  import { type Snippet, untrack, onMount } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLDetailsAttributes, type MouseEventHandler, type ToggleEventHandler } from "svelte/elements";
  import { slide } from "svelte/transition";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, children, open = $bindable(false), duration = -1, ontoggle, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), inactive, class: c, onclick, ...rest }: DisclosureProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);
  const reason = $derived(inactive?.trim() ? inactive : undefined);
  const inactiveAttrs = $derived(reason ? { "aria-disabled": true, "aria-description": reason } : {});
  const guard = new ToggleGuard();
  let hidden = $state(!open);
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  let mounted = false;
  let prevVariant = $state<SVSVariant>();

  // *** Bind Handlers *** //
  // External variant writes are styling-only; preserve the neutral fallback without changing open state.
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  $effect(() => {
    reason ? storeVariant() : restoreVariant();
  });
  $effect.pre(() => {
    open;
    reason;
    untrack(() => {
      if (!mounted) return;
      if (reason) return collapseInactive();
      restoreVariant();
      toggleOpen(open);
    });
  });
  function toggleOpen(isOpen: boolean) {
    guard.activate(dur);
    if (isOpen) {
      toggle(true);
    } else {
      const target = element;
      setTimeout(() => toggle(false, target), dur);
    }
  }
  function toggle(bool: boolean, target = element) {
    if (!target) return;
    target.open = bool;
    hidden = !target.open;
    variant = bool ? VARIANT.ACTIVE : neutral;
  }
  function storeVariant() {
    if (variant === VARIANT.INACTIVE && prevVariant !== undefined) return;
    prevVariant = variant === VARIANT.ACTIVE || variant === VARIANT.INACTIVE ? neutral : variant;
    variant = VARIANT.INACTIVE;
  }
  function restoreVariant() {
    if (prevVariant === undefined) return;
    variant = prevVariant;
    prevVariant = undefined;
  }
  function collapseInactive() {
    storeVariant();
    if (element?.open) element.open = false;
    if (open) open = false;
    if (!hidden) hidden = true;
  }

  // *** Event Handlers *** //
  const hclick: MouseEventHandler<HTMLElement> = (ev) => {
    if (reason) {
      ev.preventDefault();
      collapseInactive();
      return;
    }
    onclick?.(ev as Parameters<MouseEventHandler<HTMLDetailsElement>>[0]);
    ev.preventDefault();
    if (guard.active) return;
    if (!element?.open) hidden = false;
    open = !open;
  };
  const htoggle: ToggleEventHandler<HTMLDetailsElement> = (ev) => {
    ontoggle?.(ev);
    if (!element) return;
    if (reason) return collapseInactive();
    if (element.open && !open) {
      hidden = false;
      open = true;
    } else if (!element.open && open) {
      open = false;
    }
  };
  onMount(() => {
    reason ? collapseInactive() : toggle(open);
    mounted = true;
  });
</script>

<!---------------------------------------->

<details bind:this={element} class={[cls(PARTS.WHOLE, variant), c]} {...rest} ontoggle={htoggle} {@attach attach}>
  {@render inner()}
</details>

{#snippet inner()}
  <summary class={cls(PARTS.LABEL, variant)} onclick={hclick} {...inactiveAttrs}>
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
  <!-- Keep a static collapsed copy so children remain mounted like native details content. -->
  {#if hidden}
    <div class={cls(PARTS.MAIN, variant)}>
      {@render children(variant)}
    </div>
  {/if}
{/snippet}
