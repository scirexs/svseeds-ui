<!--
  @component
  ### Usage
  Wrap a `MenuList`.
  ```svelte
  <ContextMenu {...props}>
    <MenuList {...props} />
  </ContextMenu>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // style is component-owned
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} style={positioning}>
    {children}
  </div>
  ```
  ### Behavior
  Container for a descendant `MenuList`. ContextMenu provides `MenuContainerContext` and owns the contextmenu trigger, touch long-press fallback, fixed positioning, visibility, focus restore, Escape dismissal, and outside-click dismissal. Menu semantics, navigation, typeahead, data-mode, and item context live in `MenuList`.
  Touch targets that should avoid iOS's native selection callout should apply caller CSS such as `-webkit-touch-callout: none; user-select: none;` to the trigger element.
-->
<script module lang="ts">
  export interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ContextMenuReqdProps = never;
  export type ContextMenuBindProps = "open" | "element";

  export const _CONTEXT_MENU_PRESET = "svs-context-menu";
  const LONG_PRESS = 700;
  const MOVE_CANCEL = 10;

  import { on } from "svelte/events";
  import { VARIANT, PARTS, _fnClass } from "./_core";
  import { _setMenuContainerContext } from "./MenuList.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes, KeyboardEventHandler, MouseEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
  import type { MenuContainerContext } from "./MenuList.svelte";
</script>

<!---------------------------------------->

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), lock = false, target, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ContextMenuProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_CONTEXT_MENU_PRESET, styling));
  const ctx: MenuContainerContext = {
    get variant() {
      return variant;
    },
    get styling() {
      return styling;
    },
    get open() {
      return open;
    },
    close() {
      hide();
    },
  };
  _setMenuContainerContext(ctx);

  let position = $state({ x: 0, y: 0 });
  let prevFocus: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin = { x: 0, y: 0 };
  let touched = false;

  $effect.pre(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(on(document, "pointermove", move));
    cleanups.push(on(document, "pointerup", cancel));
    cleanups.push(on(document, "pointercancel", cancel));
    if (target) {
      cleanups.push(on(target, "contextmenu", show));
      cleanups.push(on(target, "pointerdown", press));
      cleanups.push(on(document, "contextmenu", hide));
      cleanups.push(on(document, "pointerdown", reset));
    } else {
      cleanups.push(on(document, "contextmenu", show));
      cleanups.push(on(document, "pointerdown", press));
    }
    return () => {
      cancel();
      cleanups.forEach((x) => x());
    };
  });

  // *** Reactive Handlers *** //
  const dynStyle = $derived(
    `position:fixed;left:${position.x}px;top:${position.y}px;${open ? "visibility:visible;" : "visibility:hidden;z-index:-9999;"}`,
  );

  // *** Event Handlers *** //
  function show(ev: Event) {
    if (lock) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (timer !== undefined) touched = true;
    cancel();
    showAt((ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
  }
  function showAt(x: number, y: number) {
    const menu = { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
    position.x = window.innerWidth - x < menu.width ? (x < menu.width ? x : x - menu.width) : x;
    position.y = window.innerHeight - y < menu.height ? (y < menu.height ? y : y - menu.height) : y;
    prevFocus = document.activeElement as HTMLElement | null;
    open = true;
  }
  function hide() {
    if (lock) return;
    open = false;
    if (prevFocus?.isConnected) prevFocus.focus();
    prevFocus = null;
  }
  function press(ev: PointerEvent) {
    reset();
    if (ev.pointerType !== "touch" || !ev.isPrimary) return;
    origin = { x: ev.clientX, y: ev.clientY };
    timer = setTimeout(() => {
      timer = undefined;
      if (lock) return;
      touched = true;
      showAt(origin.x, origin.y);
    }, LONG_PRESS);
  }
  function move(ev: PointerEvent) {
    if (timer === undefined) return;
    if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) > MOVE_CANCEL) cancel();
  }
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }
  function reset() {
    touched = false;
  }
  const hclick: MouseEventHandler<HTMLDocument> = () => {
    if (touched) return reset();
    hide();
  };
  const hkeydown: KeyboardEventHandler<HTMLDocument> = (ev) => {
    if (ev.key === "Escape") hide();
  };
</script>

<!---------------------------------------->
<svelte:document onclick={hclick} onkeydown={hkeydown} />

<div class={[cls(PARTS.WHOLE, variant), c]} {...rest} style={dynStyle} bind:this={element} {@attach attach}>
  {#if children}{@render children(variant)}{/if}
</div>
