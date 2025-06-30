<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToastProps {
    children: Snippet<[string, string, string, string]>; // Snippet<[message,type,id,variant]>
    name?: string;
    timeout?: number;
    duration?: number; // (200)
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    {#each}
      <div class="middle" animate:flip={{ duration }}>
        <div class="main">
          {children}
        </div>
      </div>
    {/each}
  </div>
  ```
  ### Exports
  ```ts
  /**
   * Displays a toast notification.
   *
   * @param message - Text message to display in the toast
   * @param type - Optional toast type/category (also used for part of aria-label)
   * @param name - Unique identifier for the toast component
   * @param timeout - Custom auto-dismiss timeout in milliseconds
   * @returns ID of the displayed toast
   */
  function toast(message: string, type?: string, name?: string, timeout?: number): string
  /**
   * Removes a specific toast notification.
   *
   * @param id - ID of the toast to remove
   * @param name - Unique identifier for the toast component
   */
  function removeToast(id: string, name?: string)
  ```
-->
<script module lang="ts">
  export interface ToastProps {
    children: Snippet<[string, string, string, string]>; // Snippet<[message,type,id,variant]>
    name?: string;
    timeout?: number;
    duration?: number; // (200)
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ToastReqdProps = "children";
  export type ToastBindProps = "variant";

  export function toast(message: string, type?: string, name?: string, timeout?: number): string {
    return core.add(message, type, name, timeout);
  }
  export function removeToast(id: string, name?: string) {
    core.remove(id, name);
  }

  const preset = "svs-toast";
  const DEFALT_DURATION = 200;

  function isPrefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function isValidTimeout(timeout?: number): timeout is number {
    return !!timeout && isUnsignedInteger(timeout);
  }
  class ToastCore {
    #containers: Map<string, ToastContainer> = new Map();
    #uniqueId;

    constructor() {
      this.#uniqueId = new UniqueId();
    }
    register(container: ToastContainer, name?: string) {
      this.#containers.set(this.#uniqueId.register(name), container);
    }
    add(message: string, type?: string, name?: string, timeout?: number): string {
      return this.#containers.get(name ?? this.#uniqueId.default)?.addToast(type ?? "", message, timeout) ?? "";
    }
    remove(id: string, name?: string) {
      this.#containers.get(name ?? this.#uniqueId.default)?.hideToast(id);
    }
  }
  class UniqueId {
    #default = "";
    #ids: Set<string> = new Set();
    get default(): string {
      return this.#default;
    }
    register(name?: string): string {
      const id = name ? name : elemId.id;
      if (this.#ids.has(id)) return "";
      if (!this.#default) this.#default = id;
      this.#ids.add(id);
      return id;
    }
  }
  class ToastContainer {
    #open: boolean = $state(false);
    #style: string;
    #keydownFn = (ev: KeyboardEvent) => {};
    element = $state<HTMLDivElement>();
    toasts: Toast[] = $state([]);
    onkeydown = $derived(this.#open ? this.#keydownFn : undefined);

    constructor(duration: number, onkeydown: (ev: KeyboardEvent) => void, timeout?: number) {
      this.#style = `position:fixed;background-color:transparent;pointer-events:none;`;
      this.#keydownFn = onkeydown;
      Toast.init(duration, timeout);
    }
    addToast(type: string, message: string, timeout?: number): string {
      if (!this.toasts.length) this.#show();
      const toast = new Toast(type, message, (id) => this.remove(id), timeout);
      this.toasts.push(toast);
      return toast.id;
    }
    hideToast(id: string) {
      this.toasts.find((x) => x.id === id)?.hide();
    }
    remove(id: string) {
      this.toasts = this.toasts.filter((x) => x.id !== id);
      if (!this.toasts.length) this.hide();
    }
    #show() {
      this.element?.showPopover();
      this.#open = true;
    }
    hide() {
      this.element?.hidePopover();
      this.#open = false;
    }

    get open(): boolean {
      return this.#open;
    }
    get style(): string {
      return this.#style;
    }
  }
  class Toast {
    static #DEFALT_TIMEOUT = Infinity;
    static #DURATION = 0;
    #isVisible = $state(false);
    #id: string;
    #type: string;
    #message: string;
    #remove: (id: string) => void;
    #timeout: number;
    #timeoutId: number = 0;
    constructor(type: string, message: string, remove: (id: string) => void, timeout?: number) {
      this.#id = elemId.id;
      this.#type = type;
      this.#message = message;
      this.#remove = remove;
      this.#timeout = isValidTimeout(timeout) ? timeout : Toast.#DEFALT_TIMEOUT;
      this.#setAutoDismiss();
    }
    show() {
      this.#isVisible = true;
    }
    hide() {
      this.#isVisible = false;
      this.reset();
      setTimeout(() => {
        this.#remove(this.#id);
      }, Toast.#DURATION);
    }
    reset() {
      clearTimeout(this.#timeoutId);
    }
    restart(ev: PointerEvent) {
      this.#setAutoDismiss(ev.pointerType === "touch");
    }
    #setAutoDismiss(extend?: boolean) {
      if (!Number.isFinite(this.#timeout)) return;
      if (typeof window === "undefined") return;
      const timer = extend ? this.#timeout * 1.5 : this.#timeout;
      this.#timeoutId = window.setTimeout(() => this.hide(), timer);
    }

    static init(duration: number, timeout?: number) {
      Toast.#DEFALT_TIMEOUT = isValidTimeout(timeout) ? timeout : Infinity;
      Toast.#DURATION = duration;
    }
    get label(): string {
      return this.#type ? `${this.#type} message` : "message";
    }
    get isVisible(): boolean {
      return this.#isVisible;
    }
    get id(): string {
      return this.#id;
    }
    get type(): string {
      return this.#type;
    }
    get message(): string {
      return this.#message;
    }
  }
  const core = new ToastCore();

  import { type Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isUnsignedInteger } from "./core";
</script>

<script lang="ts">
  let { children, name, timeout, duration = -1, styling, variant = $bindable("") }: ToastProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  if (isPrefersReducedMotion()) duration = 0;
  if (!isUnsignedInteger(duration)) duration = DEFALT_DURATION;
  const container = new ToastContainer(duration, onkeydown, timeout);
  core.register(container, name);

  // *** Event Handlers *** //
  function mount(_node: HTMLDivElement, index: number) {
    setTimeout(() => container.toasts[index].show(), 0);
  }
  function enter(index: number): () => void {
    return () => container.toasts[index].reset();
  }
  function leave(index: number): (ev: PointerEvent) => void {
    return (ev) => container.toasts[index].restart(ev);
  }
  function onkeydown(ev: KeyboardEvent) {
    if (ev.key !== "F6") return;
    if (ev.composed) return;
    container.element?.focus();
  }
</script>

<!---------------------------------------->
<svelte:body onkeydown={container.onkeydown} />

<div bind:this={container.element} class={cls(PARTS.WHOLE, variant)} role="region" tabindex="-1" popover="manual" aria-label={`${container.toasts.length} notifications`} style={container.style}>
  {#each container.toasts as toast, i (toast.id)}
    {@const v = toast.isVisible ? variant : VARIANT.INACTIVE}
    <div class={cls(PARTS.MIDDLE, v)} style="width:fit-content;height:fit-content;overflow:hidden;" tabindex="-1" animate:flip={{ duration }}>
      <div class={cls(PARTS.MAIN, v)} role="dialog" aria-modal="false" aria-label={toast.label} tabindex="0" style="pointer-events:auto;" onpointerenter={enter(i)} onpointerleave={leave(i)} onpointercancel={leave(i)} use:mount={i}>
        {@render children(toast.message, toast.type, toast.id, variant)}
      </div>
    </div>
  {/each}
</div>
