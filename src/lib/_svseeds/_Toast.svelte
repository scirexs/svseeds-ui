<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToastProps {
    toaster: Toaster;
    children: Snippet<[ToastItem, string]>; // Snippet<[item,variant]>
    animation?: number; // (200)
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole" popover="manual">
    {#each toaster.toasts as item (item.id)}
      <div class="middle" animate:flip={{ duration: animation }}>
        <div class="main">
          {children(item, variant)}
        </div>
      </div>
    {/each}
  </div>
  ```
  ### Exports
  ```ts
  function createToaster(options?: ToasterOptions): Toaster

  class Toaster {
    readonly toasts: ToastItem[];
    add(message: string, options?: ToastAddOptions): string;
    dismiss(id: string): void;
    remove(id: string): void;
    clear(): void;
    pause(id: string): void;
    resume(id: string, extend?: boolean): void;
  }
  ```
-->
<script module lang="ts">
  export interface ToastProps {
    toaster: Toaster;
    children: Snippet<[ToastItem, string]>; // Snippet<[item,variant]>
    animation?: number; // (200)
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ToastReqdProps = "toaster" | "children";
  export type ToastBindProps = never;

  export interface ToasterOptions {
    duration?: number;
  }
  export interface ToastAddOptions {
    type?: string;
    duration?: number;
  }
  export interface ToastItem {
    readonly id: string;
    readonly message: string;
    readonly type: string;
    readonly visible: boolean;
  }

  export function createToaster(options?: ToasterOptions): Toaster {
    return new Toaster(options);
  }

  const DEFAULT_DURATION = 200;
  const DEFAULT_DISMISS = 30000;
  const noMotion = shouldReduceMotion();
  const preset = "svs-toast";
  let idSeq = 0;

  function resolveDuration(value: number | undefined, fallback: number): number {
    if (value !== undefined && !Number.isFinite(value)) return Infinity;
    return value !== undefined && isUnsignedInteger(value) ? value : fallback;
  }
  function label(item: ToastItem): string {
    return item.type ? `${item.type} message` : "message";
  }

  class ToastRecord implements ToastItem {
    readonly id: string;
    readonly message: string;
    readonly type: string;
    readonly duration: number;
    #visible = $state(false);
    #dismissed = $state(false);
    timeoutId?: number;

    constructor(id: string, message: string, type: string, duration: number) {
      this.id = id;
      this.message = message;
      this.type = type;
      this.duration = duration;
    }
    get visible(): boolean {
      return this.#visible;
    }
    set visible(v: boolean) {
      this.#visible = v;
    }
    get dismissed(): boolean {
      return this.#dismissed;
    }
    dismiss() {
      this.#dismissed = true;
      this.#visible = false;
    }
  }

  export class Toaster {
    #toasts = $state<ToastRecord[]>([]);
    #default: number;
    #uid = `svs-toast-${idSeq++}`;
    #seq = 0;

    constructor(options?: ToasterOptions) {
      this.#default = resolveDuration(options?.duration, DEFAULT_DISMISS);
    }
    get toasts(): ToastItem[] {
      return this.#toasts;
    }
    add(message: string, options?: ToastAddOptions): string {
      const duration = resolveDuration(options?.duration, this.#default);
      const toast = new ToastRecord(`${this.#uid}-${this.#seq++}`, message, options?.type ?? "", duration);
      this.#toasts.push(toast);
      queueMicrotask(() => {
        if (!toast.dismissed && this.#toasts.includes(toast)) toast.visible = true;
      });
      this.#arm(toast, false);
      return toast.id;
    }
    dismiss(id: string) {
      const toast = this.#find(id);
      if (!toast) return;
      this.#clear(toast);
      toast.dismiss();
    }
    remove(id: string) {
      const toast = this.#find(id);
      if (toast) this.#clear(toast);
      this.#toasts = this.#toasts.filter((x) => x.id !== id);
    }
    clear() {
      this.#toasts.forEach((toast) => this.dismiss(toast.id));
    }
    pause(id: string) {
      const toast = this.#find(id);
      if (!toast) return;
      this.#clear(toast);
    }
    resume(id: string, extend?: boolean) {
      const toast = this.#find(id);
      if (!toast) return;
      this.#arm(toast, !!extend);
    }
    #find(id: string): ToastRecord | undefined {
      return this.#toasts.find((toast) => toast.id === id);
    }
    #clear(toast: ToastRecord) {
      if (toast.timeoutId === undefined) return;
      clearTimeout(toast.timeoutId);
      toast.timeoutId = undefined;
    }
    #arm(toast: ToastRecord, extend: boolean) {
      this.#clear(toast);
      if (!Number.isFinite(toast.duration)) return;
      if (typeof window === "undefined") return;
      toast.timeoutId = window.setTimeout(() => this.dismiss(toast.id), extend ? toast.duration * 1.5 : toast.duration);
    }
  }

  import { type Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger, shouldReduceMotion } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { toaster, children, animation = -1, styling, variant = VARIANT.NEUTRAL }: ToastProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const dur = $derived(noMotion ? 0 : !isUnsignedInteger(animation) ? DEFAULT_DURATION : animation);
  const style = "position:fixed;background-color:transparent;pointer-events:none;";
  let region = $state<HTMLDivElement>();
  let open = $state(false);
  const shown = new Set<string>();
  const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // *** Reactive Handlers *** //
  $effect(() => {
    const has = toaster.toasts.length > 0;
    if (has && !open) {
      region?.showPopover();
      open = true;
    } else if (!has && open) {
      region?.hidePopover();
      open = false;
    }
  });

  $effect(() => {
    const snapshot = toaster.toasts.map((item) => ({
      id: item.id,
      visible: item.visible,
      dismissed: item instanceof ToastRecord && item.dismissed,
    }));
    const current = new Set(snapshot.map((item) => item.id));
    for (const [id, timer] of removeTimers) {
      if (!current.has(id)) {
        clearTimeout(timer);
        removeTimers.delete(id);
        shown.delete(id);
      }
    }
    for (const item of snapshot) {
      if (item.visible) {
        shown.add(item.id);
        const timer = removeTimers.get(item.id);
        if (timer !== undefined) {
          clearTimeout(timer);
          removeTimers.delete(item.id);
        }
      } else if ((shown.has(item.id) || item.dismissed) && !removeTimers.has(item.id)) {
        const drop = () => {
          removeTimers.delete(item.id);
          shown.delete(item.id);
          toaster.remove(item.id);
        };
        removeTimers.set(item.id, setTimeout(drop, dur));
      }
    }
  });

  // *** Event Handlers *** //
  function onkeydown(ev: KeyboardEvent) {
    if (!open) return;
    if (ev.key !== "F6") return;
    if (ev.composed) return;
    region?.focus();
  }
</script>

<!---------------------------------------->
<svelte:body {onkeydown} />

<div
  bind:this={region}
  class={cls(PARTS.WHOLE, variant)}
  role="region"
  tabindex="-1"
  popover="manual"
  aria-label={`${toaster.toasts.length} notifications`}
  {style}
>
  {#each toaster.toasts as item (item.id)}
    {@const v = item.visible ? variant : VARIANT.INACTIVE}
    <div
      class={cls(PARTS.MIDDLE, v)}
      style="width:fit-content;height:fit-content;overflow:hidden;"
      tabindex="-1"
      animate:flip={{ duration: dur }}
    >
      <div
        class={cls(PARTS.MAIN, v)}
        role="dialog"
        aria-modal="false"
        aria-label={label(item)}
        tabindex="0"
        style="pointer-events:auto;"
        onpointerenter={() => toaster.pause(item.id)}
        onpointerleave={(ev) => toaster.resume(item.id, ev.pointerType === "touch")}
        onpointercancel={(ev) => toaster.resume(item.id, ev.pointerType === "touch")}
      >
        {@render children(item, v)}
      </div>
    </div>
  {/each}
</div>
