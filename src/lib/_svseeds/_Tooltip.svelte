<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TooltipProps {
    children?: Snippet<[string, string, boolean]>; // Snippet<[text,variant,isFlipped]>
    name?: string;
    position?: Position; // ("top")
    align?: Align; // ("center")
    offset?: Vector; // ({ x: 0, y: 0 })
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  type Vector = { x: number, y: number };
  type Position = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";
  ```
  ### Anatomy
  ```svelte
  <div class="whole" bind:this={element} conditional>
    {#if children}
      {children}
    {:else}
      {text} // `text` is a property of the tooltip function's params
    {/if}
  </div>
  ```
  ### Exports
  ```ts
  // Attachment factory for both standard HTML elements (`{@attach tooltip(params)}`)
  // and SvSeeds components (`attach={tooltip(params)}`).
  //
  // *@param* text - Text content for the tooltip's aria-label
  // *@param* delay - Delay in milliseconds before the tooltip appears (default: 1000)
  // *@param* cursor - Whether the tooltip should follow cursor movement
  // *@param* name - Unique identifier for the tooltip component
  function tooltip(params: { text: string, delay?: number, cursor?: boolean, name?: string }): Attachment<HTMLElement>
  ```
-->
<script module lang="ts">
  export interface TooltipProps {
    children?: Snippet<[string, string, boolean]>; // Snippet<[text,variant,isFlipped]>
    name?: string;
    position?: Position; // ("top")
    align?: Align; // ("center")
    offset?: Vector; // ({ x: 0, y: 0 })
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type TooltipReqdProps = never;
  export type TooltipBindProps = "element";
  export function tooltip(params: { text: string; delay?: number; cursor?: boolean; name?: string }): Attachment<HTMLElement> {
    return (node) => core.attach(node, params.text, params.delay, params.cursor, params.name);
  }
  export type Vector = { x: number; y: number };
  export type Position = "top" | "right" | "bottom" | "left";
  export type Align = "start" | "center" | "end";

  type valueof<T> = T[keyof T];
  type Unlisten = () => void;
  const preset = "svs-tooltip";
  const INIT_VEC = { x: 0, y: 0 };
  const VISIBLE = {
    NONE: 0,
    HIDDEN: 1,
    VISIBLE: 2,
  } as const;

  class TooltipCore {
    static #DELAY = 1000;
    static #INTERVAL = 20;
    text = $state("");
    flipped = $state(false);
    visible: valueof<typeof VISIBLE> = $state(VISIBLE.NONE);
    #tid: ReturnType<typeof setTimeout> | undefined;
    #listeners: Unlisten[] = [];
    #uniqueId;
    #position;

    constructor() {
      this.#uniqueId = new UniqueId();
      this.#position = new TooltipPosition();
    }
    register(name?: string): string {
      return this.#uniqueId.register(name);
    }
    getPoint(position: Position, align: Align, size: Vector, offset: Vector): Vector {
      this.#position.setPoint(position, align, size, offset);
      this.flipped = this.#position.isFlipped;
      return this.#position.point;
    }
    mount(id: string): boolean {
      return this.visible !== VISIBLE.NONE && this.isTarget(id);
    }
    isTarget(id: string): boolean {
      return this.#uniqueId.current === id;
    }
    attach(node: HTMLElement, text: string, delay?: number, cursor?: boolean, name?: string): () => void {
      node.ariaDescription = text;
      if (!delay || delay < 0) delay = TooltipCore.#DELAY;
      return this.#cleanup(on(node, "pointerenter", this.#setEnter(node, text, delay, cursor, name)));
    }
    #cleanup(unlisten: Unlisten): () => void {
      return () => {
        unlisten();
        this.#hide();
      };
    }
    #setEnter(node: HTMLElement, text: string, delay: number, cursor?: boolean, name?: string): (ev: PointerEvent) => void {
      return (ev) => {
        this.#position.setAnchor(ev, node, cursor);
        this.#show(text, delay, name);
        this.#listeners.push(on(node, "pointercancel", () => this.#hide()));
        this.#listeners.push(on(node, "pointerleave", () => this.#hide()));
        if (cursor) this.#listeners.push(on(node, "pointermove", this.#setMove()));
      };
    }
    #show(text: string, delay: number, name?: string) {
      this.#hide();
      this.#prep(text, name);
      this.#tid = setTimeout(() => (this.visible = VISIBLE.VISIBLE), delay);
    }
    #hide() {
      clearTimeout(this.#tid);
      this.visible = VISIBLE.NONE;
      this.#listeners.forEach((x) => x());
    }
    #prep(text: string, name?: string) {
      this.text = text;
      this.#uniqueId.current = name;
      this.visible = VISIBLE.HIDDEN;
    }
    #setMove(): (ev: PointerEvent) => void {
      return throttle(TooltipCore.#INTERVAL, (ev) => {
        if (this.visible === VISIBLE.VISIBLE) return;
        this.#position.trackCursor(ev);
      });
    }
  }
  class UniqueId {
    #default = "";
    #current = "";
    #ids: Set<string> = new Set();
    get default(): string {
      return this.#default;
    }
    get current(): string {
      return this.#current ? this.#current : this.#default;
    }
    set current(id: string | undefined) {
      if (!id) return;
      if (this.#ids.has(id)) this.#current = id;
    }
    register(name?: string): string {
      if (!name) return "";
      if (this.#ids.has(name)) return "";
      if (!this.#default) this.#default = name;
      this.#ids.add(name);
      return name;
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

  import { type Snippet, untrack } from "svelte";
  import { on } from "svelte/events";
  import { type Attachment } from "svelte/attachments";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, throttle } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, name, position = "top", align = "center", offset = { ...INIT_VEC }, element = $bindable(), styling, variant = VARIANT.NEUTRAL }: TooltipProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  // svelte-ignore state_referenced_locally
  const id = core.register(name ?? uid);
  let point: Vector = $state.raw(INIT_VEC);

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    core.visible;
    untrack(() => setPosition());
  });
  function setPosition() {
    if (core.visible !== VISIBLE.VISIBLE || !core.isTarget(id)) return;
    const size = { x: element?.offsetWidth ?? 0, y: element?.offsetHeight ?? 0 };
    point = core.getPoint(position, align, size, offset);
  }
  const visibility = $derived(
    core.visible === VISIBLE.VISIBLE && core.isTarget(id) ? "visibility: visible;" : "visibility: hidden; z-index: -9999;",
  );
  const style = $derived(`position: fixed; left: ${point.x}px; top: ${point.y}px; ${visibility}`);
</script>

<!---------------------------------------->

{#if core.mount(id)}
  <div bind:this={element} class={cls(PARTS.WHOLE, variant)} {style} {id} role="tooltip">
    {#if children}
      {@render children(core.text, variant, core.flipped)}
    {:else}
      {core.text}
    {/if}
  </div>
{/if}
