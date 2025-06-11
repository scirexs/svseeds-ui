<!--
  @component
  default value: `(value)`
  ```ts
  interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    trigger?: HTMLElement; // bindable
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
-->
<script module lang="ts">
  export interface ModalProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    trigger?: HTMLElement; // bindable
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "variant" | "element";

  const preset = "svs-modal";

  import { type Snippet, untrack } from "svelte";
  import { type SVSClass, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), closable = true, trigger = $bindable(), ariaLabel, element = $bindable(), styling, variant = $bindable("") }: ModalProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);

  // *** Bind Handlers *** //
  $effect(() => {
    open;
    untrack(() => {
      if (!open) trigger?.focus();
    });
  });
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
  const onclick = closable ? (ev: MouseEvent) => { if (ev.target === element) open = false; } : undefined;
  const onkeydown = closable ? (ev: KeyboardEvent) => { if (ev.key === "Escape") ev.preventDefault(); } : undefined;
  function onclose() {
    open = false;
  }
  $effect(() => untrack(() => { if (open) element?.showModal(); }));
</script>

<!---------------------------------------->

<!-- svelte-ignore a11y_autofocus -->
<dialog bind:this={element} class={cls(PARTS.WHOLE, variant)} aria-label={ariaLabel} {onclick} {onkeydown} {onclose} autofocus={true}>
  <div class={cls(PARTS.MAIN, variant)}>
    {@render children(variant)}
  </div>
</dialog>

<style>
  :global(html:has(dialog[open])) {
    overflow: hidden;
  }
</style>
