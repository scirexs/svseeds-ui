<!--
  @component
  ### Usage
  Wrap two or more `Sortable` children to connect them.
  ```svelte
  <SortableGroup {...props}>
    <Sortable {...props} />
    <Sortable {...props} />
  </SortableGroup>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface SortableGroupProps {
    children: Snippet;
    group?: SortableGroupController; // reuse an externally created controller
    duration?: number; // (300) group motion duration
    easing?: EasingFunction; // (cubicOut) group motion easing
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  `SortableGroup` is children-only: render two or more `<Sortable>` children inside it.
  Descendant Sortables without a `group` prop resolve the shared controller from context.
  When `group` is omitted, `variant` and `styling` are inherited by neutral descendants.
  When `group` is provided, that external controller's own presentation is used.
  Group motion defaults to `300ms` / `cubicOut`; reduced motion resolves duration to `0`.

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
    duration?: number;
    easing?: EasingFunction;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type SortableGroupReqdProps = "children";
  export type SortableGroupBindProps = never;

  export const _SORTABLE_GROUP_PRESET = "svs-sortable-group";

  import { VARIANT, PARTS, fnClass } from "./_core";
  import { createSortableGroup, _setSortableContext } from "./Sortable.svelte";
  import type { Snippet } from "svelte";
  import type { EasingFunction } from "svelte/transition";
  import type { SVSClass, SVSVariant } from "./_core";
  import type { SortableGroupController } from "./Sortable.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, group, duration, easing, styling, variant = VARIANT.NEUTRAL }: SortableGroupProps = $props();

  const cls = $derived(fnClass(_SORTABLE_GROUP_PRESET, styling));
  const ctxVariant = $derived(variant);
  const ctxStyling = $derived(styling);
  // svelte-ignore state_referenced_locally
  const controller =
    group ??
    createSortableGroup(
      {
        get variant() {
          return ctxVariant;
        },
        get styling() {
          return ctxStyling;
        },
      },
      { duration, easing },
    );

  _setSortableContext(controller);
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group">
  {@render children()}
</div>
