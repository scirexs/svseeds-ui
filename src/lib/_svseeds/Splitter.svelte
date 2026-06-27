<!--
  @component
  ### Usage
  Use standalone. The consumer supplies layout CSS that matches `orientation`; Splitter ships no layout CSS and only emits the first-pane size, e.g. `display:flex` with `flex-basis: var(--svs-splitter)`.
  ```svelte
  <Splitter {left} {right} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "style"> {
    left: Snippet<[string]>; // Snippet<[variant]>
    right: Snippet<[string]>; // Snippet<[variant]>
    children?: Snippet<[number, string]>; // Snippet<[value,variant]>
    orientation?: "horizontal" | "vertical"; // ("horizontal")
    value?: number; // bindable (50)
    min?: number; // (0)
    max?: number; // (100)
    step?: number; // (1)
    snap?: number[]; // pointer-drag snap targets, within 3 percentage points
    label?: string;
    cssvar?: Partial<Record<SplitterCssVar, string>>;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLAttributes are passed to the root <div> via ...rest (class is merged onto root)
    // role and style are component-owned
  }
  type SplitterCssVar = "position"; // cssvar value is the full --name emitted with the first-pane percentage; default --svs-splitter
  ```
  ### Anatomy
  ```svelte
  <div class="whole" {...rest} style data-orientation data-dragging>
    <div class="left" id>{left}</div>
    <div class="main" role="separator" tabindex="0" aria-controls aria-orientation aria-valuenow aria-valuemin aria-valuemax aria-label>
      {children}
    </div>
    <div class="right">{right}</div>
  </div>
  ```
  ### Behavior
  `orientation` drives the drag axis and arrow-key model: horizontal uses `clientX` / Left / Right, vertical uses `clientY` / Up / Down. The root emits a renameable first-pane size custom property (`--svs-splitter` by default, or `cssvar.position`) and exposes `data-orientation`; `data-dragging` is present only during an active pointer drag. Arrow keys move by `step`, Home moves to `min`, End moves to `max`, and keyboard movement clamps without snap. Pointer drag clamps and snaps to the nearest `snap` target within 3 percentage points. `aria-orientation` is perpendicular to layout orientation because it describes the separator bar itself: a left|right split has a vertical separator.
-->
<script module lang="ts">
  export interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "style"> {
    left: Snippet<[string]>; // Snippet<[variant]>
    right: Snippet<[string]>; // Snippet<[variant]>
    children?: Snippet<[number, string]>; // Snippet<[value,variant]>
    orientation?: "horizontal" | "vertical"; // ("horizontal")
    value?: number; // bindable (50)
    min?: number; // (0)
    max?: number; // (100)
    step?: number; // (1)
    snap?: number[]; // pointer-drag snap targets, within 3 percentage points
    label?: string;
    cssvar?: Partial<Record<SplitterCssVar, string>>; // custom-property name emitted with the first-pane percentage
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type SplitterReqdProps = "left" | "right";
  export type SplitterBindProps = "value" | "element";
  export type SplitterCssVar = "position";

  export const _SPLITTER_PRESET = "svs-splitter";

  const SNAP_THRESHOLD = 3;

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, _cssVar } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes, KeyboardEventHandler, PointerEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { left, right, children, orientation = "horizontal", value = $bindable(50), min = 0, max = 100, step = 1, snap, label, cssvar, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: SplitterProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_SPLITTER_PRESET, styling));
  const uid = $props.id();
  const paneId = `${uid}-left`;
  const rmin = $derived(min > max ? max : min);
  const rmax = $derived(min > max ? min : max);
  const posVar = $derived(_cssVar(cssvar, "position", "--svs-splitter"));
  const style = $derived(`${posVar}: ${value}%`);
  const ariaOrientation = $derived(orientation === "vertical" ? "horizontal" : "vertical");
  type Drag = { left: number; top: number; width: number; height: number };

  // *** States *** //
  let dragging = $state(false);
  let drag = $state<Drag>();

  function clamp(v: number): number {
    return Math.min(Math.max(v, rmin), rmax);
  }
  function sync() {
    const next = clamp(value);
    if (next !== value) value = next;
  }
  function applySnap(v: number): number {
    if (!snap?.length) return v;
    const target = snap.reduce((best, point) => (Math.abs(point - v) < Math.abs(best - v) ? point : best), snap[0]);
    return Math.abs(target - v) <= SNAP_THRESHOLD ? clamp(target) : v;
  }
  function pctFromEvent(ev: PointerEvent): number {
    if (!drag) return value;
    const span = orientation === "vertical" ? drag.height : drag.width;
    if (span <= 0) return value;
    const offset = orientation === "vertical" ? ev.clientY - drag.top : ev.clientX - drag.left;
    return (offset / span) * 100;
  }
  function finish(node: HTMLDivElement, id: number) {
    node.hasPointerCapture?.(id) ? node.releasePointerCapture(id) : undefined;
    dragging = false;
    drag = undefined;
  }

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    value;
    rmin;
    rmax;
    untrack(() => sync());
  });

  // *** Event Handlers *** //
  const hpointerdown: PointerEventHandler<HTMLDivElement> = (ev) => {
    if (ev.button !== 0 || !element) return;
    const rect = element.getBoundingClientRect();
    drag = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    dragging = true;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  };
  const hpointermove: PointerEventHandler<HTMLDivElement> = (ev) => {
    if (!dragging) return;
    value = applySnap(clamp(pctFromEvent(ev)));
  };
  const hpointerup: PointerEventHandler<HTMLDivElement> = (ev) => {
    if (dragging) finish(ev.currentTarget, ev.pointerId);
  };
  const hkeydown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    let next: number | undefined;
    if (ev.key === "Home") next = rmin;
    else if (ev.key === "End") next = rmax;
    else if (orientation === "vertical" && ev.key === "ArrowUp") next = value - step;
    else if (orientation === "vertical" && ev.key === "ArrowDown") next = value + step;
    else if (orientation !== "vertical" && ev.key === "ArrowLeft") next = value - step;
    else if (orientation !== "vertical" && ev.key === "ArrowRight") next = value + step;
    if (next === undefined) return;
    ev.preventDefault();
    value = clamp(next);
  };
</script>

<!---------------------------------------->

<div
  bind:this={element}
  class={[cls(PARTS.WHOLE, variant), c]}
  {...rest}
  {style}
  data-orientation={orientation}
  data-dragging={dragging ? "" : undefined}
  {@attach attach}
>
  <div class={cls(PARTS.LEFT, variant)} id={paneId}>{@render left(variant)}</div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (WAI-ARIA Window Splitter uses a focusable, keyboard-draggable separator.) -->
  <div
    class={cls(PARTS.MAIN, variant)}
    role="separator"
    tabindex="0"
    aria-controls={paneId}
    aria-orientation={ariaOrientation}
    aria-valuenow={Math.round(value)}
    aria-valuemin={rmin}
    aria-valuemax={rmax}
    aria-label={label}
    onpointerdown={hpointerdown}
    onpointermove={hpointermove}
    onpointerup={hpointerup}
    onpointercancel={hpointerup}
    onlostpointercapture={hpointerup}
    onkeydown={hkeydown}
  >
    {@render children?.(value, variant)}
  </div>
  <div class={cls(PARTS.RIGHT, variant)}>{@render right(variant)}</div>
</div>
