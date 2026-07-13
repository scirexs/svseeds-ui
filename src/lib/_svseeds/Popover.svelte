<!--
  @component
  ### Usage
  Use standalone; the panel usually wraps `MenuList`.
  ```svelte
  <Popover label="Menu" {...props}>
    <MenuList {...props} />
  </Popover>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface PopoverProps extends Omit<HTMLButtonAttributes, "children" | "style" | "popovertarget" | "popovertargetaction"> {
    label: string | Snippet<[boolean, string]>; // trigger; Snippet<[open, variant]>
    children: Snippet<[string]>; // panel content; Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); observe + control
    hover?: boolean; // (false); open on pointerenter / focusin where the primary pointer can hover
    position?: Position; // ("bottom")
    align?: Align; // ("start")
    offset?: number; // (0); gap from the anchor edge, px
    autoFlip?: boolean; // (true); native fallback placement
    matchWidth?: boolean; // (false); panel min-width = anchor width
    ariaRole?: PopoverRole; // panel role
    manual?: boolean; // (false); popover="manual" disables light-dismiss
    arrow?: boolean; // (false); render the resolved placement caret part (`top`/`bottom`/`left`/`right`) and `data-svs-placement`
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to the trigger via ...rest; `class` is merged onto the trigger
    // style, popovertarget, and popovertargetaction are component-owned
  }
  type PopoverRole = "menu" | "listbox" | "dialog";
  type Position = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";
  ```
  ### Anatomy
  ```svelte
  <button class="label" popovertarget aria-haspopup aria-expanded aria-controls>
    {label}
  </button>
  <div class="whole" popover role style data-svs-placement>
    <div class="top" style aria-hidden conditional: arrow, placement=bottom></div>
    <div class="left" style aria-hidden conditional: arrow, placement=right></div>
    <div class="main">{children}</div>
    <div class="bottom" style aria-hidden conditional: arrow, placement=top></div>
    <div class="right" style aria-hidden conditional: arrow, placement=left></div>
  </div>
  ```
  ### Behavior
  Button trigger plus a `[popover]` panel, using the native Popover API and CSS Anchor Positioning only, with no JavaScript positioning fallback. `open` syncs both ways between programmatic state and native toggle events. `position`, `align`, `offset`, `matchWidth`, and `autoFlip` derive the native placement style; when `arrow` is enabled, a measurement effect reads the resolved trigger/panel rects on open, scroll, and resize so the rendered caret follows native flips and `data-svs-placement` exposes the resolved side. `hover` adds pointer/focus opening only where the primary pointer can hover, otherwise it behaves like native click/focus opening. The component always provides `MenuContainerContext` so a nested `MenuList` can focus its first enabled item and close through the container. `manual` switches the panel to `popover="manual"` and disables native light-dismiss behavior.
-->
<script module lang="ts">
  export interface PopoverProps extends Omit<HTMLButtonAttributes, "children" | "style" | "popovertarget" | "popovertargetaction"> {
    label: string | Snippet<[boolean, string]>; // trigger; Snippet<[open, variant]>
    children: Snippet<[string]>; // panel content; Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); observe + control
    hover?: boolean; // (false); open on pointerenter / focusin where the primary pointer can hover
    position?: Position; // ("bottom")
    align?: Align; // ("start")
    offset?: number; // (0); gap from the anchor edge, px
    autoFlip?: boolean; // (true); native fallback placement
    matchWidth?: boolean; // (false); panel min-width = anchor width
    ariaRole?: PopoverRole; // panel role
    manual?: boolean; // (false); popover="manual" disables light-dismiss
    arrow?: boolean; // (false); render the resolved placement caret part (`top`/`bottom`/`left`/`right`) and `data-svs-placement`
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type PopoverRole = "menu" | "listbox" | "dialog";
  export type PopoverReqdProps = "label" | "children";
  export type PopoverBindProps = "open" | "element";

  export const _POPOVER_PRESET = "svs-popover";

  const POSITION_AREA = {
    top: { start: "top span-right", center: "top center", end: "top span-left" },
    right: { start: "right span-bottom", center: "right center", end: "right span-top" },
    bottom: { start: "bottom span-right", center: "bottom center", end: "bottom span-left" },
    left: { start: "left span-bottom", center: "left center", end: "left span-top" },
  } as const;
  const GAP_SIDE = { top: "margin-bottom", right: "margin-left", bottom: "margin-top", left: "margin-right" } as const;
  const CARET_STYLE = {
    bottom: "position:absolute;left:50%;top:0;translate:-50% -50%",
    top: "position:absolute;left:50%;bottom:0;translate:-50% 50%",
    right: "position:absolute;top:50%;left:0;translate:-50% -50%",
    left: "position:absolute;top:50%;right:0;translate:50% -50%",
  } as const;

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, canHover } from "./_core";
  import { _setMenuContainerContext } from "./MenuList.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLButtonAttributes, FocusEventHandler, PointerEventHandler, ToggleEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, Position, Align } from "./_core";
  import type { MenuContainerContext } from "./MenuList.svelte";
</script>

<!---------------------------------------->

