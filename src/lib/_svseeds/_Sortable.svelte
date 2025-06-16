<!--
  @component
  default value: `(value)`
  ```ts
  interface SortableProps {
    items: SortableItems; // wrapper of string array as items to handle DnD
    item: Snippet<[string, string, PointerEventHandler]>; // Snippet<[value, variant, onpointerdown]>
    ghost?: Snippet<[string]>; // custom shadow while dragging (the translucent item); Snippet<[value]>
    name?: string;        // name of this group (random string)
    mode?: SortableMode;  // sort mode ("std")
    accept?: string[];    // list of accept group names (undefined); undefined=any,[]=none
    sort?: boolean;       // enable sort within same group (true)
    multiple?: boolean;   // enable multiple select & drag with them (false)
    draggable?: boolean;  // enable default pointerdown handler (true)
    appendable?: boolean; // enable append when enter group area (false)
    confirm?: boolean     // enable confirm interval time to move items (false)
    styling?: SVSClass;
    variant?: string;     // bindable (VARIANT.NEUTRAL)
  }
  type SortableMode = "std" | "clone" | "swap";
  class SortableItems { // methods are same with array's
    constructor(values: string[])
    at(index: number): string | undefined
    replace(index: number, value: string): boolean
    push(value: string)
    pop(): string | undefined
    unshift(value: string)
    shift(): string | undefined
    insert(index: number, value: string) // instead of splice
    extract(index: number): string | undefined // instead of splice
    isEmpty(): boolean
    clear(): void
    get length(): number
    get values(): string[]
    set values(values: string[])
  }
  ```
