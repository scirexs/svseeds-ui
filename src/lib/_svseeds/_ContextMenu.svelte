<!--
  @component
  default value: `(value)`
  ```ts
  interface ContextMenuProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // bindable (false)
    element?: HTMLElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
-->
<script module lang="ts">
  export interface ContextMenuProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // bindable (false)
    element?: HTMLElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ContextMenuReqdProps = "children";
  export type ContextMenuBindProps = "open" | "lock" | "variant" | "element";

  const preset = "svs-context-menu";

  import { type Snippet } from "svelte";
  import { type SVSClass, VARIANT, PARTS, fnClass } from "./core";
</script>

<!---------------------------------------->

<script lang="ts">
  let { children, open = $bindable(false), lock = $bindable(false), element = $bindable(), styling, variant = $bindable("") }: ContextMenuProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  let position = $state({ x: 0, y: 0 });

  // *** Bind Handlers *** //
  let visibility = $derived(open ? "visibility: visible;" : "visibility: hidden; z-index: -9999;");
  let dynStyle = $derived(`position: fixed; left:${position.x}px; top:${position.y}px; ${visibility}`);

  // *** Event Handlers *** //
  function show(ev: MouseEvent) {
    if (lock) return;
    ev.preventDefault();

    const menu = { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
    position.x = window.innerWidth-ev.clientX < menu.width ? ev.clientX-menu.width : ev.clientX;
    position.y = window.innerHeight-ev.clientY < menu.height ? (ev.clientY < menu.height ? ev.clientY : ev.clientY-menu.height) : ev.clientY;
    open = true;
  }
  function hide() { if (!lock) open = false; }
</script>

<!---------------------------------------->
<svelte:document oncontextmenu={show} onclick={hide} />

<nav class={cls(PARTS.WHOLE, variant)} style={dynStyle} bind:this={element}>
  {@render children(variant)}
</nav>
