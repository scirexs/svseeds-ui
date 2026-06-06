<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DrawerProps extends Omit<HTMLDialogAttributes, "children" | "style" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLDialogAttributes are passed to <dialog> via ...rest; `class` is merged onto root
    // style is component-owned (omitted)
  }
  type Position = "top" | "right" | "bottom" | "left";
  ```
  Drawer is modal: focus is trapped and background siblings are inert while open by native dialog behavior.
  `closable=false` creates a forced-action modal (no light-dismiss/Escape).
  ### Anatomy
  ```svelte
  <dialog class={["whole", class]} {...rest} {style} bind:this={element}>
    {children}
  </dialog>
  ```
-->
<script module lang="ts">
  export interface DrawerProps extends Omit<HTMLDialogAttributes, "children" | "style" | "aria-label"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    ariaLabel?: string;
    element?: HTMLDialogElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type Position = "top" | "right" | "bottom" | "left";
  export type DrawerReqdProps = "children";
  export type DrawerBindProps = "open" | "element";

  const DEFAULT_DURATION = 200;
  const noMotion = shouldReduceMotion();
  const preset = "svs-drawer";

  function getPositionProp(position: Position): string {
    switch (position) {
      case "top":
      case "left":
        return "--top:0;--left:0;--bottom:auto;--right:auto;";
      case "bottom":
        return "--top:auto;--left:0;--bottom:0;--right:auto;";
      case "right":
        return "--top:0;--left:auto;--bottom:auto;--right:0;";
    }
  }
  function getSizeProp(position: Position, size: string): string {
    const interpolate = ["auto", "min-content", "max-content", "fit-content"].includes(size) ? "interpolate-size:allow-keywords;" : "";
    return ["top", "bottom"].includes(position)
      ? `--width-from:100%;--width-to:100%;--height-from:0;--height-to:${size};${interpolate}`
      : `--width-from:0;--width-to:${size};--height-from:100%;--height-to:100%;${interpolate}`;
  }

  import { type Snippet, untrack, onMount } from "svelte";
  import { type HTMLDialogAttributes, type MouseEventHandler, type KeyboardEventHandler, type ToggleEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), position = "left", size = "auto", duration = -1, closable = true, ariaLabel, onclick, onkeydown, ontoggle, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: DrawerProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);
  const baseStyle = $derived(`${getPositionProp(position)}${getSizeProp(position, size)}--duration:${dur}ms;`);
  let style = $derived(baseStyle);
  let ofTimer: ReturnType<typeof setTimeout> | undefined;

  // *** Bind Handlers *** //
  function toggle() {
    if (open) {
      if (!element?.open) element?.showModal();
    } else {
      element?.close();
    }
  }
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });

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
    style = baseStyle + "overflow:hidden;";
    clearTimeout(ofTimer);
    ofTimer = setTimeout(() => (style = baseStyle), dur);
  };
  onMount(() => {
    if (open) toggle();
    return () => clearTimeout(ofTimer);
  });
</script>

<!---------------------------------------->

<dialog
  bind:this={element}
  class={[cls(PARTS.WHOLE, variant), c]}
  aria-label={ariaLabel}
  {...rest}
  {style}
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
    margin: 0;
    padding: 0;
    border: 0;
    max-width: none;
    max-height: none;
    position: fixed;
    top: var(--top);
    left: var(--left);
    bottom: var(--bottom);
    right: var(--right);
    width: var(--width-from);
    height: var(--height-from);
    transition-property: display, overlay, width, height;
    transition-behavior: allow-discrete;
    transition-duration: var(--duration);
  }
  dialog[open] {
    width: var(--width-to);
    height: var(--height-to);
    @starting-style {
      width: var(--width-from);
      height: var(--height-from);
    }
  }
</style>
