<!--
  @component
  ### Usage
  Use inside `Popover` / `ContextMenu`, or standalone; fill with `MenuItem` / `MenuGroup` / `MenuSeparator`.
  ```svelte
  <MenuList {...props}>
    <MenuItem {...props}>Item</MenuItem>
  </MenuList>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; wins over `items` when both given
    items?: MenuItemData[]; // data-mode sugar; ignored when `children` is present
    orientation?: "horizontal" | "vertical"; // ("vertical")
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL); container context wins when present
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // role, tabindex, aria-orientation, and keyboard handling are component-owned
  }
  interface MenuContainerContext extends SVSContext {
    get open(): boolean;
    labelledby?: string;
    close(): void;
  }
  type MenuSeparatorData = { separator: true };
  type MenuItemEntry = {
    label: string | Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false)
  };
  type MenuItemData = MenuItemEntry | MenuSeparatorData;
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} role="menu" tabindex="-1" aria-orientation={orientation}>
    {#if children}
      {children}
    {:else if items}
      <MenuItem>{label}</MenuItem>
      <MenuSeparator />
    {/if}
  </div>
  ```
  ### Exports
  ```ts
  // Context set by menu containers and read by MenuList.
  const [_getMenuContainerContext, _setMenuContainerContext]
  // Data-mode item types.
  type MenuItemData
  type MenuItemEntry
  type MenuSeparatorData
  // Styling preset.
  const _MENU_LIST_PRESET
  ```
  ### Behavior
  Reusable `role="menu"` body. It reads an optional `MenuContainerContext` for `open`, `close`, `variant`, `styling`, and `labelledby`; standalone usage still renders and navigates, while `close()` is a no-op without a container. When the container opens, the first enabled item at this menu level is focused after `tick()`.
-->
<script module lang="ts">
  export interface MenuListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    children?: Snippet<[string]>; // Snippet<[variant]>; wins over `items` when both given
    items?: MenuItemData[]; // data-mode sugar; ignored when `children` is present
    orientation?: "horizontal" | "vertical"; // ("vertical")
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL); container context wins when present
  }
  export type MenuListReqdProps = never;
  export type MenuListBindProps = "element";

  export interface MenuContainerContext extends SVSContext {
    get open(): boolean;
    labelledby?: string;
    close(): void;
  }
  export const [_getMenuContainerContext, _setMenuContainerContext] = _createContext<MenuContainerContext>();

  export type MenuSeparatorData = { separator: true };
  export type MenuItemEntry = {
    label: string | Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false)
  };
  export type MenuItemData = MenuItemEntry | MenuSeparatorData;

  export const _MENU_LIST_PRESET = "svs-menu-list";

  function isSeparator(x: MenuItemData): x is MenuSeparatorData {
    return "separator" in x;
  }

  import { tick } from "svelte";
  import { VARIANT, PARTS, _edgeEnabledIndex, _fnClass, _nextEnabledIndex, _createContext } from "./_core";
  import MenuItem, { _MenuLevel, _setMenuItemContext } from "./MenuItem.svelte";
  import MenuSeparator from "./MenuSeparator.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes, KeyboardEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
  import type { MenuItemContext } from "./MenuItem.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, items, orientation = "vertical", attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, "aria-labelledby": albl, class: c, ...rest }: MenuListProps = $props();
  const ctx = _getMenuContainerContext();

  // *** Initialize *** //
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effStyling = $derived(styling ?? ctx?.styling);
  const cls = $derived(_fnClass(_MENU_LIST_PRESET, effStyling));
  const level = new _MenuLevel();
  const itemCtx: MenuItemContext = {
    get variant() {
      return effVariant;
    },
    get styling() {
      return effStyling;
    },
    get orientation() {
      return orientation;
    },
    level,
    close() {
      ctx?.close();
    },
  };
  _setMenuItemContext(itemCtx);

  let typeBuf = "";
  let typeTimer: ReturnType<typeof setTimeout> | undefined;

  // *** Reactive Handlers *** //
  $effect(() => {
    if (ctx?.open) tick().then(focusFirst);
  });

  // *** Menu Helpers *** //
  function menuItems(): HTMLElement[] {
    if (!element) return [];
    return [...element.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((el) => el.closest('[role="menu"]') === element);
  }
  function disabledAt(list: HTMLElement[], i: number): boolean {
    return list[i].getAttribute("aria-disabled") === "true";
  }
  function focusAt(list: HTMLElement[], i: number) {
    if (i >= 0) list[i]?.focus();
  }
  function focusFirst() {
    const list = menuItems();
    focusAt(
      list,
      _edgeEnabledIndex(list.length, "first", (i) => disabledAt(list, i)),
    );
  }
  function typeahead(ev: KeyboardEvent) {
    if (ev.key === " " || ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    typeBuf += ev.key.toLowerCase();
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => (typeBuf = ""), 500);
    const hit = menuItems().find(
      (el) => el.getAttribute("aria-disabled") !== "true" && (el.textContent ?? "").trim().toLowerCase().startsWith(typeBuf),
    );
    hit?.focus();
  }

  // *** Event Handlers *** //
  const hkeydown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    if ((ev.target as HTMLElement | null)?.closest('[role="menu"]') !== element) return;
    const list = menuItems();
    const cur = list.indexOf(document.activeElement as HTMLElement);
    const dis = (i: number) => disabledAt(list, i);
    const [nextKey, prevKey] = orientation === "horizontal" ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
    switch (ev.key) {
      case nextKey:
        ev.preventDefault();
        focusAt(list, cur < 0 ? _edgeEnabledIndex(list.length, "first", dis) : _nextEnabledIndex(list.length, cur, 1, dis));
        return;
      case prevKey:
        ev.preventDefault();
        focusAt(list, cur < 0 ? _edgeEnabledIndex(list.length, "last", dis) : _nextEnabledIndex(list.length, cur, -1, dis));
        return;
      case "Home":
        ev.preventDefault();
        focusAt(list, _edgeEnabledIndex(list.length, "first", dis));
        return;
      case "End":
        ev.preventDefault();
        focusAt(list, _edgeEnabledIndex(list.length, "last", dis));
        return;
      case "Tab":
        ev.preventDefault();
        ctx?.close();
        return;
      default:
        typeahead(ev);
    }
  };
</script>

<!---------------------------------------->

<div
  bind:this={element}
  class={[cls(PARTS.WHOLE, effVariant), c]}
  {...rest}
  role="menu"
  tabindex="-1"
  aria-labelledby={ctx?.labelledby ?? albl}
  aria-orientation={orientation}
  onkeydown={hkeydown}
  {@attach attach}
>
  {#if children}
    {@render children(effVariant)}
  {:else if items && items.length > 0}
    {#each items as item, i (i)}
      {#if isSeparator(item)}
        <MenuSeparator />
      {:else}
        {#snippet label(v: string)}
          {@render labelContent(item.label, v)}
        {/snippet}
        <MenuItem onselect={item.onselect} disabled={item.disabled} children={label} />
      {/if}
    {/each}
  {/if}
</div>

{#snippet labelContent(label: string | Snippet<[string]>, v: string)}
  {#if typeof label === "string"}
    {label}
  {:else}
    {@render label(v)}
  {/if}
{/snippet}
