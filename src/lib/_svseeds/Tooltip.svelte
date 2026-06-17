<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TooltipParams {
    text?: string;
    content?: Snippet<[string, SVSVariant, boolean]>; // Snippet<[text, variant, flipped]>
    position?: Position; // ("top")
    align?: Align; // ("center")
    offset?: Vector; // ({ x: 0, y: 0 })
    delay?: number; // (1000; 0 = immediate, negative = 1000)
    cursor?: boolean; // (false)
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  type TooltipDefaults = Omit<TooltipParams, "text" | "content">;
  type Vector = { x: number, y: number };
  type Position = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";
  ```
  ### Anatomy
  The internal renderer auto-mounts to `document.body` on first hover. Do not place it manually.
  ```svelte
  <div class="whole" role="tooltip">
    {#if content}
      {content(text, variant, flipped)}
    {:else}
      {text}
    {/if}
  </div>
  ```
  ### Exports
  ```ts
  // Attachment factory for standard HTML elements (`{@attach tooltip(params)}`)
  // and SvSeeds components (`attach={tooltip(params)}`).
  function tooltip(params: TooltipParams): Attachment<HTMLElement>

  // Sets library-wide defaults. Callable repeatedly; last call wins per key.
  function initTooltip(defaults: Partial<TooltipDefaults>): void
  ```
-->
<script module lang="ts">
  export interface TooltipParams {
    text?: string;
    content?: Snippet<[string, SVSVariant, boolean]>;
    position?: Position;
    align?: Align;
    offset?: Vector;
    delay?: number;
    cursor?: boolean;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type TooltipDefaults = Omit<TooltipParams, "text" | "content">;
  export type Vector = { x: number; y: number };
  export type Position = "top" | "right" | "bottom" | "left";
  export type Align = "start" | "center" | "end";

  export function tooltip(params: TooltipParams): Attachment<HTMLElement> {
    return (node) => {
      const p = resolve(params);
      const text = params.text;
      if (typeof text === "string" && text.length > 0) node.ariaDescription = text;
      const unlisten = on(node, "pointerenter", (ev) => {
        ensureMounted();
        core.beginShow(node, ev, p);
      });
      return () => {
        unlisten();
        core.hide();
      };
    };
  }
  export function initTooltip(d: Partial<TooltipDefaults>): void {
    defaults = { ...defaults, ...d };
  }

  type valueof<T> = T[keyof T];
  type Unlisten = () => void;
  type ResolvedTooltipParams = Required<Omit<TooltipDefaults, "styling">> & {
    text: string;
    content?: Snippet<[string, SVSVariant, boolean]>;
    styling?: SVSClass;
  };
  export const _TOOLTIP_PRESET = "svs-tooltip";
  const INIT_VEC = { x: 0, y: 0 };
  const DEFAULT_DELAY = 1000;
  const VISIBLE = {
    NONE: 0,
    HIDDEN: 1,
    VISIBLE: 2,
  } as const;

  let defaults: TooltipDefaults = {
    position: "top",
    align: "center",
    offset: { ...INIT_VEC },
    delay: DEFAULT_DELAY,
    cursor: false,
    variant: VARIANT.NEUTRAL,
    styling: undefined,
  };
  let mounted = false;

  function resolve(params: TooltipParams): ResolvedTooltipParams {
    const delay = params.delay ?? defaults.delay ?? DEFAULT_DELAY;
    const offset = params.offset ?? defaults.offset ?? INIT_VEC;
    return {
      text: params.text ?? "",
      content: params.content,
      position: params.position ?? defaults.position ?? "top",
      align: params.align ?? defaults.align ?? "center",
      offset: { x: offset.x, y: offset.y },
      delay: delay < 0 ? DEFAULT_DELAY : delay,
      cursor: params.cursor ?? defaults.cursor ?? false,
      variant: params.variant ?? defaults.variant ?? VARIANT.NEUTRAL,
      styling: params.styling ?? defaults.styling,
    };
  }
  function ensureMounted() {
    if (mounted || typeof document === "undefined") return;
    mount(TooltipRoot, { target: document.body });
    mounted = true;
  }

  class TooltipCore {
    static #INTERVAL = 20;
    text = $state("");
    content = $state<Snippet<[string, SVSVariant, boolean]> | undefined>();
    variant = $state<SVSVariant>(VARIANT.NEUTRAL);
    styling = $state<SVSClass | undefined>();
    flipped = $state(false);
    visible: valueof<typeof VISIBLE> = $state(VISIBLE.NONE);
    #tid: ReturnType<typeof setTimeout> | undefined;
    #listeners: Unlisten[] = [];
    #position = new TooltipPosition();
    #storedPosition: Position = "top";
    #storedAlign: Align = "center";
    #storedOffset: Vector = { ...INIT_VEC };

    beginShow(node: HTMLElement, ev: PointerEvent, p: ResolvedTooltipParams) {
      this.#position.setAnchor(ev, node, p.cursor);
      this.#storedPosition = p.position;
      this.#storedAlign = p.align;
      this.#storedOffset = { ...p.offset };
      this.#show(p);
      this.#listeners.push(on(node, "pointercancel", () => this.hide()));
      this.#listeners.push(on(node, "pointerleave", () => this.hide()));
      if (p.cursor) this.#listeners.push(on(node, "pointermove", this.#setMove()));
    }
    computePoint(size: Vector): Vector {
      this.#position.setPoint(this.#storedPosition, this.#storedAlign, size, this.#storedOffset);
      this.flipped = this.#position.isFlipped;
      return this.#position.point;
    }
    hide() {
      clearTimeout(this.#tid);
      this.#tid = undefined;
      this.visible = VISIBLE.NONE;
      this.#listeners.forEach((x) => x());
      this.#listeners = [];
    }
    #show(p: ResolvedTooltipParams) {
      this.hide();
      this.#prep(p);
      this.#tid = setTimeout(() => (this.visible = VISIBLE.VISIBLE), p.delay);
    }
    #prep(p: ResolvedTooltipParams) {
      this.text = p.text;
      this.content = p.content;
      this.variant = p.variant;
      this.styling = p.styling;
      this.visible = VISIBLE.HIDDEN;
    }
    #setMove(): (ev: PointerEvent) => void {
      return throttle(TooltipCore.#INTERVAL, (ev) => {
        if (this.visible === VISIBLE.VISIBLE) return;
        this.#position.trackCursor(ev);
      });
    }
  }
  class TooltipPosition {
    #cursor = false;
    #anchor: Vector = INIT_VEC;
    #rect: DOMRect | undefined;
    #position: Position = "top";
    #align: Align = "center";
    #size: Vector = INIT_VEC;
    #offset: Vector = INIT_VEC;
    #isVertical = false;
    point: Vector = INIT_VEC;
    isFlipped = false;

    setAnchor(ev: PointerEvent, node: HTMLElement, cursor?: boolean) {
      this.#cursor = Boolean(cursor);
      if (cursor) return this.trackCursor(ev);
      this.#rect = node.getBoundingClientRect();
      this.#anchor = { x: this.#rect.x, y: this.#rect.y };
    }
    trackCursor(ev: PointerEvent) {
      this.#anchor.x = ev.clientX;
      this.#anchor.y = ev.clientY;
    }
    setPoint(position: Position, align: Align, size: Vector, offset: Vector) {
      this.#prep(position, align, size, offset);
      const point = { x: this.#getPoint(false, false), y: this.#getPoint(true, false) };
      const adj = this.#getOnScreenPoint(point);
      this.#setOnScreenPoint(point, adj);
    }
    #prep(position: Position, align: Align, size: Vector, offset: Vector) {
      this.#position = position;
      this.#align = align;
      this.#size = size;
      this.#offset = offset;
      this.#isVertical = ["top", "bottom"].includes(position);
    }
    #setOnScreenPoint(point: Vector, adj: Vector) {
      const [main, sub]: [keyof Vector, keyof Vector] = this.#isVertical ? ["y", "x"] : ["x", "y"];
      this.isFlipped = !Number.isNaN(adj[main]);
      if (!Number.isNaN(adj[sub])) point[sub] = adj[sub];
      if (this.isFlipped) point[main] = this.#getPoint(this.#isVertical, true);
      this.point = point;
    }
    #getPoint(y: boolean, flipped: boolean): number {
      const len = this.#getElemLength(y, flipped);
      const base = y ? this.#anchor.y : this.#anchor.x;
      const c = y ? this.#offset.y * (flipped ? -1 : 1) : this.#offset.x * (flipped ? -1 : 1);
      return base + len - this.#baseOffset(y, flipped) + c;
    }
    #getElemLength(y: boolean, flipped: boolean): number {
      if (this.#cursor) return this.#getCursorAdjust(y, this.#flippedPosition(flipped));
      if (!this.#rect) return 0;
      switch (this.#flippedPosition(flipped)) {
        case "bottom":
          if (y) return this.#rect.height;
        case "top":
          if (y || this.#align === "start") return 0;
          return this.#align === "end" ? this.#rect.width : this.#rect.width / 2;
        case "right":
          if (!y) return this.#rect.width;
        case "left":
          if (!y || this.#align === "start") return 0;
          return this.#align === "end" ? this.#rect.height : this.#rect.height / 2;
      }
    }
    #getCursorAdjust(y: boolean, position: Position): number {
      if (y && position === "bottom") return 1;
      if (!y && position === "right") return 1;
      return 0;
    }
    #flippedPosition(flipped: boolean): Position {
      if (!flipped) return this.#position;
      if (this.#isVertical) {
        return this.#position === "top" ? "bottom" : "top";
      } else {
        return this.#position === "left" ? "right" : "left";
      }
    }
    #baseOffset(y: boolean, flipped: boolean): number {
      return this.#isVertical === y ? this.#getPositionBaseOffset(this.#flippedPosition(flipped)) : this.#getAlignBaseOffset();
    }
    #getPositionBaseOffset(position: Position): number {
      if (["bottom", "right"].includes(position)) return 0;
      return position === "top" ? this.#size.y : this.#size.x;
    }
    #getAlignBaseOffset(): number {
      if (this.#align === "start") return 0;
      const len = this.#isVertical ? this.#size.x : this.#size.y;
      return this.#align === "end" ? len : len / 2;
    }
    #getOnScreenPoint(point: Vector): Vector {
      const ret: Vector = { x: NaN, y: NaN };
      if (point.y < 0) ret.y = 0;
      if (point.x < 0) ret.x = 0;
      if (!window) return ret;
      if (point.y + this.#size.y > window.innerHeight) ret.y = window.innerHeight - this.#size.y;
      if (point.x + this.#size.x > window.innerWidth) ret.x = window.innerWidth - this.#size.x;
      return ret;
    }
  }
  const core = new TooltipCore();

  import { mount, untrack } from "svelte";
  import { on } from "svelte/events";
  import { VARIANT, PARTS, fnClass, throttle } from "./core";
  import TooltipRoot from "./Tooltip.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // *** Initialize *** //
  const cls = $derived(fnClass(_TOOLTIP_PRESET, core.styling));
  let el: HTMLDivElement | undefined = $state();
  let point: Vector = $state.raw(INIT_VEC);

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    core.visible;
    untrack(() => setPosition());
  });
  function setPosition() {
    if (core.visible !== VISIBLE.VISIBLE) return;
    const size = { x: el?.offsetWidth ?? 0, y: el?.offsetHeight ?? 0 };
    point = core.computePoint(size);
  }
  const visibility = $derived(core.visible === VISIBLE.VISIBLE ? "visibility: visible;" : "visibility: hidden; z-index: -9999;");
  const style = $derived(`position: fixed; left: ${point.x}px; top: ${point.y}px; ${visibility}`);
</script>

<!---------------------------------------->

{#if core.visible !== VISIBLE.NONE}
  <div bind:this={el} class={cls(PARTS.WHOLE, core.variant)} {style} role="tooltip">
    {#if core.content}
      {@render core.content(core.text, core.variant, core.flipped)}
    {:else}
      {core.text}
    {/if}
  </div>
{/if}
