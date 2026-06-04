<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ContextMenuProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    element?: HTMLElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <nav class="whole" bind:this={element}>
    {children}
  </nav>
  ```
-->
<script module lang="ts">
  export interface ContextMenuProps {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    element?: HTMLElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ContextMenuReqdProps = "children";
  export type ContextMenuBindProps = "open" | "element";

  const preset = "svs-context-menu";

  import { type Snippet, onDestroy } from "svelte";
  import { on } from "svelte/events";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<!---------------------------------------->

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), lock = false, target, element = $bindable(), styling, variant = VARIANT.NEUTRAL }: ContextMenuProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  let position = $state({ x: 0, y: 0 });
  let listeners: (() => void)[] = [];
  $effect(() => {
    listeners.push(on(target ?? document, "contextmenu", show));
    if (target) listeners.push(on(document, "contextmenu", hide));
  });
  onDestroy(() => listeners.forEach((x) => x()));

  // *** Bind Handlers *** //
  let dynStyle = $derived(
    `position:fixed;left:${position.x}px;top:${position.y}px;${open ? "visibility:visible;" : "visibility:hidden;z-index:-9999;"}`,
  );

  // *** Event Handlers *** //
  function show(ev: Event) {
    if (lock) return;
    ev.preventDefault();
    ev.stopPropagation();

    const [x, y] = [(ev as MouseEvent).clientX, (ev as MouseEvent).clientY];
    const menu = { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
    position.x = window.innerWidth - x < menu.width ? x - menu.width : x;
    position.y = window.innerHeight - y < menu.height ? (y < menu.height ? y : y - menu.height) : y;
    open = true;
  }
  function hide() {
    if (!lock) open = false;
  }
</script>

<!---------------------------------------->
<svelte:document onclick={hide} />

<nav class={cls(PARTS.WHOLE, variant)} style={dynStyle} bind:this={element}>
  {@render children(variant)}
</nav>
