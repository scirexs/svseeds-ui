<!--
  @component
  ### Usage
  Use standalone, or inside `ToggleGroupField`.
  ```svelte
  <ToggleGroup {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleGroupProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "role" | "aria-describedby" | "aria-invalid" | "aria-errormessage"> {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    events?: ToggleGroupEvents;
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    attach?: Attachment<HTMLButtonElement>;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other span attributes are passed to the group <span> via ...rest; `class` is merged
    // aria-label / aria-labelledby name the group
  }
  interface ToggleOption extends Omit<HTMLButtonAttributes, "class" | "type" | "role" | "aria-checked" | "aria-invalid" | "aria-errormessage" | "onclick"> {
    text: string;
  }
  interface ToggleGroupEvents extends CollectionEvents<string> {}
  ```
  ### Anatomy
  ```svelte
  <span class="whole" {...rest} role aria-labelledby aria-describedby aria-errormessage>
    {#each options as { text, ...attrs }}
      <button class="main" {...attrs}>
        {text} or {children}
      </button>
    {/each}
  </span>
  ```
-->
<script module lang="ts">
  export interface ToggleGroupProps extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    "children" | "role" | "aria-describedby" | "aria-invalid" | "aria-errormessage"
  > {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    events?: ToggleGroupEvents;
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    attach?: Attachment<HTMLButtonElement>;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export interface ToggleOption extends Omit<
    HTMLButtonAttributes,
    "class" | "type" | "role" | "aria-checked" | "aria-invalid" | "aria-errormessage" | "onclick"
  > {
    text: string;
  }
  export interface ToggleGroupEvents extends CollectionEvents<string> {}
  export type ToggleGroupReqdProps = "options";
  export type ToggleGroupBindProps = "values" | "elements";

  export const _TOGGLE_GROUP_PRESET = "svs-toggle-group";

  export interface ToggleGroupContext extends SVSContext {
    get values(): string[];
    set values(v: string[]);
    set elements(v: HTMLButtonElement[]);
    get ariaLabelId(): string | undefined;
    get ariaDescId(): string | undefined;
    get ariaErrMsgId(): string | undefined;
    events?: ToggleGroupEvents;
  }

  export const [_getToggleGroupContext, _setToggleGroupContext] = _createContext<ToggleGroupContext>();

  import { VARIANT, PARTS, _fnClass, _createContext } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";
  import type { SvelteMap } from "svelte/reactivity";
  import type { SVSClass, SVSVariant, SVSContext, CollectionEvents } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, children, values = $bindable([]), multiple = true, events, ariaDescId, ariaErrMsgId, attach, elements = $bindable([]), styling, variant = VARIANT.NEUTRAL, class: c, "aria-labelledby": ariaLabelledbyProp, ...rest }: ToggleGroupProps = $props();
  const ctx = _getToggleGroupContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_TOGGLE_GROUP_PRESET, styling ?? ctx?.styling));
  const role = $derived(multiple ? "checkbox" : "radio");
  const roleGroup = $derived(multiple ? "group" : "radiogroup");
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effValues = $derived(ctx ? ctx.values : values);
  const effAriaLabelId = $derived(ctx ? ctx.ariaLabelId : ariaLabelledbyProp);
  const effAriaDescId = $derived(ctx ? ctx.ariaDescId : ariaDescId);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : ariaErrMsgId);

  // *** Reactive Handlers *** //
  let opts = $derived(
    [...options].map(([value, def]) => {
      const { text, disabled, ...attrs } = typeof def === "string" ? { text: def } : def;
      return { value, text, disabled: disabled ?? false, attrs, checked: effValues.includes(value) };
    }),
  );
  let invalid = $derived(effAriaErrMsgId ? true : undefined);
  let activeIndex = $derived.by(() => {
    if (multiple) return -1;
    const checked = opts.findIndex((o) => o.checked && !o.disabled);
    if (checked >= 0) return checked;
    return opts.findIndex((o) => !o.disabled);
  });
  function setValues(v: string[]) {
    if (ctx) ctx.values = v;
    else values = v;
  }
  $effect(() => {
    if (!multiple && effValues.length > 1) setValues(effValues.slice(0, 1));
  });
  $effect(() => {
    if (ctx) ctx.elements = elements;
  });

  // *** Event Handlers *** //
  const update = $derived(
    multiple
      ? (value: string) => {
          const set = new Set(effValues);
          set.has(value) ? set.delete(value) : set.add(value);
          return opts.filter((o) => set.has(o.value)).map((o) => o.value);
        }
      : (value: string) => (effValues.includes(value) ? [] : [value]),
  );
  function commitAdd(values: string[], added: string[]): string[] {
    let keep = added;
    const a = events?.onadd?.({ values, added });
    if (a) keep = keep.filter((x) => a.includes(x));
    const b = ctx?.events?.onadd?.({ values, added });
    if (b) keep = keep.filter((x) => b.includes(x));
    return keep;
  }
  function commitRemove(values: string[], removed: string[]): string[] {
    let keep = removed;
    const a = events?.onremove?.({ values, removed });
    if (a) keep = keep.filter((x) => a.includes(x));
    const b = ctx?.events?.onremove?.({ values, removed });
    if (b) keep = keep.filter((x) => b.includes(x));
    return keep;
  }
  function updateValues(value: string): () => void {
    return () => {
      if (opts.find((o) => o.value === value)?.disabled) return;
      const adding = !effValues.includes(value);
      const ok = adding ? commitAdd(effValues, [value]).includes(value) : commitRemove(effValues, [value]).includes(value);
      if (!ok) return;
      setValues(update(value));
    };
  }
  function nextEnabledIndex(start: number, step: 1 | -1): number {
    if (!opts.some((o) => !o.disabled)) return -1;
    for (let offset = 1; offset <= opts.length; offset += 1) {
      const index = (start + step * offset + opts.length) % opts.length;
      if (!opts[index].disabled) return index;
    }
    return -1;
  }
  function edgeEnabledIndex(edge: "first" | "last"): number {
    if (edge === "first") return opts.findIndex((o) => !o.disabled);
    for (let i = opts.length - 1; i >= 0; i -= 1) {
      if (!opts[i].disabled) return i;
    }
    return -1;
  }
  function targetIndex(key: string, index: number): number {
    if (key === "Home") return edgeEnabledIndex("first");
    if (key === "End") return edgeEnabledIndex("last");
    if (key === "ArrowRight" || key === "ArrowDown") return nextEnabledIndex(index, 1);
    if (key === "ArrowLeft" || key === "ArrowUp") return nextEnabledIndex(index, -1);
    return -1;
  }
  function moveFocus(index: number, ev: KeyboardEvent) {
    if (multiple) return;
    const target = targetIndex(ev.key, index);
    if (target < 0) return;
    ev.preventDefault();
    elements[target]?.focus();
    setValues([opts[target].value]);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <span
    class={[cls(PARTS.WHOLE, effVariant), c]}
    {...rest}
    role={roleGroup}
    aria-labelledby={effAriaLabelId}
    aria-describedby={effAriaDescId}
    aria-invalid={invalid}
    aria-errormessage={effAriaErrMsgId}
  >
    {#each opts as { value, text, disabled, attrs, checked }, i (value)}
      {@const v = checked ? VARIANT.ACTIVE : effVariant}
      {@const c = cls(PARTS.MAIN, v)}
      <button
        {...attrs}
        bind:this={elements[i]}
        class={c}
        type="button"
        {role}
        aria-checked={checked}
        disabled={disabled || undefined}
        aria-invalid={undefined}
        aria-errormessage={undefined}
        tabindex={!multiple ? (i === activeIndex ? 0 : -1) : undefined}
        onclick={updateValues(value)}
        onkeydown={(ev) => moveFocus(i, ev)}
        {@attach attach}
      >
        {@render content(value, text, v)}
      </button>
    {/each}
  </span>
{/if}

{#snippet content(value: string, text: string, variant: string)}
  {#if children}
    {@render children(value, text, variant)}
  {:else}
    {text}
  {/if}
{/snippet}
