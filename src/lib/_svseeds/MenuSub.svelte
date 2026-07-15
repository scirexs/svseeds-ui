<!--
  @component
  ### Usage
  Use inside `MenuList` to trigger a nested `MenuList`.
  ```svelte
  <MenuList>
    <MenuSub label="More">
      <MenuList />
    </MenuSub>
  </MenuList>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuSubProps extends Omit<HTMLButtonAttributes, "children" | "type" | "role" | "disabled"> {
    children: Snippet<[string]>; // Snippet<[variant]>; must render the submenu's MenuList
    label: string | Snippet<[string]>; // Snippet<[variant]>; trigger content
    open?: boolean; // bindable (false); to observe state, not to control
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-openable
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable; the trigger
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to the trigger via ...rest; `class` is merged onto the trigger
    // id, type, role, tabindex, aria-haspopup, aria-expanded, aria-disabled, style, and handlers are component-owned
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" role="none">
    <button class="main" {...rest} id type="button" role="menuitem" tabindex="-1" aria-haspopup="menu" aria-expanded aria-disabled style>{label}</button>
    <div class="middle" role="none" popover="manual" style>{children}</div>
  </div>
  ```
  ### Behavior
  Provides `MenuContainerContext` to its nested `MenuList`, labels that submenu from the trigger, opens on click, hover, Enter, Space, and the forward arrow for the parent menu orientation, and closes one level on Escape or the back arrow. Hover uses a per-level safe triangle while moving toward the submenu. Hover-opening focuses the submenu's first enabled item through `MenuList`'s existing open effect.
