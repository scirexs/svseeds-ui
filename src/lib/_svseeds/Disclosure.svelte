<!--
  @component
  ### Usage
  Use standalone, or inside `Accordion`.
  ```svelte
  <Disclosure label="Section" {...props}>Content</Disclosure>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface DisclosureProps extends Omit<HTMLDetailsAttributes, "children" | "name"> {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (200)
    transition?: DisclosureTransition;
    inactive?: string | boolean; // reason string (aria-description) OR true for reason-less soft-disable
    attach?: Attachment<HTMLDetailsElement>;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLDetailsAttributes except `name` are passed to <details> via ...rest; `class` is merged onto root
  }
  type DisclosureTransition = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  ```
  ### Anatomy
  ```svelte
  <details class="whole" {...rest}>
    <summary class="label" aria-disabled aria-description>
      {label}
    </summary>
    <div class="main" transition:(default slide) conditional>
      {children}
    </div>
  </details>
  ```
  `main` is rendered only while open. `transition` overrides the open/close animation (default `slide`); `duration` feeds the default slide's params.
-->
<script module lang="ts">
  export interface DisclosureProps extends Omit<HTMLDetailsAttributes, "children" | "name"> {
    label: string | Snippet<[boolean, string]>; // Snippet<[open,variant]>
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    duration?: number; // (200)
    transition?: DisclosureTransition;
    inactive?: string | boolean; // reason string (aria-description) OR true for reason-less soft-disable
    attach?: Attachment<HTMLDetailsElement>;
    element?: HTMLDetailsElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type DisclosureReqdProps = "label" | "children";
  export type DisclosureBindProps = "open" | "variant" | "element";
  export type DisclosureTransition = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };

  export interface DisclosureContext extends SVSContext {
    get current(): string | undefined;
    set current(v: string | undefined);
  }

  export const [_getDisclosureContext, _setDisclosureContext] = _createContext<DisclosureContext>();

  export const _DISCLOSURE_PRESET = "svs-disclosure";

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

  import { untrack, onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { VARIANT, PARTS, _fnClass, _isNeutral, shouldReduceMotion, _resolveDuration, _createContext } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLDetailsAttributes, MouseEventHandler, ToggleEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, children, open = $bindable(false), duration = -1, transition, ontoggle, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), inactive, id, name, class: c, onclick, ...rest }: DisclosureProps & { name?: string } = $props();
  const ctx = _getDisclosureContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_DISCLOSURE_PRESET, styling ?? ctx?.styling));
  const reduced = $derived(shouldReduceMotion());
  const dur = $derived(_resolveDuration(duration));
  const tfn = $derived(reduced ? noop : (transition?.fn ?? slide));
  const tparams = $derived(transition?.params ?? { duration: dur });
  const isInactive = $derived(inactive === true || (typeof inactive === "string" && inactive.trim().length > 0));
  const reason = $derived(typeof inactive === "string" && inactive.trim() ? inactive : undefined);
  const inactiveAttrs = $derived(isInactive ? { "aria-disabled": true, ...(reason ? { "aria-description": reason } : {}) } : {});
  const guard = new ToggleGuard();
  let neutral = $state(_isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  const base = $derived(ctx ? ctx.variant : neutral);
  const effOpen = $derived(ctx ? id != null && ctx.current === id : open);
  let hidden = $state(!initialOpen());
  let mounted = false;
  let prevVariant = $state<SVSVariant>();

  function initialOpen() {
    return ctx ? id != null && ctx.current === id : open;
  }
  function setOpen(v: boolean) {
    if (ctx) ctx.current = v && id != null ? id : undefined;
    else open = v;
  }
  function noop() {
    return {};
  }

  // *** Reactive Handlers *** //
  const neutralInput = $derived(ctx ? ctx.variant : variant);
  const desiredBaseVariant = $derived(ctx && !effOpen && !isInactive && prevVariant === undefined ? base : undefined);
  const shouldStoreInactive = $derived(isInactive && _isNeutral(variant));

  // External variant writes are styling-only; preserve the neutral fallback without changing open state.
  $effect(() => {
    neutralInput;
    untrack(() => syncNeutral());
  });
  $effect(() => {
    desiredBaseVariant;
    shouldStoreInactive;
    untrack(() => syncVariant());
  });
  $effect.pre(() => {
    effOpen;
    isInactive;
    untrack(() => (mounted ? syncOpen() : undefined));
  });
  function syncOpen() {
    if (isInactive) return collapseInactive();
    restoreVariant();
    toggleOpen(effOpen);
  }
  function syncNeutral() {
    neutral = _isNeutral(neutralInput) ? neutralInput : neutral;
  }
  function syncVariant() {
    if (shouldStoreInactive) storeVariant();
    else if (desiredBaseVariant !== undefined) variant = desiredBaseVariant;
  }
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
    variant = bool ? VARIANT.ACTIVE : base;
  }
  function storeVariant(collapse?: boolean) {
    if (collapse && variant === VARIANT.INACTIVE && prevVariant !== undefined) return;
    prevVariant = _isNeutral(variant) ? variant : base;
    variant = VARIANT.INACTIVE;
  }
  function restoreVariant() {
    if (prevVariant === undefined) return;
    variant = prevVariant;
    prevVariant = undefined;
  }
  function collapseInactive() {
    storeVariant(true);
    if (element?.open) element.open = false;
    if (effOpen) setOpen(false);
    if (!hidden) hidden = true;
  }

  // *** Event Handlers *** //
  const hclick: MouseEventHandler<HTMLElement> = (ev) => {
    if (isInactive) {
      ev.preventDefault();
      collapseInactive();
      return;
    }
    onclick?.(ev as Parameters<MouseEventHandler<HTMLDetailsElement>>[0]);
    ev.preventDefault();
    if (guard.active) return;
    if (!element?.open) hidden = false;
    setOpen(!effOpen);
  };
  const htoggle: ToggleEventHandler<HTMLDetailsElement> = (ev) => {
    ontoggle?.(ev);
    if (!element) return;
    if (isInactive) return collapseInactive();
    if (element.open && !effOpen) {
      hidden = false;
      setOpen(true);
    } else if (!element.open && effOpen) {
      setOpen(false);
    }
  };
  onMount(() => {
    isInactive ? collapseInactive() : toggle(effOpen);
    mounted = true;
  });
</script>

<!---------------------------------------->

<details bind:this={element} class={[cls(PARTS.WHOLE, variant), c]} {...rest} {id} ontoggle={htoggle} {@attach attach}>
  {@render inner()}
</details>

{#snippet inner()}
  <summary class={cls(PARTS.LABEL, variant)} onclick={hclick} {...inactiveAttrs}>
    {#if typeof label === "string"}
      {label}
    {:else if typeof label === "function"}
      {@render label(effOpen, variant)}
    {/if}
  </summary>
  {#if effOpen}
    <div class={cls(PARTS.MAIN, variant)} transition:tfn|local={tparams}>
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
