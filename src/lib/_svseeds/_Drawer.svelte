<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DrawerProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    id?: string;
    attributes?: HTMLAttributes<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  type Position = "top" | "right" | "bottom" | "left";
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {id} {...attributes} bind:this={element}>
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface DrawerProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    id?: string;
    attributes?: HTMLAttributes<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type Position = "top" | "right" | "bottom" | "left";
  export type DrawerReqdProps = "children";
  export type DrawerBindProps = "open" | "variant" | "element";

  const DEFAULT_DURATION = 200;
  const preset = "svs-drawer";

  function isPrefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function getPositionProp(position: Position): string {
    switch (position) {
      case "top":
      case "left": return "--top:0;--left:0;--bottom:auto;--right:auto;";
      case "bottom": return "--top:auto;--left:0;--bottom:0;--right:auto;";
      case "right": return "--top:0;--left:auto;--bottom:auto;--right:0;";
    }
  }
  function getSizeProp(position: Position, size: string): string {
    const interpolate = ["auto", "min-content", "max-content", "fit-content", "content"].includes(size) ? "interpolate-size:allow-keywords;" : "";
    return ["top", "bottom"].includes(position)
      ? `--width-from:100%;--width-to:100%;--height-from:0;--height-to:${size};${interpolate}`
      : `--width-from:0;--width-to:${size};--height-from:100%;--height-to:100%;${interpolate}`;
  }

  import { type Snippet, untrack } from "svelte";
  import { type HTMLAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, isUnsignedInteger, omit } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), position = "left", size = "auto", duration = -1, closable = true, id, attributes, element = $bindable(), styling, variant = $bindable("") }: DrawerProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  if (isPrefersReducedMotion()) duration = 0;
  if (!isUnsignedInteger(duration)) duration = DEFAULT_DURATION;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "class", "id", "style", "popover", "ontoggle");
  const popover = closable ? "auto" : "manual";
  const baseStyle = `${getPositionProp(position)}${getSizeProp(position, size)}--duration:${duration}ms;margin:initial;padding:initial;`;
  let style = $state(baseStyle);

  // *** Bind Handlers *** //
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });
  function toggle() {
    if (open) {
      element?.showPopover();
    } else {
      element?.hidePopover();
    }
  }

  // *** Event Handlers *** //
  function ontoggle(ev: ToggleEvent) {
    attributes?.["ontoggle"]?.(ev as any);
    open = ev.newState === "open";
    style = baseStyle + "overflow:hidden;";
    setTimeout(() => style = baseStyle, duration);
  }
  $effect(() => untrack(() => { if (open) element?.showPopover(); }));
</script>

<!---------------------------------------->

<div bind:this={element} class={cls(PARTS.WHOLE, variant)} {id} {style} {popover} {ontoggle} {...attrs}>
  {@render children(variant)}
</div>

<style>
  [popover] {
    position: fixed;
    top: var(--top);
    left: var(--left);
    bottom: var(--bottom);
    right: var(--right);
    width: var(--width-from);
    height: var(--height-from);
    transition-property: display, width, height;
    transition-behavior: allow-discrete;
    transition-duration: var(--duration);
  }
  [popover]:popover-open {
    width: var(--width-to);
    height: var(--height-to);
    @starting-style {
      width: var(--width-from);
      height: var(--height-from);
    }
  }
</style>
