<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ModalProps extends Omit<HTMLDialogAttributes, "children" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    delay?: number; // (200)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLDialogAttributes are passed to <dialog> via ...rest; `class` is merged onto root
  }
  ```
  ### Anatomy
  ```svelte
  <dialog class={["whole", class]} aria-label={ariaLabel} {...rest} bind:this={element}>
    {children}
  </dialog>
  ```
-->
<script module lang="ts">
  export interface ModalProps extends Omit<HTMLDialogAttributes, "children" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    delay?: number; // (200)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "variant" | "element";

  const DEFAULT_DELAY = 200;
  const noMotion = shouldReduceMotion();
  const preset = "svs-modal";

  import { type Snippet, untrack } from "svelte";
  import { type HTMLDialogAttributes, type MouseEventHandler, type KeyboardEventHandler, type ToggleEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), closable = true, delay = -1, ariaLabel, onclick, onkeydown, ontoggle, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: ModalProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const lag = $derived(noMotion ? 0 : !isUnsignedInteger(delay) ? DEFAULT_DELAY : delay);
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });
  function toggle() {
    if (open) {
      element?.showModal();
      variant = neutral;
    } else {
      variant = VARIANT.INACTIVE;
      setTimeout(() => element?.close(), lag);
    }
  }

  // *** Event Handlers *** //
  function click(ev: Parameters<MouseEventHandler<HTMLDialogElement>>[0]) {
    onclick?.(ev);
    if (ev.target === element) open = false;
  }
  function keydown(ev: Parameters<KeyboardEventHandler<HTMLDialogElement>>[0]) {
    onkeydown?.(ev);
    if (ev.key === "Escape") ev.preventDefault();
  }
  const hclick = $derived(closable ? click : onclick);
  const hkeydown = $derived(closable ? onkeydown : keydown);
  function htoggle(ev: Parameters<ToggleEventHandler<HTMLDialogElement>>[0]) {
    ontoggle?.(ev);
    open = element?.open ?? false;
  }
  $effect(() =>
    untrack(() => {
      if (open) toggle();
    }),
  );
</script>

<!---------------------------------------->

<dialog
  bind:this={element}
  class={[cls(PARTS.WHOLE, variant), c]}
  aria-label={ariaLabel}
  {...rest}
  onclick={hclick}
  onkeydown={hkeydown}
  ontoggle={htoggle}
  style="margin:auto;"
>
  {@render children(variant)}
</dialog>

<style>
  :root:has(dialog[open]) {
    overflow: clip;
  }
</style>
