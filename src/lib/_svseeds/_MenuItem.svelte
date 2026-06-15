<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuItemProps extends Omit<HTMLButtonAttributes, "children" | "type" | "role" | "disabled" | "onselect"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-activatable
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to <button> via ...rest; `class` is merged onto root
    // type, role, tabindex, aria-disabled, and onclick are component-owned
  }
  ```
  ### Embedded
  Placed inside a `ContextMenu`, `variant` defaults to the menu's and `styling` falls back to it; activating the item closes the menu after `onselect`.
  ### Anatomy
  ```svelte
  <button class="whole" {...rest} type="button" role="menuitem" tabindex="-1" aria-disabled>
    {children}
  </button>
  ```
-->
<script module lang="ts">
  export interface MenuItemProps extends Omit<HTMLButtonAttributes, "children" | "type" | "role" | "disabled" | "onselect"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    onselect?: (ev: MouseEvent) => void;
    disabled?: boolean; // (false) -> aria-disabled; skipped in nav; non-activatable
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuItemReqdProps = "children";
  export type MenuItemBindProps = "element";

  export interface MenuItemContext extends SVSContext {
    close(): void;
  }
  export const [_getMenuItemContext, _setMenuItemContext] = _createContext<MenuItemContext>();

  export const _MENU_ITEM_PRESET = "svs-menu-item";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, type SVSContext, VARIANT, PARTS, fnClass, _createContext } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, onselect, disabled = false, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuItemProps = $props();
  const ctx = _getMenuItemContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(_MENU_ITEM_PRESET, styling ?? ctx?.styling));
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
