<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    delay?: number; // (200)
    id?: string;
    ariaLabel?: string;
    attributes?: HTMLDialogAttributes;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <dialog class="whole" {id} aria-label={ariaLabel} {...attributes} bind:this={element}>
    {children}
  </dialog>
  ```
-->
<script module lang="ts">
  export interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    delay?: number; // (200)
    id?: string;
    ariaLabel?: string;
    attributes?: HTMLDialogAttributes;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "variant" | "element";

  const DEFAULT_DELAY = 200;
  const preset = "svs-modal";

  function isPrefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  import { type Snippet, untrack } from "svelte";
  import { type HTMLDialogAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, isNeutral, isUnsignedInteger, omit } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), closable = true, delay = -1, id, ariaLabel, attributes, element = $bindable(), styling, variant = $bindable("") }: ModalProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  if (isPrefersReducedMotion()) delay = 0;
  if (!isUnsignedInteger(delay)) delay = DEFAULT_DELAY;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "id", "aria-label", "onclick", "onkeydown", "ontoggle");
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
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
      setTimeout(() => element?.close(), delay);
    }
  }

  // *** Event Handlers *** //
  function click(ev: MouseEvent) {
    attributes?.["onclick"]?.(ev as any);
    if (ev.target === element) open = false;
  }
  function keydown(ev: KeyboardEvent) {
    attributes?.["onkeydown"]?.(ev as any);
    if (ev.key === "Escape") ev.preventDefault();
  }
  const onclick = closable ? click : attributes?.["onclick"];
  const onkeydown = closable ? attributes?.["onkeydown"] : keydown;
  function ontoggle(ev: Event) {
    attributes?.["ontoggle"]?.(ev as any);
    open = element?.open ?? false;
  }
  $effect(() => untrack(() => { if (open) toggle(); }));
</script>

<!---------------------------------------->

<dialog bind:this={element} class={cls(PARTS.WHOLE, variant)} aria-label={ariaLabel} {id} {onclick} {onkeydown} {ontoggle} {...attrs} style="margin:auto;">
  {@render children(variant)}
</dialog>

<style>
  :root:has(dialog[open]) {
    overflow: clip;
  }
</style>
