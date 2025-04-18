<script module lang="ts">
  export type ModalProps = {
    children: Snippet,
    label?: string, // for aria-label
    open?: boolean, // bindable <false>
    closable?: boolean, // <true>
    trigger?: HTMLElement, // bindable
    status?: string, // bindable <STATE.DEFAULT>
    style?: ClassRuleSet | string,
    element?: HTMLDialogElement, // bindable
  };
  export type ModalReqdProps = "children";
  export type ModalBindProps = "open" | "status" | "element";

  const svs = "svs-modal";
  const preset: ClassRuleSet = {};

  import { type Snippet, untrack } from "svelte";
  import { type ClassRuleSet, STATE, AREA, fnClass } from "./core";
</script>

<script lang="ts">
  let { children, label, open = $bindable(false), closable = true, trigger = $bindable(), status = $bindable(""), style, element = $bindable() }: ModalProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(svs, preset, style);

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
</script>

<!---------------------------------------->

<!-- svelte-ignore a11y_autofocus -->
<dialog bind:this={element} class={cls(AREA.WHOLE, status)} aria-label={label} {onclick} {onkeydown} {onclose} autofocus={true}>
  <div class={cls(AREA.MAIN, status)}>
    {@render children()}
  </div>
</dialog>

<style>
  :global(html:has(dialog[open])) {
    overflow: hidden;
  }
</style>
