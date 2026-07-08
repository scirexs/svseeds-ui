<!--
  @component
  ### Usage
  Use standalone; it owns a private `Calendar` for date selection and can later be coordinated by `DateField`.
  ```svelte
  <DateInput {...props} />
  ```
  ### Types
  ```ts
  interface DateInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "readonly" | "list" | "name"> {
    value?: Temporal.PlainDate; // bindable; undefined = empty
    open?: boolean; // bindable (false)
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    parse?: (text: string) => Temporal.PlainDate | undefined;
    format?: (d: Temporal.PlainDate) => string;
    locale?: string;
    name?: string;
    openOnFocus?: boolean; // (false)
    closeOnSelect?: boolean; // (true)
    left?: Snippet<[DateInputCtl, boolean, string]>;
    right?: Snippet<[DateInputCtl, boolean, string]>;
    transition?: TransitionProp;
    calendar?: Omit<CalendarProps, "value" | "display" | "min" | "max" | "isDisabled" | "variant">;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  type DateInputCtl = {
    toggle: () => void;
    show: () => void;
    hide: () => void;
    clear: () => void;
  };
  type TransitionProp = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  ```
  ### Anatomy
  ```svelte
  <span class="whole" data-*>
    <span class="left" conditional>{left}</span>
    <input class="main" type="text" role aria-* {...rest} />
    <span class="right" conditional>{right}</span>
    <input type="hidden" conditional: name />
    <div class="bottom" conditional: open transition:...><Calendar /></div>
  </span>
  ```
  ### Behavior
  - Without `parse`, the visible control is readonly and the private calendar is the only value entry path.
  - With `parse`, draft text commits on change or blur; invalid, disabled, and out-of-range dates revert.
  - `name` is assigned only to a hidden input whose value is ISO (`Temporal.PlainDate.toString()`), not the locale-formatted control.
  - `format` and `parse` are caller-coordinated; the default locale display is not necessarily parseable by a supplied parser.
