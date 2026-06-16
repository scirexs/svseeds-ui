<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface WheelPickerProps extends Omit<HTMLSelectAttributes, "value" | "multiple" | "size" | "style"> {
    options: WheelOption[];
    value?: string; // bindable (first enabled option's value)
    loop?: boolean; // (false) visual-only circular scroll
    perspective?: number; // px
    maxAngle?: number; // deg (60)
    label?: Snippet<[WheelOption, string, number]>; // Snippet<[option,variant,index]>
    cssvar?: Partial<Record<WheelCssVar, string>>;
    attach?: Attachment<HTMLSelectElement>;
    element?: HTMLSelectElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class is merged onto .whole; style is component-owned (omitted)
  }
  type WheelOption = { value: string; text: string; disabled?: boolean };
  type WheelCssVar = "itemHeight" | "visible" | "perspective" | "maxAngle";
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    &lt;!-- sr-only; source of truth --&gt;
    <select class="main" {...rest}>
      {#each options as o}
        <option value={o.value} disabled={o.disabled}>{o.text}</option>
      {/each}
    </select>
    &lt;!-- perspective / clip container --&gt;
    <div class="middle" aria-hidden="true">
      {#each options as o, i}
        <div class="label">{label ?? o.text}</div>
      {/each}
    </div>
    &lt;!-- center selection band --&gt;
    <div class="aux" aria-hidden="true"></div>
    &lt;!-- top+bottom fade --&gt;
    <div class="extra" aria-hidden="true"></div>
  </div>
  ```
  ### Behavior
  - The sr-only `<select>` is the source of truth: focus, arrow keys, typeahead, change, and
    `name` submission stay native; it remains focusable through clip-based hiding.
  - `.middle` is the decorative drum: it is `aria-hidden`, pointer/wheel gestures write
    `selectedIndex` to the select, item height is measured, and visible row count is derived.
  - `loop` wraps `selectedIndex` modularly with seam clones; the `<select>` itself never loops.
  - `cssvar` mirrors named keys onto `.whole` only.
-->
<script module lang="ts">
  export interface WheelPickerProps extends Omit<HTMLSelectAttributes, "value" | "multiple" | "size" | "style"> {
    options: WheelOption[];
    value?: string;
    loop?: boolean;
    perspective?: number;
    maxAngle?: number;
    label?: Snippet<[WheelOption, string, number]>;
    cssvar?: Partial<Record<WheelCssVar, string>>;
    attach?: Attachment<HTMLSelectElement>;
    element?: HTMLSelectElement;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type WheelPickerReqdProps = "options";
  export type WheelPickerBindProps = "value" | "element";
  export type WheelOption = { value: string; text: string; disabled?: boolean };
  export type WheelCssVar = "itemHeight" | "visible" | "perspective" | "maxAngle";

  export const _WHEELPICKER_PRESET = "svs-wheelpicker";

  import { type Snippet, tick, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLSelectAttributes, type ChangeEventHandler, type PointerEventHandler, type WheelEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, SR_ONLY, fnClass, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, value = $bindable(), loop = false, perspective, maxAngle = 60, label, cssvar, onchange, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: WheelPickerProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_WHEELPICKER_PRESET, styling));
  const firstEnabled = $derived(options.find((o) => !o.disabled)?.value ?? options[0]?.value ?? "");
  const attrs = $derived.by(() => {
    const { multiple, size, style, hidden, "aria-hidden": ariaHidden, ...a } = rest as Record<string, unknown>;
    multiple;
    size;
    style;
    hidden;
    ariaHidden;
    return a;
  });
  // svelte-ignore state_referenced_locally
  if (value === undefined) value = firstEnabled;

  const selected = $derived(options.findIndex((o) => o.value === value));
  const itemVariant = (i: number): string => (i === selected ? VARIANT.ACTIVE : options[i]?.disabled ? VARIANT.INACTIVE : variant);

  // *** States *** //
  let whole: HTMLDivElement | undefined = $state();
  let middle: HTMLDivElement | undefined = $state();
  let itemH = $state(0);
  let wholeH = $state(0);
  let pos = $state(0);
  let startY = 0;
  let startPos = 0;
  let dragging = false;
  let program = false;
  let raf: number | undefined;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;

  // *** Reactive Handlers *** //
  const visible = $derived(Math.max(1, itemH > 0 && wholeH > 0 ? Math.round(wholeH / itemH) : 1));
  const middleStyle = $derived.by(() => {
    const base = "position: relative; overflow: hidden; touch-action: none;";
    if (perspective == null) return base;
    return `${base} perspective: ${perspective}px;`;
  });
  const mirror = $derived.by(() => {
    if (!cssvar) return undefined;
    const px = (n?: number) => (n == null ? undefined : `${n}px`);
    const pairs: [string | undefined, string | undefined][] = [
      [cssvar.itemHeight, px(itemH)],
      [cssvar.visible, visible == null ? undefined : `${visible}`],
      [cssvar.perspective, px(perspective)],
      [cssvar.maxAngle, maxAngle == null ? undefined : `${maxAngle}deg`],
    ];
    const css = pairs
      .filter(([n, v]) => n && v != null)
      .map(([n, v]) => `${n}: ${v}`)
      .join("; ");
    return css || undefined;
  });
  const shown = $derived.by(() => {
    const base = options.map((option, index) => ({ option, index, virtual: index, key: `main-${option.value}-${index}` }));
    if (!loop || options.length < 2) return base;
    const n = Math.min(options.length, Math.max(1, visible));
    const head = options.slice(-n).map((option, offset) => {
      const index = options.length - n + offset;
      return { option, index, virtual: -n + offset, key: `head-${option.value}-${index}` };
    });
    const tail = options.slice(0, n).map((option, index) => ({ option, index, virtual: options.length + index, key: `tail-${option.value}-${index}` }));
    return [...head, ...base, ...tail];
  });

  $effect(() => {
    options;
    untrack(() => measure());
  });
  $effect(() => {
    whole;
    return untrack(() => observe());
  });
  $effect(() => {
    return () => cleanup();
  });
  $effect.pre(() => {
    selected;
    untrack(() => sync());
  });

  function measure() {
    tick().then(() => {
      const row = middle?.querySelector(`.${PARTS.LABEL}`) as HTMLElement | null;
      const rect = row?.getBoundingClientRect();
      itemH = rect?.height || row?.offsetHeight || 0;
      wholeH = whole?.getBoundingClientRect().height || whole?.offsetHeight || 0;
    });
  }
  function observe() {
    if (!whole || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(whole);
    return () => ro.disconnect();
  }
  function cleanup() {
    if (raf !== undefined && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    if (wheelTimer) clearTimeout(wheelTimer);
  }
  function sync() {
    if (selected < 0 || program) return;
    animate(selected);
  }

  // *** Event Handlers *** //
  const hchange: ChangeEventHandler<HTMLSelectElement> = (ev) => {
    value = ev.currentTarget.value;
    if (!program) animate(ev.currentTarget.selectedIndex);
    onchange?.(ev);
  };
  const hpointerdown: PointerEventHandler<HTMLDivElement> = (ev) => {
    element?.focus();
    dragging = true;
    startY = ev.clientY;
    startPos = pos;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const hpointermove: PointerEventHandler<HTMLDivElement> = (ev) => {
    if (!dragging) return;
    const unit = itemH || 1;
    pos = normalize(startPos - (ev.clientY - startY) / unit);
  };
  const hpointerup: PointerEventHandler<HTMLDivElement> = (ev) => {
    if (!dragging) return;
    dragging = false;
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    snap();
  };
  const hwheel: WheelEventHandler<HTMLDivElement> = (ev) => {
    if (!options.length) return;
    ev.preventDefault();
    element?.focus();
    pos = normalize(pos + Math.sign(ev.deltaY || 0));
    if (wheelTimer) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => snap(), 120);
  };

  function animate(to: number) {
    if (to < 0) return;
    const next = normalize(to);
    if (reduced() || typeof requestAnimationFrame === "undefined") return jump(next);
    if (raf !== undefined) cancelAnimationFrame(raf);
    const from = pos;
    const start = performance.now();
    const step = (now: number) => {
      const rate = Math.min(1, (now - start) / 120);
      pos = from + (next - from) * (1 - Math.pow(1 - rate, 3));
      if (rate < 1) raf = requestAnimationFrame(step);
      else jump(next);
    };
    raf = requestAnimationFrame(step);
  }
  function jump(to: number) {
    pos = normalize(to);
  }
  function reduced() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return shouldReduceMotion();
  }
  function snap() {
    const index = nearest(Math.round(pos));
    if (index == null || !element) return;
    program = true;
    jump(index);
    element.selectedIndex = index;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    program = false;
  }
  function nearest(raw: number): number | undefined {
    if (!options.length) return;
    const base = loop ? mod(raw) : clamp(raw);
    if (!options[base]?.disabled) return base;
    for (let d = 1; d < options.length; d++) {
      const before = loop ? mod(base - d) : base - d;
      if (before >= 0 && before < options.length && !options[before]?.disabled) return before;
      const after = loop ? mod(base + d) : base + d;
      if (after >= 0 && after < options.length && !options[after]?.disabled) return after;
    }
  }
  function normalize(n: number) {
    if (!options.length) return 0;
    return loop ? n : clamp(n);
  }
  function clamp(n: number) {
    return Math.min(Math.max(n, 0), Math.max(options.length - 1, 0));
  }
  function mod(n: number) {
    return ((n % options.length) + options.length) % options.length;
  }
  function labelStyle(virtual: number) {
    const d = virtual - pos;
    const base = "position: absolute; left: 0; right: 0; top: 50%;";
    if (perspective == null) return `${base} transform: translateY(calc(-50% + ${d * itemH}px));`;
    const step = maxAngle / Math.max(1, Math.floor(visible / 2));
    const angle = Math.min(Math.max(d * step, -maxAngle), maxAngle);
    const radians = (step * Math.PI) / 180;
    const radius = itemH && radians ? itemH / (2 * Math.tan(radians / 2)) : 0;
    const hidden = Math.abs(d * step) > maxAngle ? " opacity: 0; visibility: hidden;" : "";
    return `${base} transform: translateY(-50%) rotateX(${angle}deg) translateZ(${radius}px);${hidden}`;
  }
</script>

<!---------------------------------------->

<div bind:this={whole} class={[cls(PARTS.WHOLE, variant), c]} style={mirror}>
  <select
    bind:value
    bind:this={element}
    class={cls(PARTS.MAIN, variant)}
    {...(attrs as any)}
    onchange={hchange}
    style={`${SR_ONLY}pointer-events:none;`}
    aria-orientation="vertical"
    {@attach attach}
  >
    {#each options as o (o.value)}
      <option value={o.value} disabled={o.disabled}>{o.text}</option>
    {/each}
  </select>

  <div
    bind:this={middle}
    class={cls(PARTS.MIDDLE, variant)}
    style={middleStyle}
    aria-hidden="true"
    onpointerdown={hpointerdown}
    onpointermove={hpointermove}
    onpointerup={hpointerup}
    onpointercancel={hpointerup}
    onwheel={hwheel}
  >
    {#each shown as o (o.key)}
      <div class={cls(PARTS.LABEL, itemVariant(o.index))} style={labelStyle(o.virtual)}>
        {#if label}{@render label(o.option, itemVariant(o.index), o.index)}{:else}{o.option.text}{/if}
      </div>
    {/each}
  </div>

  <div class={cls(PARTS.AUX, variant)} aria-hidden="true"></div>
  <div class={cls(PARTS.EXTRA, variant)} aria-hidden="true"></div>
</div>
