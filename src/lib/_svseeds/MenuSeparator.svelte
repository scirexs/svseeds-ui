<!--
  @component
  ### Usage
  Use inside `MenuList`.
  ```svelte
  <MenuList>
    <MenuSeparator {...props} />
  </MenuList>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "aria-orientation"> {
    ariaOrientation?: "horizontal" | "vertical"; // inferred from MenuList orientation when absent
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // role and aria-orientation are component-owned
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} role="separator" aria-orientation={ariaOrientation}></div>
  ```
  ### Behavior
  When embedded in `MenuList`, `variant` defaults to the menu's and `styling` falls back to it. `ariaOrientation` is ARIA-only: by default a vertical menu renders a horizontal separator, and a horizontal menu renders a vertical separator.
-->
<script module lang="ts">
  export interface MenuSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "aria-orientation"> {
    ariaOrientation?: "horizontal" | "vertical"; // inferred from MenuList orientation when absent
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuSeparatorReqdProps = never;
  export type MenuSeparatorBindProps = "element";

  export const _MENU_SEPARATOR_PRESET = "svs-menu-separator";

  import { VARIANT, PARTS, fnClass } from "./core";
  import { _getMenuItemContext } from "./MenuItem.svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { ariaOrientation, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuSeparatorProps = $props();
  const ctx = _getMenuItemContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(_MENU_SEPARATOR_PRESET, styling ?? ctx?.styling));
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effAriaOrientation = $derived(ariaOrientation ?? (ctx?.orientation === "horizontal" ? "vertical" : "horizontal"));
</script>

<!---------------------------------------->

<div
  bind:this={element}
  class={[cls(PARTS.WHOLE, effVariant), c]}
  {...rest}
  role="separator"
  aria-orientation={effAriaOrientation}
  {@attach attach}
></div>