-->
<script module lang="ts">
  export interface DateInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "readonly" | "list" | "name"> {
    value?: Temporal.PlainDate;
    open?: boolean;
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    isDisabled?: (d: Temporal.PlainDate) => boolean;
    parse?: (text: string) => Temporal.PlainDate | undefined;
    format?: (d: Temporal.PlainDate) => string;
    locale?: string;
    name?: string;
    openOnFocus?: boolean;
    closeOnSelect?: boolean;
    left?: Snippet<[DateInputCtl, boolean, string]>;
    right?: Snippet<[DateInputCtl, boolean, string]>;
    transition?: TransitionProp;
    calendar?: Omit<CalendarProps, "value" | "display" | "min" | "max" | "isDisabled" | "variant">;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export type DateInputCtl = {
    toggle: () => void;
    show: () => void;
    hide: () => void;
    clear: () => void;
  };
  export type TransitionProp = {
    fn?: (node: HTMLElement, params: any, options: { direction: "in" | "out" | "both" }) => import("svelte/transition").TransitionConfig;
    params?: unknown;
  };
  export type DateInputReqdProps = never;
  export type DateInputBindProps = "value" | "open" | "element";

  export interface DateInputContext extends SVSContext {
    get value(): Temporal.PlainDate | undefined;
    set value(v: Temporal.PlainDate | undefined);
    set element(v: HTMLInputElement | undefined);
    get ariaErrMsgId(): string | undefined;
    get id(): string | undefined;
    get describedby(): string | undefined;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }
  export const [_getDateInputContext, _setDateInputContext] = _createContext<DateInputContext>();
  export const _DATE_INPUT_PRESET = "svs-date-input";

  import { onDestroy, tick, untrack } from "svelte";
  import { VARIANT, PARTS, _createContext, _fnClass, shouldReduceMotion } from "./_core";
  import Calendar from "./Calendar.svelte";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { FocusEventHandler, FormEventHandler, HTMLInputAttributes, KeyboardEventHandler } from "svelte/elements";
  import type { SVSClass, SVSContext, SVSVariant } from "./_core";
  import type { CalendarProps } from "./Calendar.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), open = $bindable(false), min, max, isDisabled, parse, format: formatProp, locale, name, openOnFocus = false, closeOnSelect = true, left, right, transition, calendar, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, onchange: onchangeProp, oninvalid: oninvalidProp, oninput: oninputProp, onfocus: onfocusProp, onblur: onblurProp, onkeydown: onkeydownProp, id: idProp, "aria-describedby": ariaDescribedbyProp, "aria-invalid": ariaInvalid, class: c, ...rest }: DateInputProps = $props();
  const ctx = _getDateInputContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_DATE_INPUT_PRESET, styling ?? ctx?.styling));
  const uid = $props.id();
  const idOverlay = `${uid}-cal`;
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effValue = $derived(ctx ? ctx.value : value);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : undefined);
  const effId = $derived(ctx ? ctx.id : idProp);
  const effDescribedby = $derived(ctx ? ctx.describedby : ariaDescribedbyProp);
  const fmt = $derived.by(() => formatProp ?? ((d: Temporal.PlainDate) => d.toLocaleString(locale, { dateStyle: "medium" })));
  const reduced = $derived(typeof window !== "undefined" && shouldReduceMotion());
  const tfn = $derived(!reduced && transition?.fn ? transition.fn : noop);
  const tparams = $derived(transition?.params as any);

  function format(v = effValue): string {
    return v === undefined ? "" : fmt(v);
  }
  function setValue(v: Temporal.PlainDate | undefined) {
    if (ctx) ctx.value = v;
    else value = v;
  }
  function emitChange() {
    const ev = new Event("change");
    onchangeProp?.(ev as any);
    ctx?.onchange?.(ev);
  }
  function noop() {
    return {};
  }
  $effect(() => {
    if (ctx) ctx.element = element;
  });

  // *** States *** //
  // svelte-ignore state_referenced_locally
  let text = $state(format());
  // svelte-ignore state_referenced_locally
  let last = $state(format());
  let focused = $state(false);
  let overflow = $state({ x: false, y: false });
  let overlayElem = $state<HTMLDivElement>();
  let returning = false;

  // *** Reactive Handlers *** //
  const overlayStyle = $derived(`position:absolute;${overflow.x ? "right:0%;" : ""}${overflow.y ? "bottom:100%;" : ""}`);
  $effect(() => {
    effValue;
    focused;
    element;
    untrack(() => {
      if (!focused && !active()) sync();
    });
  });
  $effect(() => {
    if (!open) return;
    document.addEventListener("pointerdown", houtside);
    document.addEventListener("keydown", hkey);
    observeOverflow();
    tick().then(() => focusCalendar());
    return stopListening;
  });

  function active(): boolean {
    return typeof document !== "undefined" && element === document.activeElement;
  }
  function sync() {
    text = format();
    last = text;
  }
  function inRange(d: Temporal.PlainDate): boolean {
    if (min && Temporal.PlainDate.compare(d, min) < 0) return false;
    if (max && Temporal.PlainDate.compare(d, max) > 0) return false;
    return !isDisabled?.(d);
  }
  function read(src: string): Temporal.PlainDate | undefined {
    try {
      return parse?.(src);
    } catch {
      return undefined;
    }
  }
  function commit(src = text) {
    if (!parse) return sync();
    if (src === "") {
      text = "";
      last = "";
      setValue(undefined);
      return;
    }
    const v = read(src);
    if (!v || !inRange(v)) return (text = last);
    text = format(v);
    last = text;
    setValue(v);
  }
  function show() {
    open = true;
  }
  function hide() {
    open = false;
  }
  function toggle() {
    open ? hide() : show();
  }
  function clear() {
    setValue(undefined);
    text = "";
    last = "";
    emitChange();
  }
  function onPick(v: Temporal.PlainDate | undefined) {
    setValue(v);
    emitChange();
    if (!closeOnSelect) return;
    hide();
    returnFocus();
  }
  function returnFocus() {
    returning = true;
    tick().then(() => {
      element?.focus();
      returning = false;
    });
  }
  function focusCalendar() {
    const el = document.querySelector(`[data-svs-dateinput="${uid}"] [data-svs-calendar] [tabindex="0"]`) as HTMLElement | null;
    el?.focus();
  }
  async function observeOverflow() {
    overflow = { x: false, y: false };
    await tick();
    if (!overlayElem || typeof window === "undefined") return;
    const rect = overlayElem.getBoundingClientRect();
    overflow.x = window.innerWidth < rect.right;
    overflow.y = window.innerHeight < rect.bottom;
  }
  function stopListening() {
    if (typeof document === "undefined") return;
    document.removeEventListener("pointerdown", houtside);
    document.removeEventListener("keydown", hkey);
  }
  onDestroy(stopListening);

  // *** Event Handlers *** //
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    oninputProp?.(ev);
    if (parse) text = ev.currentTarget.value;
  };
  const hchange: FormEventHandler<HTMLInputElement> = (ev) => {
    commit(ev.currentTarget.value);
    onchangeProp?.(ev);
    ctx?.onchange?.(ev);
  };
  const hblur: FocusEventHandler<HTMLInputElement> = (ev) => {
    commit(ev.currentTarget.value);
    focused = false;
    onblurProp?.(ev);
  };
  const hfocus: FocusEventHandler<HTMLInputElement> = (ev) => {
    const returned = returning;
    focused = true;
    onfocusProp?.(ev);
    if (openOnFocus && !returned) show();
  };
  const hinvalid: FormEventHandler<HTMLInputElement> = (ev) => {
    oninvalidProp?.(ev);
    ctx?.oninvalid?.(ev);
  };
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => onkeydownProp?.(ev);
  const hkey = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    ev.stopPropagation();
    hide();
    returnFocus();
  };
  const houtside = (ev: PointerEvent) => {
    const root = document.querySelector(`[data-svs-dateinput="${uid}"]`);
    if (root?.contains(ev.target as Node)) return;
    hide();
  };
  const ctl: DateInputCtl = { toggle, show, hide, clear };
