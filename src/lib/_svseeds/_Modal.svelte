<!--
  @component
  default value: `(value)`
  ```ts
  interface ModalProps {
    children: Snippet;
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    trigger?: HTMLElement; // bindable
    ariaLabel?: string;
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    element?: HTMLDialogElement; // bindable
  }
  ```
-->
<script module lang="ts">
  export interface ModalProps {
    children: Snippet;
    open?: boolean; // bindable (false)
    closable?: boolean; // (true)
    trigger?: HTMLElement; // bindable
    ariaLabel?: string;
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    element?: HTMLDialogElement; // bindable
  }
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "status" | "element";

  const preset = "svs-modal";

  import { type Snippet, untrack } from "svelte";
  import { type SVSStyle, STATE, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), closable = true, trigger = $bindable(), ariaLabel, status = $bindable(""), style, element = $bindable() }: ModalProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);

  // *** Bind Handlers *** //
  $effect(() => {
    open;
    untrack(() => trigger?.focus());
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
<dialog bind:this={element} class={cls(PARTS.WHOLE, status)} aria-label={ariaLabel} {onclick} {onkeydown} {onclose} autofocus={true}>
  <div class={cls(PARTS.MAIN, status)}>
    {@render children()}
  </div>
</dialog>

<style>
  :global(html:has(dialog[open])) {
    overflow: hidden;
  }
</style>
