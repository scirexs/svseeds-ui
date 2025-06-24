<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
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
    <div class="main">
      {children}
    </div>
  </dialog>
  ```
-->
<script module lang="ts">
  export interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    id?: string;
    ariaLabel?: string;
    attributes?: HTMLDialogAttributes;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "variant" | "element";

  const duration = 200;
  const preset = "svs-modal";

  import { type Snippet, untrack } from "svelte";
  import { type HTMLDialogAttributes } from "svelte/elements";
  import { fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { type SVSClass, VARIANT, PARTS, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), closable = true, id, ariaLabel, attributes, element = $bindable(), styling, variant = $bindable("") }: ModalProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "id", "aria-label", "onclick", "onkeydown", "ontoggle");

  // *** Bind Handlers *** //
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });
  function toggle() {
    if (open) {
      element?.showModal();
    } else {
      element?.close();
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
  $effect(() => untrack(() => { if (open) element?.showModal(); }));
</script>

<!---------------------------------------->

<dialog bind:this={element} class={cls(PARTS.WHOLE, variant)} aria-label={ariaLabel} {id} {onclick} {onkeydown} {ontoggle} {...attrs} style="margin:auto;background-color:transparent;">
  {#if open}
    <div class={cls(PARTS.MAIN, variant)} transition:fade={{ duration, easing: cubicOut }}>
      {@render children(variant)}
    </div>
  {/if}
</dialog>

<style>
  :global {
    :root:has(dialog[open]) {
      overflow: hidden;
    }
  }
</style>