</script>

<!---------------------------------------->

<span class={cls(PARTS.WHOLE, effVariant)} data-svs-dateinput={uid} style="position:relative;">
  {#if left}
    <span class={cls(PARTS.LEFT, effVariant)}>{@render left(ctl, open, effVariant)}</span>
  {/if}
  <input
    class={[cls(PARTS.MAIN, effVariant), c]}
    type="text"
    bind:this={element}
    value={text}
    readonly={!parse}
    role="combobox"
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls={open ? idOverlay : undefined}
    id={effId}
    aria-describedby={effDescribedby}
    aria-invalid={ariaInvalid ?? (effAriaErrMsgId ? true : undefined)}
    aria-errormessage={effAriaErrMsgId}
    {...rest}
    oninput={hinput}
    onchange={hchange}
    onblur={hblur}
    onfocus={hfocus}
    onkeydown={hkeydown}
    oninvalid={hinvalid}
    {@attach attach}
  />
  {#if right}
    <span class={cls(PARTS.RIGHT, effVariant)}>{@render right(ctl, open, effVariant)}</span>
  {/if}
  {#if name}
    <input type="hidden" {name} value={effValue?.toString() ?? ""} />
  {/if}
  {#if open}
    <div id={idOverlay} class={cls(PARTS.BOTTOM, effVariant)} bind:this={overlayElem} style={overlayStyle} transition:tfn|local={tparams}>
      <Calendar
        {...calendar}
        bind:value={() => effValue, onPick}
        locale={calendar?.locale ?? locale}
        {min}
        {max}
        {isDisabled}
        variant={effVariant}
      />
    </div>
  {/if}
</span>
