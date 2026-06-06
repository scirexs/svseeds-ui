<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // style is component-owned (omitted)
  }
  type Position = "top" | "right" | "bottom" | "left";
  ```
  Drawer is modal: focus is trapped and background siblings are inert while open.
  `closable=false` creates a forced-action modal (no light-dismiss/Escape).
  ### Anatomy
  ```svelte
  <div class={["whole", class]} role="dialog" aria-modal="true" {...rest} {style} {popover} bind:this={element}>
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false)
    position?: Position; // ("left")
    size?: string; // ("auto")
    duration?: number; // (200)
    closable?: boolean; // (true)
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
    const interpolate = ["auto", "min-content", "max-content", "fit-content"].includes(size) ? "interpolate-size:allow-keywords;" : "";
    return ["top", "bottom"].includes(position)
      ? `--width-from:100%;--width-to:100%;--height-from:0;--height-to:${size};${interpolate}`
      : `--width-from:0;--width-to:${size};--height-from:100%;--height-to:100%;${interpolate}`;
  }

  import { type Snippet, untrack, onMount } from "svelte";
  import { type HTMLAttributes, type KeyboardEventHandler, type ToggleEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), position = "left", size = "auto", duration = -1, closable = true, onkeydown, ontoggle, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: DrawerProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(duration) ? DEFAULT_DURATION : duration);
  const popover = $derived(closable ? "auto" : "manual");
  const baseStyle = $derived(`${getPositionProp(position)}${getSizeProp(position, size)}--duration:${dur}ms;`);
  let style = $derived(baseStyle);
  const FOCUSABLE =
    'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let ofTimer: ReturnType<typeof setTimeout> | undefined;
  let lastFocused: HTMLElement | null = null;
  let inerted: HTMLElement[] = [];

  // *** Bind Handlers *** //
  const toggle = () => (open ? element?.showPopover() : element?.hidePopover());
  $effect.pre(() => {
    open;
    untrack(() => toggle());
  });

  // *** Event Handlers *** //
  function focusIn() {
    if (!element) return;
    const t = element.querySelector<HTMLElement>(FOCUSABLE);
    if (t) return t.focus();
    if (element.tabIndex < 0) element.tabIndex = -1;
    element.focus();
  }
  function restoreFocus() {
    lastFocused?.focus?.();
    lastFocused = null;
  }
  function setBackgroundInert() {
    if (!element || typeof document === "undefined") return;
    inerted = [];
    for (const el of Array.from(document.body.children)) {
      if (el instanceof HTMLElement && !el.contains(element) && !el.inert) {
        el.inert = true;
        inerted.push(el);
      }
    }
  }
  function clearBackgroundInert() {
    inerted.forEach((el) => (el.inert = false));
    inerted = [];
  }
  const hkeydown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    onkeydown?.(ev);
    if (ev.key !== "Tab" || !element) return;
    const f = element.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!f.length) return ev.preventDefault();

    const first = f[0];
    const last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  };
  const htoggle: ToggleEventHandler<HTMLDivElement> = (ev) => {
    ontoggle?.(ev);
    const opened = ev.newState === "open";
    open = opened;
    if (opened) {
      lastFocused = (document.activeElement as HTMLElement) ?? null;
      setBackgroundInert();
      focusIn();
    } else {
      clearBackgroundInert();
      restoreFocus();
    }
    style = baseStyle + "overflow:hidden;";
    clearTimeout(ofTimer);
    ofTimer = setTimeout(() => (style = baseStyle), dur);
  };
  onMount(() => {
    if (open) toggle();
    return () => {
      clearBackgroundInert();
      clearTimeout(ofTimer);
    };
  });
</script>

<!---------------------------------------->

<div
  bind:this={element}
  class={[cls(PARTS.WHOLE, variant), c]}
  role="dialog"
  aria-modal="true"
  {...rest}
  {style}
  {popover}
  onkeydown={hkeydown}
  ontoggle={htoggle}
>
  {@render children(variant)}
</div>

<style>
  [popover] {
    margin: 0;
    padding: 0;
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
