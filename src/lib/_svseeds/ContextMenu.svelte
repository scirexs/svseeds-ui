<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; wins over `items` when both given
    items?: MenuItemData[]; // data-mode sugar; ignored when `children` is present
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // style, role, tabindex, and keyboard handling are component-owned
  }
  type MenuSeparatorData = { separator: true };
  type MenuItemEntry = {
    label: string | Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false)
  };
  type MenuItemData = MenuItemEntry | MenuSeparatorData;
  ```
  ### Behavior
  Declarative `MenuItem`/`MenuSeparator` children inherit `variant`/`styling`, and activating an item closes the menu. ContextMenu owns focus restore, arrow/Home/End/Tab navigation, and typeahead.
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} role="menu" tabindex="-1" aria-orientation="vertical">
    {#if children}
      {children}
    {:else if items}
      <MenuItem>{label}</MenuItem>
      <MenuSeparator />
    {/if}
  </div>
  ```
-->
<script module lang="ts">
  export interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; wins over `items` when both given
    items?: MenuItemData[]; // data-mode sugar; ignored when `children` is present
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

  export type MenuSeparatorData = { separator: true };
  export type MenuItemEntry = {
    label: string | Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false)
  };
  export type MenuItemData = MenuItemEntry | MenuSeparatorData;

  const preset = "svs-context-menu";

  function isSeparator(x: MenuItemData): x is MenuSeparatorData {
    return "separator" in x;
  }

  import { type Snippet, tick } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLAttributes, type KeyboardEventHandler } from "svelte/elements";
  import { on } from "svelte/events";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
  import MenuItem, { _setMenuItemContext, type MenuItemContext } from "./_MenuItem.svelte";
  import MenuSeparator from "./_MenuSeparator.svelte";
</script>

<!---------------------------------------->

<script lang="ts">
  // prettier-ignore
  let { children, items, open = $bindable(false), lock = false, target, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ContextMenuProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const ctxVariant = $derived(variant);
  const ctxStyling = $derived(styling);
  const ctx: MenuItemContext = {
    get variant() {
      return ctxVariant;
    },
    get styling() {
      return ctxStyling;
    },
    close() {
      hide();
    },
  };
  _setMenuItemContext(ctx);

  let position = $state({ x: 0, y: 0 });
  let prevFocus: HTMLElement | null = null;
  let typeBuf = "";
  let typeTimer: ReturnType<typeof setTimeout> | undefined;

  $effect.pre(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(on(target ?? document, "contextmenu", show));
    if (target) cleanups.push(on(document, "contextmenu", hide));
    return () => cleanups.forEach((x) => x());
  });

  // *** Reactive Handlers *** //
  let dynStyle = $derived(
    `position:fixed;left:${position.x}px;top:${position.y}px;${open ? "visibility:visible;" : "visibility:hidden;z-index:-9999;"}`,
  );

  // *** Menu Helpers *** //
  function menuItems(): HTMLElement[] {
    if (!element) return [];
    return [...element.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((el) => el.getAttribute("aria-disabled") !== "true");
  }
  function focusAt(i: number) {
    const list = menuItems();
    if (!list.length) return;
    list[(i + list.length) % list.length].focus();
  }
  function focusFirst() {
    menuItems()[0]?.focus();
  }
  function typeahead(ev: KeyboardEvent) {
    if (ev.key === " " || ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    typeBuf += ev.key.toLowerCase();
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => (typeBuf = ""), 500);
    const hit = menuItems().find((el) => (el.textContent ?? "").trim().toLowerCase().startsWith(typeBuf));
    hit?.focus();
  }

  // *** Event Handlers *** //
  function show(ev: Event) {
    if (lock) return;
    ev.preventDefault();
    ev.stopPropagation();

    const [x, y] = [(ev as MouseEvent).clientX, (ev as MouseEvent).clientY];
    const menu = { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
    position.x = window.innerWidth - x < menu.width ? (x < menu.width ? x : x - menu.width) : x;
    position.y = window.innerHeight - y < menu.height ? (y < menu.height ? y : y - menu.height) : y;
    prevFocus = document.activeElement as HTMLElement | null;
    open = true;
    tick().then(focusFirst);
  }
  function hide() {
    if (lock) return;
    open = false;
    if (prevFocus?.isConnected) prevFocus.focus();
    prevFocus = null;
  }
  const hkeydown: KeyboardEventHandler<HTMLDocument> = (ev) => {
    if (ev.key === "Escape") hide();
  };
  const hkeydownMenu = (ev: KeyboardEvent) => {
    const list = menuItems();
    const cur = list.indexOf(document.activeElement as HTMLElement);
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        focusAt(cur + 1);
        return;
      case "ArrowUp":
        ev.preventDefault();
        focusAt(cur - 1);
        return;
      case "Home":
        ev.preventDefault();
        focusAt(0);
        return;
      case "End":
        ev.preventDefault();
        focusAt(list.length - 1);
        return;
      case "Tab":
        ev.preventDefault();
        hide();
        return;
      default:
        typeahead(ev);
    }
  };
</script>

<!---------------------------------------->
<svelte:document onclick={hide} onkeydown={hkeydown} />

<div
  class={[cls(PARTS.WHOLE, variant), c]}
  aria-orientation="vertical"
  {...rest}
  role="menu"
  tabindex="-1"
  style={dynStyle}
  bind:this={element}
  onkeydown={hkeydownMenu}
  {@attach attach}
>
  {#if children}
    {@render children(variant)}
  {:else if items && items.length > 0}
    {#each items as item, i (i)}
      {#if isSeparator(item)}
        <MenuSeparator />
      {:else}
        {#snippet label(variant: string)}
          {@render labelContent(item.label, variant)}
        {/snippet}
        <MenuItem onselect={item.onselect} disabled={item.disabled} children={label} />
      {/if}
    {/each}
  {/if}
</div>

{#snippet labelContent(label: string | Snippet<[string]>, variant: string)}
  {#if typeof label === "string"}
    {label}
  {:else}
    {@render label(variant)}
  {/if}
{/snippet}
