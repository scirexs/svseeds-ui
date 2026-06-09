<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TagsInputProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: Snippet<[string, string]>; // Snippet<[value,variant]>
    extra?: Snippet<[string, string]>; // Snippet<[value,variant]>
    values?: string[]; // bindable
    value?: string; // bindable
    side?: "left" | "right"; // ("left")
    removeAriaLabel?: (text: string) => string; // ((text) => `Remove ${text}`)
    confirm?: string[]; // (["Enter"])
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string;
    events?: TagsInputEvents;
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  interface TagsInputEvents { // cancel if returns true
    onadd?: (values: string[], value: string) => void | boolean;
    onremove?: (values: string[], value: string, index: number) => void | boolean;
  }
  ```
  ### Exports
  `TagsInputContext`, `setTagsInputContext(ctx)`, and `getTagsInputContext()` provide the optional field context used by `TagsInputField`.
  When a `TagsInputContext` is present (i.e. rendered inside `TagsInputField`), `values`/`value`/`variant`/`element`/`ariaErrMsgId`/`id`/`aria-describedby`/`onchange`/`oninvalid` and the field's validation `onadd` are taken from the context; the component's own same-named props are ignored. `styling` and all presentational props (`label`, `extra`, `side`, `confirm`, `trim`, `unique`, `removeAriaLabel`, `attach`, `placeholder`, ...) stay caller-controlled.
  ### Anatomy
  ```svelte
  <div class="whole">
    <span class="aux" conditional>
      {#each values as text, i}
        <span class="label">
          {#if label}
            {label}
          {:else}
            {text}
          {/if}
          <button class="extra" type="button" aria-label={removeLabel(text)}>
            {#if extra}
              {extra}
            {:else}
              <svg aria-hidden="true" focusable="false">Default Icon</svg>
            {/if}
          </button>
        </span>
      {/each}
    </span>
    <input class={["main", class]} {...rest} type="text" aria-invalid={ariaInvalid ?? (ariaErrMsgId ? true : undefined)} aria-errormessage={ariaErrMsgId} bind:value={() => effValue, (v) => setValue(v)} bind:this={element} {@attach attach} />
  </div>
  ```
-->
<script module lang="ts">
  export interface TagsInputProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: Snippet<[string, string]>; // Snippet<[value,variant]>
    extra?: Snippet<[string, string]>; // Snippet<[value,variant]>
    values?: string[]; // bindable
    value?: string; // bindable
    side?: "left" | "right"; // ("left")
    removeAriaLabel?: (text: string) => string; // ((text) => `Remove ${text}`)
    confirm?: string[]; // (["Enter"])
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string;
    events?: TagsInputEvents;
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type TagsInputReqdProps = never;
  export type TagsInputBindProps = "values" | "value" | "element";
  export interface TagsInputEvents {
    // cancel if true
    onadd?: (values: string[], value: string) => void | boolean;
    onremove?: (values: string[], value: string, index: number) => void | boolean;
  }

  const preset = "svs-tags-input";
  const CONFIRM_KEY = "Enter";

  export interface TagsInputContext {
    get values(): string[];
    set values(v: string[]);
    get value(): string;
    set value(v: string);
    get variant(): SVSVariant;
    set element(v: HTMLInputElement | undefined);
    get ariaErrMsgId(): string | undefined;
    get styling(): SVSClass | undefined;
    get id(): string | undefined;
    get describedby(): string | undefined;
    events?: TagsInputEvents;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }

  const TAGS_INPUT_CTX = Symbol("svs-tags-input");
  export function setTagsInputContext(ctx: TagsInputContext): void {
    setContext(TAGS_INPUT_CTX, ctx);
  }
  export function getTagsInputContext(): TagsInputContext | undefined {
    return getContext(TAGS_INPUT_CTX);
  }

  import { type Snippet, getContext, setContext } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLInputAttributes, type KeyboardEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, values = $bindable([]), value = $bindable(""), side = "left", removeAriaLabel = (text: string) => `Remove ${text}`, confirm = [CONFIRM_KEY], trim = true, unique = true, ariaErrMsgId, events, onkeydown, onchange: onchangeProp, oninvalid: oninvalidProp, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, id: idProp, "aria-describedby": ariaDescribedbyProp, class: c, "aria-invalid": ariaInvalid, ...rest }: TagsInputProps = $props();
  const ctx = getTagsInputContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling ?? ctx?.styling));
  const confirmKeys = $derived(new Set(confirm?.length ? confirm : [CONFIRM_KEY]));
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effValues = $derived(ctx ? ctx.values : values);
  const effValue = $derived(ctx ? ctx.value : value);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : ariaErrMsgId);
  const effId = $derived(ctx ? ctx.id : idProp);
  const effDescribedby = $derived(ctx ? ctx.describedby : ariaDescribedbyProp);

  function setValue(v: string) {
    if (ctx) ctx.value = v;
    else value = v;
  }
  function setValues(v: string[]) {
    if (ctx) ctx.values = v;
    else values = v;
  }
  $effect(() => {
    if (ctx) ctx.element = element;
  });

  // *** Event Handlers *** //
  function onaddHook(vs: string[], v: string): boolean | void {
    if (events?.onadd?.(vs, v)) return true;
    if (ctx?.events?.onadd?.(vs, v)) return true;
  }
  function add(v: string) {
    if (unique && effValues.includes(v)) {
      setValue("");
      return;
    }
    setValues([...effValues, v]);
    setValue("");
  }
  function remove(index: number) {
    if (events?.onremove?.(effValues, effValues[index], index)) return;
    setValues(effValues.filter((_, i) => i !== index));
  }
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (!confirmKeys.has(ev.key) || ev.isComposing) return;
    ev.preventDefault();
    const v = trim ? effValue.trim() : effValue;
    if (trim && v !== effValue) setValue(v);
    if (!v) return;
    if (onaddHook(effValues, v)) return;
    add(v);
  };
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, effVariant)}>
  {@render tags(side === "left")}
  <input
    bind:value={() => effValue, (v) => setValue(v)}
    bind:this={element}
    class={[cls(PARTS.MAIN, effVariant), c]}
    {...rest}
    type="text"
    id={effId}
    onkeydown={hkeydown}
    onchange={(e) => {
      onchangeProp?.(e);
      ctx?.onchange?.(e);
    }}
    oninvalid={(e) => {
      oninvalidProp?.(e);
      ctx?.oninvalid?.(e);
    }}
    aria-describedby={effDescribedby}
    aria-invalid={ariaInvalid ?? (effAriaErrMsgId ? true : undefined)}
    aria-errormessage={effAriaErrMsgId}
    {@attach attach}
  />
  {@render tags(side === "right")}
</div>

{#snippet tags(render: boolean)}
  {#if render}
    <span class={cls(PARTS.AUX, effVariant)}>
      {#each effValues as text, i}
        <span class={cls(PARTS.LABEL, effVariant)}>
          {#if label}
            {@render label(text, effVariant)}
          {:else}
            {text}
          {/if}
          <button class={cls(PARTS.EXTRA, effVariant)} type="button" aria-label={removeAriaLabel(text)} onclick={() => remove(i)}>
            {#if extra}
              {@render extra(text, effVariant)}
            {:else}
              <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10">
                <path d="M16 2 14 0 8 6 2 0 0 2 6 8 0 14 2 16 8 10 14 16 16 14 10 8z" />
              </svg>
            {/if}
          </button>
        </span>
      {/each}
    </span>
  {/if}
{/snippet}
