<!--
  @component
  ### Usage
  Use inside `MenuList`, grouping `MenuItem`s.
  ```svelte
  <MenuList>
    <MenuGroup label="Group" {...props}>
      <MenuItem {...props}>Item</MenuItem>
    </MenuGroup>
  </MenuList>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    children: Snippet<[string]>; // Snippet<[variant]>; grouped MenuItems
    label: string | Snippet<[string]>; // required accessible name, rendered and referenced by aria-labelledby
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // role and aria-labelledby are component-owned
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} role="group" aria-labelledby={uid}>
    <div id={uid} class="label">{label}</div>
    {children}
  </div>
  ```
  ### Behavior
  When embedded in `MenuList`, `variant` defaults to the menu's and `styling` falls back to it; local `styling` wins.
-->
<script module lang="ts">
  export interface MenuGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    children: Snippet<[string]>; // Snippet<[variant]>; grouped MenuItems
    label: string | Snippet<[string]>; // required accessible name, rendered and referenced by aria-labelledby
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuGroupReqdProps = "children" | "label";
  export type MenuGroupBindProps = "element";

  export const _MENU_GROUP_PRESET = "svs-menu-group";

  import { VARIANT, PARTS, fnClass } from "./_core";
  import { _getMenuItemContext } from "./MenuItem.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, label, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuGroupProps = $props();
  const ctx = _getMenuItemContext();
  const uid = $props.id();

  // *** Initialize *** //
  const cls = $derived(fnClass(_MENU_GROUP_PRESET, styling ?? ctx?.styling));
  const effVariant = $derived(ctx ? ctx.variant : variant);
</script>

<!---------------------------------------->

<div bind:this={element} class={[cls(PARTS.WHOLE, effVariant), c]} {...rest} role="group" aria-labelledby={uid} {@attach attach}>
  <div id={uid} class={cls(PARTS.LABEL, effVariant)}>
    {#if typeof label === "string"}
      {label}
    {:else}
      {@render label(effVariant)}
    {/if}
  </div>
  {@render children(effVariant)}
</div>
