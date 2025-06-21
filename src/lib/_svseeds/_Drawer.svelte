<!--
  @component
  default value: `(value)`
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

  const preset = "svs-drawer";

  const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
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
      ? `--width-from:100dvw;--width-to:100dvw;--height-from:0;--height-to:${size};${interpolate}`
      : `--width-from:0;--width-to:${size};--height-from:100dvh;--height-to:100dvh;${interpolate}`;
  }

  import { type Snippet, untrack } from "svelte";
  import { type HTMLAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { children, open = $bindable(false), position = "left", size = "auto", duration = 200, closable = true, id, attributes, element = $bindable(), styling, variant = $bindable("") }: DrawerProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
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
    sleep(duration).finally(() => style = baseStyle);
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