-->
<script module lang="ts">
  export interface MenuSubProps extends Omit<HTMLButtonAttributes, "children" | "type" | "role" | "disabled"> {
    children: Snippet<[string]>; // Snippet<[variant]>; must render the submenu's MenuList
    label: string | Snippet<[string]>; // Snippet<[variant]>; trigger content
    open?: boolean; // bindable (false); to observe state, not to control
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-openable
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable; the trigger
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuSubReqdProps = "children" | "label";
  export type MenuSubBindProps = "open" | "element";

  export const _MENU_SUB_PRESET = "svs-menu-sub";

  import { untrack } from "svelte";
  import { on } from "svelte/events";
  import { VARIANT, PARTS, _fnClass, canHover } from "./_core";
  import { _getMenuItemContext } from "./MenuItem.svelte";
  import { _setMenuContainerContext } from "./MenuList.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type {
    HTMLButtonAttributes,
    KeyboardEventHandler,
    MouseEventHandler,
    PointerEventHandler,
    ToggleEventHandler,
  } from "svelte/elements";
  import type { SVSClass, SVSVariant, Vector } from "./_core";
  import type { MenuContainerContext } from "./MenuList.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, label, open = $bindable(false), disabled = false, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuSubProps = $props();
  const parent = _getMenuItemContext();
  const uid = $props.id();

  // *** Initialize *** //
  const anchor = `--svs-menu-sub-${uid}`;
  const triggerStyle = `anchor-name:${anchor}`;
  const panelStyle = `position-anchor:${anchor};position-area:right span-bottom;position-try-fallbacks:flip-inline`;
  const effVariant = $derived(parent ? parent.variant : variant);
  const effStyling = $derived(styling ?? parent?.styling);
  const cls = $derived(_fnClass(_MENU_SUB_PRESET, effStyling));
  const ctx: MenuContainerContext = {
    get variant() {
      return effVariant;
    },
    get styling() {
      return effStyling;
    },
    get open() {
      return open;
    },
    labelledby: uid,
    close() {
      closeChain();
    },
  };
  _setMenuContainerContext(ctx);

  let middle = $state<HTMLDivElement>();
  let shown = false;
  let guard: ((x: number, y: number) => boolean) | undefined;
  let hoverClick = false;

  // *** Reactive Handlers *** //
  $effect(() => {
    if (open) parent?.level?.open(closeSelf);
    else parent?.level?.close(closeSelf);
    if (open === shown) return;
    if (open) middle?.showPopover();
    else middle?.hidePopover();
  });

  $effect.pre(() => {
    open;
    return untrack(() => watchPointer());
  });

  // *** Event Handlers *** //
  function show() {
    if (disabled) return;
    parent?.level?.open(closeSelf);
    open = true;
  }
  function hoverShow() {
    show();
    hoverClick = true;
    setTimeout(() => (hoverClick = false), 0);
  }
  function closeSelf() {
    closeLocal();
    parent?.level?.close(closeSelf);
  }
  function expireSelf() {
    closeLocal();
  }
  function closeLocal() {
    const refocus = middle?.contains(document.activeElement);
    open = false;
    guard = undefined;
    if (refocus && element?.isConnected) element.focus();
  }
  function closeChain() {
    closeSelf();
    parent?.close();
  }
  function toggle() {
    if (open) closeSelf();
    else show();
  }
  function watchPointer() {
    if (!open) return;
    return on(document, "pointermove", hdocpointermove);
  }
  function hdocpointermove(ev: PointerEvent) {
    if (element?.contains(ev.target as Node) || middle?.contains(ev.target as Node)) {
      parent?.level?.settle();
      guard = undefined;
      return;
    }
    if (guard?.(ev.clientX, ev.clientY)) return;
    parent?.level?.release();
    closeSelf();
  }
  function triangle(from: Vector, rect: DOMRect): (x: number, y: number) => boolean {
    const ex = rect.left >= from.x ? rect.left : rect.right;
    const a = from;
    const b = { x: ex, y: rect.top };
    const c = { x: ex, y: rect.bottom };
    const side = (p: Vector, q: Vector, x: number, y: number) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
    return (x, y) => {
      const s1 = side(a, b, x, y);
      const s2 = side(b, c, x, y);
      const s3 = side(c, a, x, y);
      return !((s1 < 0 || s2 < 0 || s3 < 0) && (s1 > 0 || s2 > 0 || s3 > 0));
    };
  }
  function forwardKey(): string {
    return parent?.orientation === "horizontal" ? "ArrowDown" : "ArrowRight";
  }
  function backKey(): string {
    return parent?.orientation === "horizontal" ? "ArrowUp" : "ArrowLeft";
  }
  const hpointermove: PointerEventHandler<HTMLButtonElement> = () => {
    if (disabled || open || !canHover()) return;
    if (parent?.level) parent.level.want(hoverShow);
    else hoverShow();
  };
  const hpointerleave: PointerEventHandler<HTMLButtonElement> = (ev) => {
    if (disabled || !open || !canHover() || !middle) return;
    guard = triangle({ x: ev.clientX, y: ev.clientY }, middle.getBoundingClientRect());
    parent?.level?.guard(expireSelf);
  };
  const hclick: MouseEventHandler<HTMLButtonElement> = (ev) => {
    ev.stopPropagation();
    if (disabled) {
      ev.preventDefault();
      return;
    }
    if (open && hoverClick) {
      hoverClick = false;
      return;
    }
    toggle();
  };
  const hkeydown: KeyboardEventHandler<HTMLButtonElement> = (ev) => {
    if (disabled) return;
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== forwardKey()) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.key === forwardKey()) show();
    else toggle();
  };
  const hpanelkeydown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    if (ev.key !== "Escape" && ev.key !== backKey()) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeSelf();
    element?.focus();
  };
  const htoggle: ToggleEventHandler<HTMLDivElement> = (ev) => {
    shown = ev.newState === "open";
  };
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, effVariant)} role="none">
  <button
    bind:this={element}
    class={[cls(PARTS.MAIN, effVariant), c]}
    {...rest}
    id={uid}
    type="button"
    role="menuitem"
    tabindex="-1"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-disabled={disabled || undefined}
    style={triggerStyle}
    onpointermove={hpointermove}
    onpointerleave={hpointerleave}
    onclick={hclick}
    onkeydown={hkeydown}
    {@attach attach}
  >
    {#if typeof label === "string"}{label}{:else}{@render label(effVariant)}{/if}
  </button>
  <div
    bind:this={middle}
    class={cls(PARTS.MIDDLE, effVariant)}
    role="none"
    popover="manual"
    style={panelStyle}
    onkeydown={hpanelkeydown}
    ontoggle={htoggle}
  >
    {@render children(effVariant)}
  </div>
</div>
