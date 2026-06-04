<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    id?: string;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
  }
  type Position = "top" | "right" | "bottom" | "left";
  ```
  ### Anatomy
  ```svelte
  <div class={["whole", class]} {id} {...rest} bind:this={element}>
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    id?: string;
    element?: HTMLDivElement; // bindable
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
    const interpolate = ["auto", "min-content", "max-content", "fit-content", "content"].includes(size)
      ? "interpolate-size:allow-keywords;"
      : "";
    return ["top", "bottom"].includes(position)
      ? `--width-from:100%;--width-to:100%;--height-from:0;--height-to:${size};${interpolate}`
      : `--width-from:0;--width-to:${size};--height-from:100%;--height-to:100%;${interpolate}`;
  }

  import { type Snippet, untrack } from "svelte";
  import { type HTMLAttributes, type ToggleEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), position = "left", size = "auto", duration = -1, closable = true, id, ontoggle, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: DrawerProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);
  const popover = $derived(closable ? "auto" : "manual");
  // svelte-ignore state_referenced_locally
  const baseStyle = $derived(
    `${getPositionProp(position)}${getSizeProp(position, size)}--duration:${dur}ms;margin:initial;padding:initial;`,
  );
  let style = $derived(baseStyle);

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
  function htoggle(ev: Parameters<ToggleEventHandler<HTMLDivElement>>[0]) {
    ontoggle?.(ev);
    open = ev.newState === "open";
    style = baseStyle + "overflow:hidden;";
    setTimeout(() => (style = baseStyle), dur);
  }
  $effect(() =>
    untrack(() => {
      if (open) element?.showPopover();
    }),
  );
</script>

<!---------------------------------------->

<div bind:this={element} class={[cls(PARTS.WHOLE, variant), c]} {id} {...rest} {style} {popover} ontoggle={htoggle}>
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
