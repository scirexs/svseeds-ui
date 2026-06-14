<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface SortableGroupProps {
    children: Snippet;
    group?: SortableGroupController; // reuse an externally created controller
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  `SortableGroup` is children-only: render two or more `<Sortable>` children inside it.
  Descendant Sortables without a `group` prop resolve the shared controller from context.
  When `group` is omitted, `variant` and `styling` are inherited by neutral descendants.
  When `group` is provided, that external controller's own presentation is used.

  ### Anatomy
  ```svelte
  <div class="whole" role="group">
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface SortableGroupProps {
    children: Snippet;
    group?: SortableGroupController;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type SortableGroupReqdProps = "children";
  export type SortableGroupBindProps = never;

  const preset = "svs-sortable-group";

  import { type Snippet } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
  import { createSortableGroup, _setSortableContext, type SortableGroupController } from "./_Sortable.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, group, styling, variant = VARIANT.NEUTRAL }: SortableGroupProps = $props();

  const cls = $derived(fnClass(preset, styling));
  const ctxVariant = $derived(variant);
  const ctxStyling = $derived(styling);
  // svelte-ignore state_referenced_locally
  const controller = group ?? createSortableGroup({
    get variant() {
      return ctxVariant;
    },
    get styling() {
      return ctxStyling;
    },
  });

  _setSortableContext(controller);
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group">
  {@render children()}
</div>
