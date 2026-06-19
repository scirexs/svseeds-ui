<!--
  @component
  ### Usage
  Use standalone, or inside `SortableGroup` to connect lists.
  ```svelte
  <Sortable {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface SortableProps<T = string> {
    items: T[]; // bindable plain array
    item: Snippet<[T, SVSVariant, Attachment]>; // Snippet<[value, variant, dragHandle]>
    key?: (item: T) => PropertyKey; // identity extractor; required for object items
    clone?: (item: T) => T; // required for object items in clone mode
    group?: SortableGroupController; // shared controller from createSortableGroup()
    id?: string; // list id used by accept
    ghost?: Snippet<[T]>; // custom floating preview
    mode?: "move" | "clone" | "swap"; // ("move")
    accept?: string[] | ((fromId: string) => boolean); // undefined=any in group, []=none
    sort?: boolean; // enable sorting within the same list (true)
    multiple?: boolean; // enable multi-select followers (false)
    draggable?: boolean; // whole item is draggable when no handle is attached (true)
    appendable?: boolean; // append when entering the list area (false)
    confirm?: boolean; // hover delay before committing (false)
    dragging?: boolean; // bindable group drag activity
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  Generic `T` is the item value type. Use `bind:items` with a plain array; mutations happen in place.
  For object items, provide `key={(item) => item.id}`. For `mode="clone"` with objects, also provide `clone`.
  Connect lists by passing the same `group={createSortableGroup(undefined, { duration: 300, easing: cubicOut })}` or by wrapping them in `<SortableGroup>`.
  The third `item` snippet argument is an attachment for a custom drag handle: `{@attach handle}`.
  Group motion defaults to `300ms` / `cubicOut`; reduced motion resolves duration to `0`.

  ### Anatomy
  ```svelte
  <ul class="whole">
    {#each items as value (key(value))}
      <li class="main">
        {item(value, variant, handle)}
      </li>
    {/each}
  </ul>
  A position:fixed floating shadow is rendered while dragging.
  ```

  ### Exports
  ```ts
  // Creates an isolated drag controller; pass it as `group` to connect multiple lists, or wrap them in <SortableGroup>.
  function createSortableGroup(presentation?: { get variant(): SVSVariant; get styling(): SVSClass | undefined }, motion?: { duration?: number; easing?: EasingFunction }): SortableGroupController
  ```
-->
<script module lang="ts">
  export interface SortableProps<T = string> {
    items: T[];
    item: Snippet<[T, SVSVariant, Attachment]>;
    key?: (item: T) => PropertyKey;
    clone?: (item: T) => T;
    group?: SortableGroupController;
    id?: string;
    ghost?: Snippet<[T]>;
    mode?: SortableMode;
    accept?: SortableAccept;
    sort?: boolean;
    multiple?: boolean;
    draggable?: boolean;
    appendable?: boolean;
    confirm?: boolean;
    dragging?: boolean;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type SortableReqdProps = "items" | "item";
  export type SortableBindProps = "items" | "dragging";
  export type SortableMode = "move" | "clone" | "swap";

  export interface SortableGroupController extends SVSContext {
    readonly identity: symbol;
    readonly dragging: boolean;
    readonly activeKey: string;
    readonly confirmKey: string;
    readonly shadow: SortableShadowState;
    readonly send: TransitionFn;
    readonly receive: TransitionFn;
    readonly tp: TransitionParams;
    register<T>(member: SortableMember<T>): () => void;
    prepare<T>(member: SortableMember<T>, key: string, ev: PointerEvent, el: HTMLElement, followers: string[]): boolean;
    setGhost(ghost: boolean, ev?: PointerEvent): void;
    move(ev: PointerEvent): void;
    commit(): void;
    cancel(): void;
    over<T>(member: SortableMember<T>, key: string): void;
    leave(): void;
    enterGroup<T>(member: SortableMember<T>): void;
    itemVariant(key: string, selected: boolean, base: SVSVariant): SVSVariant;
  }

  type SortableAccept = string[] | ((fromId: string) => boolean);
  type TransitionParams = {
    duration: number;
    easing: EasingFunction;
  };
  type TransitionFn = ReturnType<typeof crossfade>[number];
  type TriggerButton = "main" | "sub" | "middle" | "back" | "forward" | "ctrl" | "alt" | "shift" | "meta";
  type Point = { x: number; y: number };
  type VoidFn = () => void;
  type SortableMember<T = unknown> = {
    id: string;
    get items(): T[];
    key(item: T): PropertyKey;
    clone(item: T): T;
    get mode(): SortableMode;
    get accept(): SortableAccept | undefined;
    get sort(): boolean;
    get multiple(): boolean;
    get confirm(): boolean;
    touch(): void;
  };
  type ActiveDrag<T = unknown> = {
    source: SortableMember<T>;
    current: SortableMember;
    sourceKey: string;
    activeKey: string;
    sourceIndex: number;
    item: T;
    mode: SortableMode;
    followers: string[];
    pendingSwap?: { member: SortableMember; key: string };
  };
  type SortableShadowState = {
    rendering: boolean;
    visible: boolean;
    ownerId: string;
    item: unknown;
    point: Point;
    cssSize: string;
    ghost: boolean;
  };

  export const [_getSortableContext, _setSortableContext] = _createContext<SortableGroupController>();

  const minDistance = 10;
  const pollingRate = 15;
  const confirmTime = 500;
  const triggerDrag: TriggerButton[] = ["main"];
  const triggerSelect: TriggerButton[] = ["main"];
  export const _SORTABLE_PRESET = "svs-sortable";
  const emptyAttachment: Attachment = () => {};
  const ondragstart = () => false;

  export function createSortableGroup(
    presentation?: {
      get variant(): SVSVariant;
      get styling(): SVSClass | undefined;
    },
    motion?: {
      duration?: number;
      easing?: EasingFunction;
    },
  ): SortableGroupController {
    const tp: TransitionParams = {
      duration: _resolveDuration(motion?.duration, 300),
      easing: motion?.easing ?? cubicOut,
    };
    const [send, receive] = crossfade(tp);
    return new SortableController(Symbol("svs-sortable-group"), send, receive, presentation, tp);
  }

  class SortableController implements SortableGroupController {
    readonly identity;
    readonly send;
    readonly receive;
    readonly tp;
    #presentation;
    #members = new Map<string, SortableMember>();
    #listeners: VoidFn[] = [];
    #pointer = new PointerVector(minDistance);
    #trigger = createTriggerNumber(triggerDrag);
    #timer: ReturnType<typeof setTimeout> | undefined;
    #active: ActiveDrag | undefined = $state.raw();
    #standby:
      | {
          member: SortableMember;
          key: string;
          el: HTMLElement;
          followers: string[];
          item: unknown;
          ghost: boolean;
          anchor: Point;
        }
      | undefined = $state.raw();
    #dragging = $state(false);
    #activeKey = $state("");
    #confirmKey = $state("");
    shadow: SortableShadowState = $state({
      rendering: false,
      visible: false,
      ownerId: "",
      item: undefined,
      point: point(0, 0),
      cssSize: "",
      ghost: false,
    });

    constructor(
      identity: symbol,
      send: TransitionFn,
      receive: TransitionFn,
      presentation: { get variant(): SVSVariant; get styling(): SVSClass | undefined } | undefined,
      tp: TransitionParams,
    ) {
      this.identity = identity;
      this.send = send;
      this.receive = receive;
      this.tp = tp;
      this.#presentation = presentation;
    }
    get variant(): SVSVariant {
      return this.#presentation?.variant ?? VARIANT.NEUTRAL;
    }
    get styling(): SVSClass | undefined {
      return this.#presentation?.styling;
    }
    get dragging(): boolean {
      return this.#dragging;
    }
    get activeKey(): string {
      return this.#activeKey;
    }
    get confirmKey(): string {
      return this.#confirmKey;
    }
    register<T>(member: SortableMember<T>): () => void {
      this.#members.set(member.id, member as SortableMember);
      return () => {
        this.#members.delete(member.id);
        if (this.#active?.source.id === member.id || this.#active?.current.id === member.id) this.cancel();
      };
    }
    prepare<T>(member: SortableMember<T>, key: string, ev: PointerEvent, el: HTMLElement, followers: string[]): boolean {
      this.cancel();
      if (getTriggerNumber(ev) !== this.#trigger) return false;
      const index = findIndex(member, key);
      if (index < 0) return false;
      this.#pointer.init(ev);
      const rect = el.getBoundingClientRect();
      const item = member.items[index];
      this.#standby = {
        member,
        key,
        el,
        followers,
        item,
        ghost: false,
        anchor: point(rect.x, rect.y),
      };
      this.#activeKey = key;
      this.shadow.rendering = false;
      this.shadow.visible = false;
      this.shadow.ownerId = member.id;
      this.shadow.item = item;
      this.shadow.point = point(rect.x, rect.y);
      this.shadow.cssSize = `width: ${rect.width}px; height: ${rect.height}px;`;
      this.#listen();
      return true;
    }
    setGhost(ghost: boolean, ev?: PointerEvent) {
      if (!this.#standby) return;
      this.#standby.ghost = ghost;
      this.shadow.ghost = ghost;
      if (ghost) {
        const p = ev ? point(ev.clientX, ev.clientY) : this.#standby.anchor;
        this.#standby.anchor = p;
        this.shadow.point = p;
        this.shadow.cssSize = "width: fit-content; height: fit-content;";
      }
    }
    move(ev: PointerEvent): void {
      if (this.#standby && !this.#active) {
        if (!this.#pointer.reachMinDistance(ev)) return;
        const { member, key, followers, item } = this.#standby;
        this.#active = {
          source: member,
          current: member,
          sourceKey: key,
          activeKey: key,
          sourceIndex: findIndex(member, key),
          item,
          mode: member.mode,
          followers,
        };
        this.#dragging = true;
        this.shadow.rendering = true;
        this.shadow.visible = true;
      }
      if (!this.#active || !this.#standby) return;
      const vector = this.#pointer.vector(ev);
      this.shadow.point = point(this.#standby.anchor.x + vector.x, this.#standby.anchor.y + vector.y);
    }
    commit(): void {
      this.#clearDelay();
      if (this.#active) {
        this.#commitSwap();
        this.#commitFollowers();
      }
      this.#clearDrag();
    }
    cancel(): void {
      this.#clearDelay();
      this.#clearDrag();
    }
    over<T>(member: SortableMember<T>, key: string): void {
      if (!this.#active || !this.#isAcceptable(member) || this.#guardSameTarget(member, key)) return;
      const run = () => this.#sort(member, key);
      if (member.confirm && this.#canSort(member)) {
        this.#confirmKey = key;
        this.#clearDelay();
        this.#timer = setTimeout(run, confirmTime);
      } else {
        run();
      }
    }
    leave(): void {
      this.#confirmKey = "";
      this.#clearDelay();
    }
    enterGroup<T>(member: SortableMember<T>): void {
      if (!this.#active || !this.#isAcceptable(member)) return;
      if (member.items.length > 0 && !memberIsAppendable(member)) return;
      const run = () => this.#append(member);
      if (member.confirm) {
        this.#clearDelay();
        this.#timer = setTimeout(run, confirmTime);
      } else {
        run();
      }
    }
    itemVariant(key: string, selected: boolean, base: SVSVariant): SVSVariant {
      return selected || this.#activeKey === key || this.#confirmKey === key ? VARIANT.ACTIVE : base;
    }
    #listen() {
      this.#stopListeners();
      this.#listeners = [
        on(
          window,
          "pointermove",
          throttle(pollingRate, (ev) => this.move(ev)),
        ),
        on(window, "pointerup", () => this.commit()),
        on(window, "pointercancel", () => this.cancel()),
      ];
    }
    #stopListeners() {
      this.#listeners.forEach((stop) => stop());
      this.#listeners = [];
    }
    #clearDelay() {
      if (this.#timer) clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    #clearDrag() {
      this.#stopListeners();
      this.#active = undefined;
      this.#standby = undefined;
      this.#dragging = false;
      this.#activeKey = "";
      this.#confirmKey = "";
      this.shadow.rendering = false;
      this.shadow.visible = false;
      this.shadow.ownerId = "";
      this.shadow.item = undefined;
      this.shadow.ghost = false;
    }
    #sort(member: SortableMember, key: string) {
      if (!this.#active || !this.#canSort(member)) return;
      this.#confirmKey = "";
      switch (this.#active.mode) {
        case "move":
          this.#moveTo(member, key);
          break;
        case "clone":
          this.#cloneTo(member, key);
          break;
        case "swap":
          this.#active.pendingSwap = { member, key };
          this.#confirmKey = key;
          break;
      }
    }
    #append(member: SortableMember) {
      if (!this.#active) return;
      this.#confirmKey = "";
      switch (this.#active.mode) {
        case "move":
          this.#moveTo(member);
          break;
        case "clone":
          this.#cloneTo(member);
          break;
        case "swap":
          this.#active.pendingSwap = undefined;
          break;
      }
    }
    #moveTo(member: SortableMember, key?: string) {
      if (!this.#active) return;
      const active = this.#active;
      const from = active.current;
      const fromIndex = findIndex(from, active.activeKey);
      if (fromIndex < 0) return;
      const toIndex = insertIndex(member, key, from, fromIndex);
      if (from.id === member.id && fromIndex === toIndex) return;
      const [value] = from.items.splice(fromIndex, 1);
      member.items.splice(adjustIndex(member, from, fromIndex, toIndex), 0, value);
      from.touch();
      member.touch();
      active.current = member;
      active.activeKey = stringifyKey(member.key(value));
      this.#activeKey = active.activeKey;
      this.shadow.item = value;
    }
    #cloneTo(member: SortableMember, key?: string) {
      if (!this.#active) return;
      const active = this.#active;
      if (active.current.id === active.source.id && member.id === active.source.id) {
        if (member.sort) this.#moveTo(member, key);
        return;
      }
      if (active.current.id !== active.source.id) {
        if (member.id === active.source.id) {
          const cloneIndex = findIndex(active.current, active.activeKey);
          if (cloneIndex >= 0) {
            active.current.items.splice(cloneIndex, 1);
            active.current.touch();
          }
          active.current = active.source;
          active.activeKey = active.sourceKey;
          this.#activeKey = active.activeKey;
          this.shadow.item = active.item;
          if (member.sort) this.#moveTo(member, key);
          return;
        }
        this.#moveTo(member, key);
        return;
      }
      const value = active.source.clone(active.item);
      const index = insertIndex(member, key, active.current, findIndex(active.current, active.activeKey));
      member.items.splice(index, 0, value);
      member.touch();
      active.current = member;
      active.activeKey = stringifyKey(member.key(value));
      this.#activeKey = active.activeKey;
      this.shadow.item = value;
    }
    #commitSwap() {
      const active = this.#active;
      if (!active?.pendingSwap) return;
      this.#swapWith(active.pendingSwap.member, active.pendingSwap.key);
      active.pendingSwap = undefined;
    }
    #swapWith(targetMember: SortableMember, targetKey: string) {
      const active = this.#active;
      if (!active) return;
      const targetIndex = findIndex(targetMember, targetKey);
      const fromMember = active.current;
      const fromIndex = findIndex(fromMember, active.activeKey);
      if (targetIndex < 0 || fromIndex < 0) return;
      const targetValue = targetMember.items[targetIndex];
      const fromValue = fromMember.items[fromIndex];
      fromMember.items.splice(fromIndex, 1, targetValue);
      targetMember.items.splice(targetIndex, 1, fromValue);
      fromMember.touch();
      targetMember.touch();
      active.current = targetMember;
      active.activeKey = stringifyKey(targetMember.key(fromValue));
      this.#activeKey = active.activeKey;
    }
    #commitFollowers() {
      const active = this.#active;
      if (!active || active.followers.length <= 0 || active.current.id === active.source.id) return;
      const values = active.followers
        .map((key) => {
          const index = findIndex(active.source, key);
          return index >= 0 ? { key, index, value: active.source.items[index] } : undefined;
        })
        .filter((x): x is { key: string; index: number; value: unknown } => x !== undefined);
      if (active.mode === "clone") {
        const cloned = values.map(({ value }) => active.source.clone(value));
        insertAfter(active.current, active.activeKey, cloned);
        active.current.touch();
        return;
      }
      values.toSorted((a, b) => b.index - a.index).forEach(({ index }) => active.source.items.splice(index, 1));
      insertAfter(
        active.current,
        active.activeKey,
        values.map(({ value }) => value),
      );
      active.source.touch();
      active.current.touch();
    }
    #isAcceptable(member: SortableMember): boolean {
      if (!this.#active) return false;
      if (member.id === this.#active.current.id || member.id === this.#active.source.id) return true;
      const accept = member.accept;
      if (!accept) return true;
      if (Array.isArray(accept)) return accept.includes(this.#active.source.id);
      return accept(this.#active.source.id);
    }
    #canSort(member: SortableMember): boolean {
      if (!this.#active) return false;
      return member.sort || member.id !== this.#active.current.id;
    }
    #guardSameTarget(member: SortableMember, key: string): boolean {
      if (!this.#active) return true;
      return member.id === this.#active.current.id && key === this.#active.activeKey;
    }
  }

  function memberIsAppendable(member: SortableMember & { appendable?: boolean }): boolean {
    return member.appendable === true;
  }
  function findIndex(member: SortableMember, key: string): number {
    return member.items.findIndex((item) => stringifyKey(member.key(item)) === key);
  }
  function insertIndex(member: SortableMember, key: string | undefined, from: SortableMember, fromIndex: number): number {
    if (!key) return member.items.length;
    const index = findIndex(member, key);
    if (index < 0) return member.items.length;
    return member.id === from.id && fromIndex < index ? index + 1 : index;
  }
  function adjustIndex(member: SortableMember, from: SortableMember, fromIndex: number, toIndex: number): number {
    return member.id === from.id && fromIndex < toIndex ? toIndex - 1 : toIndex;
  }
  function insertAfter(member: SortableMember, key: string, values: unknown[]) {
    const index = findIndex(member, key);
    member.items.splice(index < 0 ? member.items.length : index + 1, 0, ...values);
  }
  function point(x: number, y: number): Point {
    return { x, y };
  }
  function stringifyKey(key: PropertyKey): string {
    return String(key);
  }
  function createTriggerNumber(buttonsArray: TriggerButton[]): number {
    let ret = 0;
    const buttons = new Set(buttonsArray);
    for (const button of buttons.keys()) {
      switch (button) {
        case "main":
          ret += 0b000000001;
          break;
        case "sub":
          ret += 0b000000010;
          break;
        case "middle":
          ret += 0b000000100;
          break;
        case "back":
          ret += 0b000001000;
          break;
        case "forward":
          ret += 0b000010000;
          break;
        case "ctrl":
          ret += 0b000100000;
          break;
        case "alt":
          ret += 0b001000000;
          break;
        case "shift":
          ret += 0b010000000;
          break;
        case "meta":
          ret += 0b100000000;
          break;
      }
    }
    return ret;
  }
  function getTriggerNumber(ev: PointerEvent): number {
    let num = ev.buttons;
    if (ev.ctrlKey) num += 0b000100000;
    if (ev.altKey) num += 0b001000000;
    if (ev.shiftKey) num += 0b010000000;
    if (ev.metaKey) num += 0b100000000;
    return num;
  }

  class PointerVector {
    #tolerance;
    #initial: Point = point(0, 0);
    #current: Point = point(0, 0);

    constructor(tolerance: number) {
      this.#tolerance = tolerance;
    }
    init(ev: PointerEvent) {
      this.#initial = point(ev.clientX, ev.clientY);
      this.#current = point(ev.clientX, ev.clientY);
    }
    reachMinDistance(ev: PointerEvent): boolean {
      this.#refresh(ev);
      return Math.hypot(this.#current.x - this.#initial.x, this.#current.y - this.#initial.y) > this.#tolerance;
    }
    vector(ev: PointerEvent): Point {
      this.#refresh(ev);
      return point(this.#current.x - this.#initial.x, this.#current.y - this.#initial.y);
    }
    #refresh(ev: PointerEvent) {
      this.#current = point(ev.clientX, ev.clientY);
    }
  }

  import { onDestroy, untrack } from "svelte";
  import { on } from "svelte/events";
  import { SvelteSet } from "svelte/reactivity";
  import { crossfade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { flip } from "svelte/animate";
  import { VARIANT, PARTS, fnClass, throttle, isNeutral, _resolveDuration, _createContext } from "./core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { EasingFunction } from "svelte/transition";
  import type { SVSClass, SVSVariant, SVSContext } from "./core";
</script>

<script lang="ts" generics="T = string">
  // prettier-ignore
  let { items = $bindable(), item, key, clone, group, id, ghost, mode = "move", accept, sort = true, multiple = false, draggable = true, appendable = false, confirm = false, dragging = $bindable(false), styling, variant = VARIANT.NEUTRAL }: SortableProps<T> = $props();

  const context = _getSortableContext();
  // svelte-ignore state_referenced_locally
  const controller = group ?? context ?? createSortableGroup();
  const autoId = $props.id();
  // svelte-ignore state_referenced_locally
  const listId = id ?? autoId;
  const itemKey = $derived(key ?? ((x: T) => x as PropertyKey));
  const itemClone = $derived(clone ?? ((x: T) => x));
  const cls = $derived(fnClass(_SORTABLE_PRESET, styling ?? controller.styling));
  const effVariant = $derived(!isNeutral(variant) ? variant : controller.variant);
  const selected = new SvelteSet<string>();
  let pendingSelect = $state("");
  let pendingDeselect = $state(false);
  let unregister: VoidFn | undefined;

  const member: SortableMember<T> & { get appendable(): boolean } = {
    id: listId,
    get items() {
      return items;
    },
    key(value: T) {
      return itemKey(value);
    },
    clone(value: T) {
      return itemClone(value);
    },
    get mode() {
      return mode;
    },
    get accept() {
      return accept;
    },
    get sort() {
      return sort;
    },
    get multiple() {
      return multiple;
    },
    get confirm() {
      return confirm;
    },
    touch() {
      items = items;
    },
    get appendable() {
      return appendable;
    },
  };

  unregister = controller.register(member);

  $effect(() => {
    controller.dragging;
    untrack(() => (dragging = controller.dragging));
  });

  function keyString(value: T): string {
    return stringifyKey(itemKey(value));
  }
  function handle(element: Element): void {
    if (!(element instanceof HTMLElement)) return;
    element.dataset.svsHandle = "";
    element.style.touchAction = "none";
  }
  function isSelected(key: string): boolean {
    return selected.has(key);
  }
  function onPointerDown(ev: PointerEvent) {
    const target = ev.target;
    if (!(target instanceof Element) || !(ev.currentTarget instanceof HTMLElement)) return;
    const li = target.closest<HTMLElement>("[data-svs-key]");
    if (!li || !ev.currentTarget.contains(li)) return;
    const hasHandle = li.querySelector("[data-svs-handle]") !== null;
    const insideHandle = target.closest("[data-svs-handle]") !== null;
    if (hasHandle ? !insideHandle : !draggable) return;
    ev.preventDefault();
    ev.stopPropagation();
    try {
      li.releasePointerCapture(ev.pointerId);
    } catch {
      // jsdom and uncaptured pointers can throw here.
    }
    const key = li.dataset.svsKey ?? "";
    const trigger = getTriggerNumber(ev);
    if (multiple && trigger === createTriggerNumber(triggerSelect)) {
      pendingSelect = key;
      pendingDeselect = selected.has(key);
    } else {
      pendingSelect = "";
      pendingDeselect = false;
    }
    const followers = multiple && selected.has(key) ? [...selected].filter((x) => x !== key) : [];
    if (controller.prepare(member, key, ev, li, followers)) {
      controller.setGhost?.(ghost !== undefined, ev);
    }
  }
  function onPointerOver(ev: PointerEvent) {
    if (!controller.dragging) return;
    const target = ev.target;
    if (!(target instanceof Element) || !(ev.currentTarget instanceof HTMLElement)) return;
    const li = target.closest<HTMLElement>("[data-svs-key]");
    if (!li || !ev.currentTarget.contains(li)) {
      if (target === ev.currentTarget) controller.enterGroup(member);
      return;
    }
    controller.over(member, li.dataset.svsKey ?? "");
  }
  function onPointerOut(ev: PointerEvent) {
    if (!controller.dragging) return;
    const current = ev.currentTarget;
    const related = ev.relatedTarget;
    if (current instanceof Element && related instanceof Node && current.contains(related)) return;
    controller.leave();
  }
  function onPointerEnter() {
    controller.enterGroup(member);
  }
  function onPointerUp() {
    if (!multiple || controller.dragging || !pendingSelect) return;
    pendingDeselect ? selected.delete(pendingSelect) : selected.add(pendingSelect);
    pendingSelect = "";
    pendingDeselect = false;
  }

  onDestroy(() => {
    unregister?.();
    controller.cancel();
  });
</script>

<!---------------------------------------->

<ul
  class={cls(PARTS.WHOLE, effVariant)}
  onpointerdown={onPointerDown}
  onpointerover={onPointerOver}
  onpointerout={onPointerOut}
  onpointerenter={onPointerEnter}
  onpointerup={onPointerUp}
>
  {#each items as value (keyString(value))}
    {@const k = keyString(value)}
    {@const itemVariant = controller.itemVariant(k, isSelected(k), effVariant)}
    <li
      class={cls(PARTS.MAIN, itemVariant)}
      data-svs-key={k}
      in:controller.receive={{ key: k }}
      out:controller.send={{ key: k }}
      animate:flip={controller.tp}
      style="touch-action:none;"
      {ondragstart}
    >
      {@render item(value, itemVariant, handle)}
    </li>
  {/each}
</ul>
{#if controller.shadow.rendering && controller.shadow.ownerId === listId}
  {@const shadowStyle = `opacity: 0.5; pointer-events: none; position: fixed; left: ${controller.shadow.point.x}px; top: ${controller.shadow.point.y}px; visibility: ${controller.shadow.visible ? "visible" : "hidden"}; ${controller.shadow.cssSize}`}
  <ul style="display: contents;">
    <li class={controller.shadow.ghost ? undefined : cls(PARTS.MAIN, effVariant)} style={shadowStyle}>
      {#if controller.shadow.ghost && ghost}
        {@render ghost(controller.shadow.item as T)}
      {:else}
        {@render item(controller.shadow.item as T, effVariant, emptyAttachment)}
      {/if}
    </li>
  </ul>
{/if}
