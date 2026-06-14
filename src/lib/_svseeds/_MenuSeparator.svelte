<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface MenuSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // role and aria-orientation are component-owned
  }
  ```
  ### Embedded
  Placed inside a `ContextMenu`, `variant` defaults to the menu's and `styling` falls back to it.
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} role="separator" aria-orientation="horizontal"></div>
  ```
-->
<script module lang="ts">
  export interface MenuSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type MenuSeparatorReqdProps = never;
  export type MenuSeparatorBindProps = "element";

  const preset = "svs-menu-separator";

  import { type Attachment } from "svelte/attachments";
  import { type HTMLAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
  import { _getMenuItemContext } from "./_MenuItem.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: MenuSeparatorProps = $props();
  const ctx = _getMenuItemContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling ?? ctx?.styling));
  const effVariant = $derived(ctx ? ctx.variant : variant);
</script>

<!---------------------------------------->

<div
  bind:this={element}
  class={[cls(PARTS.WHOLE, effVariant), c]}
  {...rest}
  role="separator"
  aria-orientation="horizontal"
  {@attach attach}
></div>
