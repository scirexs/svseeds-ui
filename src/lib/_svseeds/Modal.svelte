<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <Modal {...props}>Content</Modal>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ModalProps extends Omit<HTMLDialogAttributes, "children" | "style" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    duration?: number; // (200)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLDialogAttributes are passed to <dialog> via ...rest; `class` is merged onto root
    // style is component-owned (omitted)
  }
  ```
  ### Anatomy
  ```svelte
  <dialog class="whole" {...rest} aria-label>
    {children}
  </dialog>
  ```
-->
<script module lang="ts">
  export interface ModalProps extends Omit<HTMLDialogAttributes, "children" | "style" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    duration?: number; // (200)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "element";

  const DEFAULT_DURATION = 200;
  const noMotion = shouldReduceMotion();
  export const _MODAL_PRESET = "svs-modal";

  import { untrack, onMount } from "svelte";
  import { VARIANT, PARTS, fnClass, isUnsignedInteger, shouldReduceMotion } from "./core";
  import type { Snippet } from "svelte";
  import type { HTMLDialogAttributes, MouseEventHandler, KeyboardEventHandler, ToggleEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), closable = true, duration = -1, ariaLabel, onclick, onkeydown, ontoggle, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ModalProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_MODAL_PRESET, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });
  function toggle() {
    if (open) element?.showModal();
    else element?.close();
  }

  // *** Event Handlers *** //
  const click: MouseEventHandler<HTMLDialogElement> = (ev) => {
    onclick?.(ev);
    if (ev.target === element) open = false;
  };
  const keydown: KeyboardEventHandler<HTMLDialogElement> = (ev) => {
    onkeydown?.(ev);
    if (ev.key === "Escape") ev.preventDefault();
  };
  const hclick = $derived(closable ? click : onclick);
  const hkeydown = $derived(closable ? onkeydown : keydown);
  const htoggle: ToggleEventHandler<HTMLDialogElement> = (ev) => {
    ontoggle?.(ev);
    open = element?.open ?? false;
  };
  onMount(() => {
    if (open) toggle();
  });
</script>

<!---------------------------------------->

<dialog
  bind:this={element}
  class={[cls(PARTS.WHOLE, variant), c]}
  aria-label={ariaLabel}
  {...rest}
  style={`--duration:${dur}ms;`}
  onclick={hclick}
  onkeydown={hkeydown}
  ontoggle={htoggle}
>
  {@render children(variant)}
</dialog>

<style>
  :root:has(dialog[open]) {
    overflow: clip;
  }
  dialog {
    margin: auto;
  }
</style>
