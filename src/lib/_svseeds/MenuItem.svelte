<!--
  @component
  ### Usage
  Use inside `MenuList`.
  ```svelte
  <MenuList>
    <MenuItem {...props}>Item</MenuItem>
  </MenuList>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuItemProps extends Omit<HTMLButtonAttributes & HTMLAnchorAttributes, "children" | "type" | "role" | "disabled" | "onselect"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    href?: string; // renders <a> instead of <button>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-activatable
    attach?: Attachment<HTMLButtonElement | HTMLAnchorElement>;
    element?: HTMLButtonElement | HTMLAnchorElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other button/anchor attributes are passed via ...rest; `class` is merged onto root
    // type, href, role, tabindex, aria-disabled, and onclick are component-owned
  }
  ```
  ### Anatomy
  ```svelte
  {#if href}
    <a class="whole" {...rest} href role="menuitem" tabindex="-1" aria-disabled>{children}</a>
  {:else}
    <button class="whole" {...rest} type="button" role="menuitem" tabindex="-1" aria-disabled>{children}</button>
  {/if}
  ```
  ### Behavior
  When embedded in `MenuList`, `variant` defaults to the menu's and `styling` falls back to it; activating the item closes the menu after `onselect`. The context can also carry the menu `orientation` for related descendants. Disabled anchor items are non-navigable.
-->
<script module lang="ts">
  export interface MenuItemProps extends Omit<
    HTMLButtonAttributes & HTMLAnchorAttributes,
    "children" | "type" | "role" | "disabled" | "onselect"
  > {
    children: Snippet<[string]>; // Snippet<[variant]>
    href?: string; // renders <a> instead of <button>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-activatable
    attach?: Attachment<HTMLButtonElement | HTMLAnchorElement>;
    element?: HTMLButtonElement | HTMLAnchorElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuItemReqdProps = "children";
  export type MenuItemBindProps = "element";

  export interface MenuItemContext extends SVSContext {
    close(): void;
    orientation?: "horizontal" | "vertical";
  }
  export const [_getMenuItemContext, _setMenuItemContext] = _createContext<MenuItemContext>();

  export const _MENU_ITEM_PRESET = "svs-menu-item";

  import { VARIANT, PARTS, _fnClass, _createContext } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, href, type: _type, onselect, disabled = false, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuItemProps & { type?: unknown } = $props();
  const ctx = _getMenuItemContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_MENU_ITEM_PRESET, styling ?? ctx?.styling));
  const effVariant = $derived(ctx ? ctx.variant : variant);

  // *** Event Handlers *** //
  const hclick = (ev: MouseEvent) => {
    if (disabled) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    onselect?.(ev);
    ctx?.close();
  };
</script>

<!---------------------------------------->

{#if href}
  <a
    bind:this={element}
    class={[cls(PARTS.WHOLE, effVariant), c]}
    {...rest}
    {href}
    role="menuitem"
    tabindex="-1"
    aria-disabled={disabled || undefined}
    onclick={hclick}
    {@attach attach}
  >
    {@render children(effVariant)}
  </a>
{:else}
  <button
    bind:this={element}
    class={[cls(PARTS.WHOLE, effVariant), c]}
    {...rest}
    type="button"
    role="menuitem"
    tabindex="-1"
    aria-disabled={disabled || undefined}
    onclick={hclick}
    {@attach attach}
  >
    {@render children(effVariant)}
  </button>
{/if}
