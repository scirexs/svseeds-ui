<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface PopoverProps extends Omit<HTMLButtonAttributes, "children" | "style" | "popovertarget" | "popovertargetaction"> {
    label: string | Snippet<[boolean, string]>; // trigger; Snippet<[open, variant]>
    children: Snippet<[string]>; // panel content; Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); observe + control
    hover?: boolean; // (false); open on pointerenter / focusin
    position?: PopoverPosition; // ("bottom")
    align?: PopoverAlign; // ("start")
    offset?: number; // (0); gap from the anchor edge, px
    autoFlip?: boolean; // (true); native fallback placement
    matchWidth?: boolean; // (false); panel min-width = anchor width
    ariaRole?: PopoverRole; // panel role
    manual?: boolean; // (false); popover="manual" disables light-dismiss
    arrow?: boolean; // (false); render an arrow/caret styling hook
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to the trigger via ...rest; `class` is merged onto the trigger
    // style, popovertarget, and popovertargetaction are component-owned
  }
  type PopoverPosition = "top" | "right" | "bottom" | "left";
  type PopoverAlign = "start" | "center" | "end";
  type PopoverRole = "menu" | "listbox" | "dialog";
  ```
  ### Behavior
  Button trigger plus a `[popover]` panel, using the native Popover API and CSS Anchor Positioning only, with no JavaScript positioning fallback. `open` syncs both ways between programmatic state and native toggle events. `position`, `align`, `offset`, `matchWidth`, and `autoFlip` derive the native placement style; `hover` adds pointer/focus opening. The component always provides `MenuContainerContext` so a nested `MenuList` can focus its first enabled item and close through the container. `manual` switches the panel to `popover="manual"` and disables native light-dismiss behavior.
  ### Anatomy
  ```svelte
  <button class="label" popovertarget aria-haspopup aria-expanded aria-controls>
    {label}
  </button>
  <div class="whole" popover role style>
    <div class="extra" aria-hidden></div>
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface PopoverProps extends Omit<HTMLButtonAttributes, "children" | "style" | "popovertarget" | "popovertargetaction"> {
    label: string | Snippet<[boolean, string]>; // trigger; Snippet<[open, variant]>
    children: Snippet<[string]>; // panel content; Snippet<[variant]>; usually renders a MenuList
    open?: boolean; // bindable (false); observe + control
    hover?: boolean; // (false)
    position?: PopoverPosition; // ("bottom")
    align?: PopoverAlign; // ("start")
    offset?: number; // (0)
    autoFlip?: boolean; // (true)
    matchWidth?: boolean; // (false)
    ariaRole?: PopoverRole;
    manual?: boolean; // (false)
    arrow?: boolean; // (false)
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type PopoverReqdProps = "label" | "children";
  export type PopoverBindProps = "open" | "element";
  export type PopoverPosition = "top" | "right" | "bottom" | "left";
  export type PopoverAlign = "start" | "center" | "end";
  export type PopoverRole = "menu" | "listbox" | "dialog";

  export const _POPOVER_PRESET = "svs-popover";

  const POSITION_AREA = {
    top: { start: "top span-right", center: "top center", end: "top span-left" },
    right: { start: "right span-bottom", center: "right center", end: "right span-top" },
    bottom: { start: "bottom span-right", center: "bottom center", end: "bottom span-left" },
    left: { start: "left span-bottom", center: "left center", end: "left span-top" },
  } as const;
  const GAP_SIDE = { top: "margin-bottom", right: "margin-left", bottom: "margin-top", left: "margin-right" } as const;

  import { VARIANT, PARTS, fnClass } from "./core";
  import { _setMenuContainerContext } from "./_MenuList.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLButtonAttributes, FocusEventHandler, PointerEventHandler, ToggleEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
  import type { MenuContainerContext } from "./_MenuList.svelte";
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
  const cls = $derived(fnClass(_POPOVER_PRESET, styling));
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

  let panel = $state<HTMLDivElement>();
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
  const hasPopup = $derived(ariaRole ?? "true");

  $effect(() => {
    if (open === shown) return;
    if (open) panel?.showPopover();
    else panel?.hidePopover();
  });

  // *** Event Handlers *** //
  function maybeClose(ev: PointerEvent | FocusEvent) {
    if (!hover) return;
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
  const hpointerenter = $derived(hover ? triggerenter : onpointerenter);
  const hfocusin = $derived(hover ? triggerfocusin : onfocusin);
  const hpointerleave = $derived(hover ? triggerleave : onpointerleave);
  const hfocusout = $derived(hover ? triggerfocusout : onfocusout);
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
  ontoggle={htoggle}
  onpointerleave={hover ? panelleave : undefined}
  onfocusout={hover ? panelfocusout : undefined}
>
  {#if arrow}<div class={cls(PARTS.EXTRA, variant)} aria-hidden="true"></div>{/if}
  {@render children(variant)}
</div>