-->
<script module lang="ts">
  import { cubicOut } from "svelte/easing";
  const tp: TransitionParams = { duration: 300, easing: cubicOut }; // config of transition
  const minDistance = 10; // (px) define how far to drag to be triggered
  const pollingRate = 15; // (ms) throttle interval of pointermove event while dragging
  const confirmTime = 500 // (ms) define how long to hover on item to confirm
  const triggerDrag: TriggerButton[] = ["main"]; // define draggable by which buttons
  const triggerSelect: TriggerButton[] = ["main"]; // define selectable by which buttons (for multi select)
  const preset = "svs-sortable";

  /***************************************************************/

  type SortableMode = "std" | "clone" | "swap";
  export interface SortableProps {
    items: SortableItems; // wrapper of string array as items to handle DnD
    item: Snippet<[string, string, PointerEventHandler]>; // Snippet<[value, variant, onpointerdown]>
    ghost?: Snippet<[string]>; // custom shadow while dragging (the translucent item); Snippet<[value]>
    name?: string;        // name of this group (random string)
    mode?: SortableMode;  // sort mode ("std")
    accept?: string[];    // list of accept group names (undefined); undefined=any,[]=none
    sort?: boolean;       // enable sort within same group (true)
    multiple?: boolean;   // enable multiple select & drag with them (false)
    draggable?: boolean;  // enable default pointerdown handler (true)
    appendable?: boolean; // enable append when enter group area (false)
    confirm?: boolean     // enable confirm interval time to move items (false)
    styling?: SVSClass;
    variant?: string;     // bindable (VARIANT.NEUTRAL)
  }
  export type SortableReqdProps = "items" | "item";
  export type SortableBindProps = "variant";

  export class SortableItems {
    #inner: KeyValue[] = $state([]);
    #state: DragState = $state("idle");

    constructor(values: string[]) { this.#inner = SortableItems._newItems(values); }
    at(index: number): string | undefined { return this.#inner.at(index)?.value; }
    replace(index: number, value: string): boolean { return this.#replace(value, this.#inner.at(index)); }
    push(value: string) { this.#inner.push(SortableItems._newItem(value)); }
    pop(): string | undefined { return this.#take(this.#inner.pop()); }
    unshift(value: string) { this.#inner.unshift(SortableItems._newItem(value)); }
    shift(): string | undefined { return this.#take(this.#inner.shift()); }
    insert(index: number, value: string) { this.#inner.splice(index, 0, SortableItems._newItem(value)); }
    extract(index: number): string | undefined { return this.#take(this.#inner.splice(index, 1)[0]); }
    isEmpty(): boolean { return this.#inner.length <= 0; }
    clear() {
      this.#delKeys();
      this.#inner = [];
    }
    get length(): number { return this.#inner.length; }
    get active(): boolean { return this.#state !== "idle"; }
    get dragging(): boolean { return this.#state === "dragging"; }
    get updated(): KeyValue[] { return this.#inner; }
    get values(): string[] { return this.#inner.map(x => x.value); }
    set values(values: string[]) {
      this.#delKeys();
      this.#inner = SortableItems._newItems(values);
    }

    #replace(value: string, item?: KeyValue): boolean {
      if (!item) { return false; }
      rand.set(item.key, value);
      item.value = value;
      return true;
    }
    #take(item?: KeyValue): string | undefined {
      rand.del(item?.key);
      return item?.value;
    }
    #delKeys() { this.#inner.forEach(x => rand.del(x.key)); }

    _index(key: string): number { return this.#inner.findIndex(x => x.key === key); }
    _value(key: string): string { return rand.get(key); }
    _send(key: string) { this.#inner.splice(this._index(key), 1); }
    _append(key: string) { this.#inner.push({key,value:rand.get(key)}); }
    _receive(pkey: string, key: string, after: boolean) { this.#inner.splice(this._index(pkey)+(after ? 1 : 0), 0, {key,value:rand.get(key)}); }
    _insert(index: number, key: string, after: boolean) { this.#inner.splice(index+(after ? 1 : 0), 0, {key,value:rand.get(key)}); }
    _clone(pkey: string, key: string, after: boolean): string {
      const newItem = SortableItems._newItem(rand.get(key));
      if (pkey === "") { this.#inner.push(newItem); } else { this.#inner.splice(this._index(pkey)+(after ? 1 : 0), 0, newItem); }
      return newItem.key;
    }
    get _inner(): KeyValue[] { return this.#inner; }
    get _keys(): string[] { return this.#inner.map(x => x.key); }
    set _state(state: DragState) { this.#state = state; }

    static _newItem(value?: string): KeyValue { const key = rand.gen(value); return {key,value: value ?? key}; }
    static _newItems(values: string[]): KeyValue[] { return values.map(x => SortableItems._newItem(x)); }
  }

  type PointerEventHandler = (ev: PointerEvent) => void;
  type TriggerButton = "main" | "sub" | "middle" | "back" | "forward" | "ctrl" | "alt" | "shift" | "meta";
  type Point = { x: number, y: number };
  type KeyValue = {
    key: string,
    value: string,
  };
  type TransitionParams = {
    duration: number,
    easing: EasingFunction,
  };
  type DragContext = "stay" | "leave" | "return" | "others";
  type DragState = "ready" | "dragging" | "idle";
  type VoidFn = () => void;

  class RandKey {
    static ALPHABETIC = [
      ...[...Array(25)].map((_, i) => i+65),
      ...[...Array(25)].map((_, i) => i+97),
    ];
    static CHAR_COUNT = 50;
    static LEN = 5;
    #store = new Map<string, string>();

    static #code(): number { return RandKey.ALPHABETIC[Math.trunc(Math.random() * RandKey.CHAR_COUNT)]; }
    static #gen(): string { return String.fromCharCode(...Array(RandKey.LEN).fill(null).map(_ => RandKey.#code())); }
    gen(value?: string): string {
      let key = RandKey.#gen();
      while (this.#store.has(key)) { key = RandKey.#gen(); }
      this.#store.set(key, value ?? key);
      return key;
    }
    get(key: string): string { return this.#store.get(key) ?? "NOT_STORED"; }
    set(key: string, value: string) { this.#store.set(key, value); }
    del(key?: string) { if (key) this.#store.delete(key); }
  }
  class ListenerHandler {
    #listeners: (VoidFn)[] = [];
    start(pointerup: PointerEventHandler, pointercancel: PointerEventHandler, pointermove?: PointerEventHandler) {
      this.#listeners.push(on(window, "pointerup", pointerup));
      this.#listeners.push(on(window, "pointercancel", pointercancel));
      if (pointermove) { this.#listeners.push(on(window, "pointermove", throttle(pollingRate, pointermove))); }
    }
    stop() {
      if (this.#listeners.length <= 0) { return; }
      this.#listeners.forEach(x => x());
      this.#listeners = [];
    }
  }
  class Shadow {
    static SHOW = "visibility: visible;";
    static HIDE = "visibility: hidden;";
    static FIT = "width: fit-contents; height: fit-contents;";
    static FREE = "";
    elem: HTMLElement | undefined = $state.raw();
    pt = $state(point(0, 0));
    rendering = $state(false);
    cssVisibility = $state(Shadow.HIDE);
    cssSize;
    isGhost;
    #anchor = point(0, 0);

    constructor(ghost?: Snippet<[string]>) {
      this.isGhost = ghost !== undefined;
      this.cssSize = this.isGhost ? Shadow.FIT : Shadow.FREE;
    }
    prepare(ev: PointerEvent, el: HTMLElement, standby: boolean) {
      if (!standby) { return; }
      this.rendering = true;
      let anchor: Point | undefined;
      if (this.isGhost) {
        anchor = Shadow.anchorGhost(ev);
        this.cssSize = Shadow.FIT;
      } else {
        const rect = el.getBoundingClientRect();
        anchor = Shadow.anchorDefault(rect);
        this.cssSize = `width: ${rect.width}px; height: ${rect.height}px;`
      }
      point(anchor.x, anchor.y, this.#anchor);
    }
    show() { this.cssVisibility = Shadow.SHOW; }
    hide() { this.rendering = false; this.cssVisibility = Shadow.HIDE; }
    move(vector: Point) { point(this.#anchor.x+vector.x, this.#anchor.y+vector.y, this.pt); }
    setOffset() {
      if (!this.isGhost || !this.elem) { return; }
      const rect = this.elem.getBoundingClientRect();
      point(this.#anchor.x-rect.width/2, this.#anchor.y-rect.height/2, this.#anchor);
    }
    static anchorDefault(rect: DOMRect): Point { return point(rect.x, rect.y); }
    static anchorGhost(ev: PointerEvent): Point { return point(ev.clientX, ev.clientY); }
  }
  class MultiSelect {
    #all: SvelteSet<string> = new SvelteSet();
    #main = "";
    #sub: Set<string> = new Set();
    #standby = false;
    #deselect = false;
    #items;
    #multi;
    #trigger;

    constructor(items: SortableItems, multi: boolean, trigger: TriggerButton[]) {
      this.#items = items;
      this.#multi = multi;
      this.#trigger = createTriggerNumber(trigger);
    }
    matchTrigger(trigger: number): boolean { return trigger === this.#trigger; }
    start(key: string, trigger: number) {
      this.#standby = false;
      if (this.#multi && this.matchTrigger(trigger)) {
        this.#standby = true;
        this.#deselect = this.#all.has(key);
        this.#replaceMain(key);
      }
    }
    toggle() {
      if (!this.#standby) { return; }
      if (this.#deselect) {
        this.#all.delete(this.#main);
        this.#main = "";
      } else {
        this.#sub.add(this.#main);
        this.#main = "";
      }
      this.#standby = false;
    }
    cancel(key: string) {
      if (!this.#multi) { return; }
      this.#replaceMain(key);
      this.#standby = false;
    }
    has(key: string) { return this.#all.has(key); }
    clear() {
      this.#all.clear();
      this.#main = "";
      this.#sub.clear();
      this.#standby = false;
    }
    #replaceMain(key: string) {
      if (this.#main === key) { return; }
      if (this.#main !== "") {
        this.#all.delete(this.#main);
        this.#sub.add(this.#main);
      }
      this.#all.add(key);
      this.#sub.delete(key);
      this.#main = key;
    }
    get follower(): string[] { return this.#items._keys.filter(x => this.#sub.has(x)); }
  }
  class DragTarget {
    static EMPTY_ARRAY = [];
    #items: SortableItems | undefined;
    #group: KeyValue | undefined;
    #key = "";
    #follower: string[] = DragTarget.EMPTY_ARRAY;

    set(key: string, items?: SortableItems, group?: KeyValue, follower?: string[]) {
      if (items) { this.#items = items; }
      if (group) { this.#group = group; }
      this.#key = key;
      if (follower) { this.#follower = follower; }
    }
    delete() { this.#items?.extract(this.#items._index(this.#key)); }
    send(key?: string) { this.#items?._send(key ?? this.#key); }
    push(key: string) { this.#items?._append(key); }
    receive(key: string, after: boolean) { this.#items?._receive(this.#key, key, after); }
    insert(index: number, key: string, after: boolean) { this.#items?._insert(index, key, after); }
    clone(key: string, after: boolean): string { return this.#items?._clone(this.#key, key, after) ?? ""; }
    clear() {
      this.#items = undefined;
      this.#group = undefined;
      this.#key = "";
      this.#follower = DragTarget.EMPTY_ARRAY;
    }
    get items(): SortableItems | undefined { return this.#items; }
    get group(): KeyValue | undefined { return this.#group; }
    get key(): string { return this.#key; }
    get index(): number { return this.#items?._index(this.#key) ?? NaN; }
    get follower(): string[] { return this.#follower.filter(x => x !== this.#key); }
  }
  class DraggingHandler {
    #base = new DragTarget();
    #from = new DragTarget();
    #to = new DragTarget();
    #mode = "std";
    #oldIndex = NaN;
    #dest: TargetKeyHolder;

    constructor(dest: TargetKeyHolder) { this.#dest = dest; }
    start(mode: SortableMode, items: SortableItems, group: KeyValue, key: string, follower?: string[]) {
      this.#mode = mode;
      this.#base.set(key, items, group, follower);
      this.#from.set(key, items, group);
      this.#oldIndex = this.#base.index;
    }
    end(): boolean {
      if (this.#mode === "swap") { this.#swap(); }
      if (this.#isNotMove()) { return false; }
      const follower = this.#base.follower.toReversed();
      if (this.#isCloned()) {
        follower.forEach(key => this.#cloneFollower(key));
      } else {
        follower.forEach(key => this.#moveFollower(key));
      }
      return true;
    }
    clear() {
      this.#base.clear();
      this.#from.clear();
      this.#to.clear();
      this.#mode = "std";
      this.#oldIndex = NaN;
    }
    sort(items: SortableItems, group: KeyValue, key: string, sort: boolean, guard: TransitionGuard) {
      if (this.#isNotSetFrom()) { return; }
      this.#to.set(key, items, group);
      switch (this.#mode) {
        case "std": this.#sortStd(sort); break;
        case "clone": this.#sortClone(sort, guard); break;
        case "swap": this.#sortSwap(sort); break;
      }
    }
    append(items: SortableItems, group: KeyValue, sort: boolean, guard: TransitionGuard) {
      if (this.#isNotSetFrom()) { return; }
      this.#to.set("", items, group);
      switch (this.#mode) {
        case "std": this.#appendStd(sort); break;
        case "clone": this.#appendClone(sort, guard); break;
        case "swap": this.#dest.clear(); break;
      }
    }
    #sortStd(sort: boolean) {
      if (sort) { this.#move(); return; }
      switch (this.#getDragContext()) {
        case "stay": break;
        case "leave": this.#move(); break;
        case "return": this.#restore(); break;
        case "others": this.#move(); break;
      }
    }
    #sortClone(sort: boolean, guard: TransitionGuard) {
      let move = false;
      switch (this.#getDragContext()) {
        case "stay": move = sort; break;
        case "leave": this.#clone(guard); break;
        case "return": this.#delete(guard); move = sort; break;
        case "others": move = true; break;
      }
      if (move) { this.#move(); }
    }
    #sortSwap(sort: boolean) {
      if (sort) { this.#dest.set(this.#to.key); return; }
      switch (this.#getDragContext()) {
        case "stay": this.#to.set(""); this.#dest.clear(); break;
        case "leave": this.#dest.set(this.#to.key); break;
      }
    }
    #appendStd(sort: boolean) {
      switch (this.#getDragContext()) {
        case "stay": break;
        case "leave": this.#push(); break;
        case "return": sort ? this.#push() : this.#restore(); break;
        case "others": this.#push(); break;
      }
    }
    #appendClone(sort: boolean, guard: TransitionGuard) {
      switch (this.#getDragContext()) {
        case "stay": break;
        case "leave": this.#clone(guard); break;
        case "return": this.#delete(guard); break;
        case "others": this.#push(); break;
      }
    }
    #restore() {
      this.#from.send();
      this.#base.insert(this.#oldIndex, this.#base.key, false);
      this.#from.set(this.#base.key, this.#base.items, this.#base.group);
    }
    #move() {
      const after = this.#isInsertAfter(this.#from);
      this.#from.send();
      this.#to.receive(this.#from.key, after);
      this.#from.set(this.#from.key, this.#to.items, this.#to.group);
    }
    #push() {
      this.#from.send();
      this.#to.push(this.#from.key);
      this.#from.set(this.#from.key, this.#to.items, this.#to.group);
    }
    #clone(guard: TransitionGuard) {
      const newKey = this.#to.clone(this.#from.key, false);
      this.#from.set(newKey, this.#to.items, this.#to.group);
      guard.add(newKey);
    }
    #delete(guard: TransitionGuard) {
      guard.delete(this.#from.key)
      this.#from.delete();
      this.#from.set(this.#base.key, this.#base.items, this.#base.group);
    }
    #swap() {
      this.#dest.clear();
      if (this.#isNotSetTo()) { return; }
      const from = this.#from.index;
      this.#from.send();
      this.#to.receive(this.#from.key, false);
      this.#to.send();
      this.#from.insert(from, this.#to.key, false);
      this.#from.set(this.#from.key, this.#to.items, this.#to.group);
    }
    #moveFollower(key: string) {
      this.#base.send(key);
      this.#from.receive(key, true);
    }
    #cloneFollower(key: string) {
      this.#from.clone(key, true);
    }
    #isStaying(target: DragTarget): boolean { return this.#base.group?.key === target.group?.key; }
    #getDragContext(): DragContext {
      if (this.#isStaying(this.#from) && this.#isStaying(this.#to)) {
        return "stay"; // move within same group
      } else if (this.#isStaying(this.#from) && !this.#isStaying(this.#to)) {
        return "leave"; // move to other group
      } else if (!this.#isStaying(this.#from) && this.#isStaying(this.#to)) {
        return "return"; // come back to the group
      } else {
        return "others"; // move between other groups
      }
    }
    #isNotSetFrom(): boolean { return !(this.#oldIndex >= 0); }
    #isNotSetTo(): boolean { return this.#to.key === ""; }
    #isInsertAfter(from: DragTarget): boolean { return from.group?.key === this.#to.group?.key && from.index < this.#to.index; }
    #isNotMove(): boolean { return this.#base.group?.key === this.#from.group?.key && this.#base.key === this.#from.key && this.#oldIndex === this.#from.index; }
    #isCloned(): boolean { return this.#mode === "clone" && this.#base.key !== this.#from.key; }
    get group(): KeyValue | undefined { return this.#base.group; }
  }
  class DragHandler {
    #key = $state("");
    #target;
    #pointer;
    #guard;
    #standby = false;
    #dragging = $state(false);
    #trigger;

    constructor(tp: TransitionParams, trigger: TriggerButton[], tolerance: number, skey: TargetKeyHolder) {
      this.#target = new DraggingHandler(skey);
      this.#pointer = new PointerVector(tolerance);
      this.#guard = new TransitionGuard(tp.duration);
      this.#trigger = createTriggerNumber(trigger);
    }
    matchTrigger(trigger: number): boolean { return trigger === this.#trigger; }
    prepare(ev: PointerEvent, key: string, trigger: number): boolean {
      this.#standby = false;
      if (this.matchTrigger(trigger)) {
        this.#standby = true;
        this.#key = key;
        this.#pointer.init(ev);
        this.#target.clear();
        this.#guard.clear();
      }
      return this.#standby;
    }
    isStandby(): boolean { return this.#standby && !this.#dragging; }
    start(ev: PointerEvent, mode: SortableMode, items: SortableItems, group: KeyValue, follower: string[]): boolean {
      if (!this.#standby) { return false; }
      if (this.#pointer.reachMinDistance(ev)) { this.#start(mode, items, group, follower); }
      return this.#dragging;
    }
    isAcceptable(key: string, group: string, accept?: string[]): boolean {
      if (!this.#dragging || this.#guard.exists(key) || !this.#target.group) { return false; }
      if (!accept || this.#target.group.key === group) { return true; }
      return accept.includes(this.#target.group.value);
    }
    isSortable(sort: boolean, group: string): boolean {
      return sort || this.#target.group?.key !== group;
    }
    sort(items: SortableItems, group: KeyValue, key: string, sort: boolean) {
      this.#guard.timed(key);
      this.#target.sort(items, group, key, sort, this.#guard);
    }
    append(items: SortableItems, group: KeyValue, sort: boolean) {
      this.#target.append(items, group, sort, this.#guard);
    }
    end(): boolean {
      return this.#target.end();
    }
    vector(ev: PointerEvent): Point { return this.#pointer.vector(ev); }
    deactivate() { this.#key = ""; this.#dragging = false; }

    #start(mode: SortableMode, items: SortableItems, group: KeyValue, follower: string[]) {
      this.#dragging = true;
      this.#standby = false;
      this.#guard.start(this.#key);
      this.#target.clear();
      this.#target.start(mode, items, group, this.#key, follower);
    }
    get key(): string { return this.#key; }
    get active(): boolean { return this.#key !== ""; }
    get dragging(): boolean { return this.#dragging; }
  }
  class TransitionGuard {
    #set: Set<string> = new Set();
    #interval;

    constructor(interval: number) { this.#interval = interval; }
    start(key: string) {
      this.#set.clear();
      this.#set.add(key);
    }
    add(key: string) { this.#set.add(key); }
    delete(key: string) { this.#set.delete(key); }
    timed(key: string) {
      this.#set.add(key);
      setTimeout(()=>{this.#set.delete(key)}, this.#interval);
    }
    clear() { this.#set.clear(); }
    exists(key: string): boolean { return this.#set.has(key); }
  }
  class PointerVector {
    #tolerance;
    #initial: Point = point(0, 0);
    #current: Point = point(0, 0);

    constructor(tolerance: number) { this.#tolerance = tolerance; }
    init(ev: PointerEvent) {
      point(ev.clientX, ev.clientY, this.#initial);
      point(0, 0, this.#current);
    }
    reachMinDistance(ev: PointerEvent): boolean {
      this.#refresh(ev);
      return this.#distance() > this.#tolerance;
    }
    vector(ev: PointerEvent): Point {
      this.#refresh(ev);
      return this.#difference();
    }
    #refresh(ev: PointerEvent) { point(ev.clientX, ev.clientY, this.#current); }
    #difference(): Point { return point(this.#current.x-this.#initial.x, this.#current.y-this.#initial.y); }
    #distance(): number { return Math.sqrt(Math.pow(this.#current.x-this.#initial.x,2)+Math.pow(this.#current.y-this.#initial.y,2)); }
  }
  class TargetKeyHolder {
    #key = $state("");
    set(key: string) { this.#key = key; }
    clear() { this.#key = ""; }
    is(key: string): boolean { return this.#key === key; }
    get key(): string { return this.#key; }
  }
  class DelayRunner {
    #delay;
    #immed = false;
    #tid: ReturnType<typeof setTimeout> | undefined;

    constructor(delay: number) {
      if (delay <= 0) { this.#immed = true; }
      this.#delay = delay;
    }
    run(confirm: boolean, fn: VoidFn) {
      if (!confirm || this.#immed) { fn(); return; }
      this.cancel();
      this.#tid = setTimeout(fn, this.#delay);
    }
    cancel() {
      if (!this.#tid) { return; }
      clearTimeout(this.#tid);
      this.#tid = undefined;
    }
    exists(confirm: boolean): boolean { return confirm && !this.#immed; }
  }

  function point(x: number, y: number, obj?: Point): Point {
    if (!obj) { return {x, y}; }
    obj.x = x;
    obj.y = y;
    return obj;
  }
  function createTriggerNumber(buttonsArray: TriggerButton[]): number {
    let ret = 0;
    const buttons = new Set(buttonsArray);
    for (const button of buttons.keys()) {
      switch (button) {
        case "main":    ret += 0b000000001; break;
        case "sub":     ret += 0b000000010; break;
        case "middle":  ret += 0b000000100; break;
        case "back":    ret += 0b000001000; break;
        case "forward": ret += 0b000010000; break;
        case "ctrl":    ret += 0b000100000; break;
        case "alt":     ret += 0b001000000; break;
        case "shift":   ret += 0b010000000; break;
        case "meta":    ret += 0b100000000; break;
      }
    }
    return ret;
  }
  function getTriggerNumber(ev: PointerEvent): number {
    let num = ev.buttons;
    if (ev.ctrlKey)  { num += 0b000100000; }
    if (ev.altKey)   { num += 0b001000000; }
    if (ev.shiftKey) { num += 0b010000000; }
    if (ev.metaKey)  { num += 0b100000000; }
    return num;
  }

  const rand = new RandKey();
  const dest = new TargetKeyHolder();
  const drag = new DragHandler(tp, triggerDrag, minDistance, dest);
  const delay = new DelayRunner(confirmTime);
  const [s, r] = crossfade(tp);
  const ondragstart = () => false;

  import { type Snippet, untrack, onDestroy } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { on } from "svelte/events";
  import { type EasingFunction, crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { type SVSClass, VARIANT, PARTS, fnClass, throttle } from "./core";
</script>

<script lang="ts">
  let { items, item, ghost, name, mode = "std", accept, sort = true, multiple = false, draggable = true, appendable = false, confirm = false, styling, variant = $bindable("") }: SortableProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const group: KeyValue = SortableItems._newItem(name);
  const elems: HTMLElement[] = $state([]);
  const shadow = new Shadow(ghost);
  const selector = new MultiSelect(items, multiple, triggerSelect);
  const listener = new ListenerHandler();

  // *** Reactive Handlers *** //
  $effect.pre(() => { drag.dragging; drag.active;
    untrack(() => setDragState());
  });
  function setDragState() {
    if (drag.dragging) {
      items._state = "dragging";
    } else if (drag.active) {
      items._state = "ready";
    } else {
      items._state = "idle";
    }
  }
  $effect(() => { shadow.rendering;
    untrack(() => adjustShadowPosition());
  });
  function adjustShadowPosition() {
    if (!shadow.rendering) { return; }
    shadow.setOffset();
  }

  // *** Utilities *** //
  function isSelected(key: string): boolean {
    return selector.has(key) || drag.key === key || dest.is(key);
  }
  function preDown(ev: PointerEvent): number {
    ev.preventDefault();
    ev.stopPropagation();
    if (drag.dragging) { return 0; }
    cleanup();
    const trigger = getTriggerNumber(ev);
    if (!drag.matchTrigger(trigger) && !selector.matchTrigger(trigger)) { return 0; }
    return trigger;
  }
  function postDrag() {
    if (drag.dragging && drag.end()) {
      selector.clear();
    }
  }
  function cleanup() {
    delay.cancel();
    drag.deactivate();
    shadow.hide();
    listener.stop();
  }

  // *** Event Handlers *** //
  function downF(key: string, el: HTMLElement): PointerEventHandler {
    return (ev: PointerEvent) => {
      const trigger = preDown(ev);
      if (!trigger) { return; }
      el.releasePointerCapture(ev.pointerId);
      const onmove = drag.prepare(ev, key, trigger) ? move : undefined;
      shadow.prepare(ev, el, drag.isStandby());
      selector.start(key, trigger);
      listener.start(up, cancel, onmove);
    };
  }
  function move(ev: PointerEvent) {
    if (drag.isStandby()) {
      if (!drag.start(ev, mode, items, group, selector.follower)) { return; }
      shadow.show();
      selector.cancel(drag.key);
    }
    if (drag.dragging) { shadow.move(drag.vector(ev)); }
  }
  function enterF(key: string): PointerEventHandler {
    return (ev: PointerEvent) => {
      if (!drag.isAcceptable(key, group.key, accept)) { return; }
      if (delay.exists(confirm) && drag.isSortable(sort, group.key)) { dest.set(key); }
      delay.run(confirm, () => drag.sort(items, group, key, sort));
    };
  }
  function leave(ev: PointerEvent) {
    dest.clear();
    delay.cancel();
  }
  function up(ev: PointerEvent) {
    selector.toggle()
    postDrag();
    cleanup();
  }
  function cancel(ev: PointerEvent) {
    postDrag();
    cleanup();
  }
  function groupenter(ev: PointerEvent) {
    if (items.isEmpty() || appendable) {
      if (!drag.isAcceptable(group.key, group.key, accept)) { return; }
      delay.run(confirm, () => drag.append(items, group, sort));
    }
  }
  function groupleave(ev: PointerEvent) {
    delay.cancel();
  }

  onDestroy(() => cleanup());
</script>

<!---------------------------------------->

<ul class={cls(PARTS.WHOLE, variant)} onpointerenter={drag.active ? groupenter : undefined} onpointerleave={drag.active ? groupleave : undefined}>
  {#each items._inner as {key, value}, i (key)}
    {@const style = "touch-action:none;"}
    {@const itemStatus = isSelected(key) ? VARIANT.ACTIVE : variant}
    {@const onpointerdown = draggable ? downF(key, elems[i]) : undefined}
    {@const onpointerenter = drag.active ? enterF(key) : undefined}
    {@const onpointerleave = drag.active ? leave : undefined}
    <li bind:this={elems[i]} class={cls(PARTS.MAIN, itemStatus)} in:s={{key}} out:r={{key}} animate:flip={tp} {style} {onpointerdown} {onpointerenter} {onpointerleave} {ondragstart}>
      {@render item(value, itemStatus, downF(key, elems[i]))}
    </li>
  {/each}
</ul>
{#if shadow.rendering}
  {@const style = `opacity: 0.5; pointer-events: none; position: fixed; left: ${shadow.pt.x}px; top: ${shadow.pt.y}px; ${shadow.cssVisibility} ${shadow.cssSize}`}
  <ul style="display: contents;">
    <li bind:this={shadow.elem} class={shadow.isGhost ? undefined : cls(PARTS.MAIN, variant)} {style}>
      {#if shadow.isGhost}
        {@render ghost!(items._value(drag.key))}
      {:else}
        {@render item(items._value(drag.key), variant, ()=>cleanup())}
      {/if}
    </li>
  </ul>
{/if}