<script lang="ts">
  // prettier-ignore
  let { label, children, open = $bindable(false), hover = false, position = "bottom", align = "start", offset = 0, autoFlip = true, matchWidth = false, ariaRole, manual = false, arrow = false, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, type = "button", onpointerenter, onfocusin, onpointerleave, onfocusout, class: c, ...rest }: PopoverProps = $props();

  // *** Initialize *** //
  const uid = $props.id();
  const pid = `${uid}-popover`;
  const anchor = `--svs-popover-${uid}`;
  const triggerStyle = `anchor-name:${anchor}`;
  const cls = $derived(_fnClass(_POPOVER_PRESET, styling));
  const hoverEnabled = $derived(hover && canHover());
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
      open = false;
    },
  };
  _setMenuContainerContext(ctx);

  function initial() {
    return position;
  }

  let panel = $state<HTMLDivElement>();
  let placement = $state<Position>(initial());
  let shown = false;

  // *** Reactive Handlers *** //
  const panelStyle = $derived(
    [
      `position-anchor:${anchor}`,
      `position-area:${POSITION_AREA[position][align]}`,
      offset ? `${GAP_SIDE[position]}:${offset}px` : "",
      matchWidth ? "min-width:anchor-size(width)" : "",
      autoFlip ? "position-try-fallbacks:flip-block, flip-inline" : "",
    ]
      .filter(Boolean)
      .join(";"),
  );
  const caretStyle = $derived(CARET_STYLE[placement]);
  const hasPopup = $derived(ariaRole ?? "true");

  $effect(() => {
    if (open === shown) return;
    if (open) panel?.showPopover();
    else panel?.hidePopover();
  });

  $effect(() => {
    arrow;
    open;
    return untrack(() => watch());
  });

  // *** Event Handlers *** //
  function measure() {
    if (!panel || !element) return;
    const p = panel.getBoundingClientRect();
    const a = element.getBoundingClientRect();
    const dx = (p.left + p.right - a.left - a.right) / 2;
    const dy = (p.top + p.bottom - a.top - a.bottom) / 2;
    placement = Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? "bottom" : "top") : dx >= 0 ? "right" : "left";
  }
  function watch() {
    if (!arrow || !open) return;
    measure();
    let raf = 0;
    const onmove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    window.addEventListener("scroll", onmove, { capture: true, passive: true });
    window.addEventListener("resize", onmove, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onmove, { capture: true });
      window.removeEventListener("resize", onmove);
    };
  }
  function maybeClose(ev: PointerEvent | FocusEvent) {
    if (!hoverEnabled) return;
    const to = ev.relatedTarget as Node | null;
    if (to && (element?.contains(to) || panel?.contains(to))) return;
    open = false;
  }
  const triggerenter: PointerEventHandler<HTMLButtonElement> = (ev) => {
    onpointerenter?.(ev);
    open = true;
  };
  const triggerfocusin: FocusEventHandler<HTMLButtonElement> = (ev) => {
    onfocusin?.(ev);
    open = true;
  };
  const triggerleave: PointerEventHandler<HTMLButtonElement> = (ev) => {
    onpointerleave?.(ev);
    maybeClose(ev);
  };
  const triggerfocusout: FocusEventHandler<HTMLButtonElement> = (ev) => {
    onfocusout?.(ev);
    maybeClose(ev);
  };
  const panelleave: PointerEventHandler<HTMLDivElement> = (ev) => maybeClose(ev);
  const panelfocusout: FocusEventHandler<HTMLDivElement> = (ev) => maybeClose(ev);
  const hpointerenter = $derived(hoverEnabled ? triggerenter : onpointerenter);
  const hfocusin = $derived(hoverEnabled ? triggerfocusin : onfocusin);
  const hpointerleave = $derived(hoverEnabled ? triggerleave : onpointerleave);
  const hfocusout = $derived(hoverEnabled ? triggerfocusout : onfocusout);
  const htoggle: ToggleEventHandler<HTMLDivElement> = (ev) => {
    shown = ev.newState === "open";
    open = shown;
  };
</script>

<!---------------------------------------->

<button
  bind:this={element}
  {...rest}
  {type}
  class={[cls(PARTS.LABEL, variant), c]}
  popovertarget={pid}
  aria-haspopup={hasPopup}
  aria-expanded={open}
  aria-controls={pid}
  style={triggerStyle}
  onpointerenter={hpointerenter}
  onfocusin={hfocusin}
  onpointerleave={hpointerleave}
  onfocusout={hfocusout}
  {@attach attach}
>
  {#if typeof label === "string"}{label}{:else}{@render label(open, variant)}{/if}
</button>

<div
  bind:this={panel}
  id={pid}
  class={cls(PARTS.WHOLE, variant)}
  popover={manual ? "manual" : "auto"}
  role={ariaRole}
  style={panelStyle}
  data-svs-placement={arrow ? placement : undefined}
  ontoggle={htoggle}
  onpointerleave={hoverEnabled ? panelleave : undefined}
  onfocusout={hoverEnabled ? panelfocusout : undefined}
>
  {#if arrow && placement === "bottom"}<div class={cls(PARTS.TOP, variant)} style={caretStyle} aria-hidden="true"></div>{/if}
  {#if arrow && placement === "right"}<div class={cls(PARTS.LEFT, variant)} style={caretStyle} aria-hidden="true"></div>{/if}
  <div class={cls(PARTS.MAIN, variant)}>{@render children(variant)}</div>
  {#if arrow && placement === "top"}<div class={cls(PARTS.BOTTOM, variant)} style={caretStyle} aria-hidden="true"></div>{/if}
  {#if arrow && placement === "left"}<div class={cls(PARTS.RIGHT, variant)} style={caretStyle} aria-hidden="true"></div>{/if}
</div>
