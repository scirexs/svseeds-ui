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
    separator?: string | string[]; // ([",", "\n"]) - characters that split input into tags
    paste?: boolean; // (true) - split pasted text on separators into multiple tags
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string;
    events?: TagsInputEvents;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  interface TagsInputEvents extends CollectionEvents<string> {}
  ```
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
    <input class="main" {...rest} type="text" aria-invalid aria-errormessage />
  </div>
  ```
  ### Behavior
  Typing a separator commits the segment before it; Enter commits the current input after splitting on separators; pasting text containing a separator commits every segment of the post-paste value and clears the input. With `paste:false`, pasted text is inserted natively and not split.
  `trim` and `unique` apply per segment, empty segments are dropped, and `onadd` fires once per commit with the full batch.
  Default separators are `","` and `"\n"`; Windows `\r\n` pastes keep `\r` only when `trim:false`.
-->
<script module lang="ts">
  export interface TagsInputProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: Snippet<[string, string]>; // Snippet<[value,variant]>
    extra?: Snippet<[string, string]>; // Snippet<[value,variant]>
    values?: string[]; // bindable
    value?: string; // bindable
    side?: "left" | "right"; // ("left")
    removeAriaLabel?: (text: string) => string; // ((text) => `Remove ${text}`)
    separator?: string | string[]; // ([",", "\n"]) - characters that split input into tags
    paste?: boolean; // (true) - split pasted text on separators into multiple tags
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string;
    events?: TagsInputEvents;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type TagsInputReqdProps = never;
  export type TagsInputBindProps = "values" | "value" | "element";
  export interface TagsInputEvents extends CollectionEvents<string> {}

  export const _TAGS_INPUT_PRESET = "svs-tags-input";

  export interface TagsInputContext extends SVSContext {
    get values(): string[];
    set values(v: string[]);
    get value(): string;
    set value(v: string);
    set element(v: HTMLInputElement | undefined);
    get ariaErrMsgId(): string | undefined;
    get id(): string | undefined;
    get describedby(): string | undefined;
    events?: TagsInputEvents;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }

  export const [_getTagsInputContext, _setTagsInputContext] = _createContext<TagsInputContext>();

  import { VARIANT, PARTS, fnClass, _createContext } from "./core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLInputAttributes, KeyboardEventHandler, FormEventHandler, ClipboardEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext, CollectionEvents } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, values = $bindable([]), value = $bindable(""), side = "left", removeAriaLabel = (text: string) => `Remove ${text}`, separator = [",", "\n"], paste = true, trim = true, unique = true, ariaErrMsgId, events, onkeydown, oninput: oninputProp, onpaste: onpasteProp, onchange: onchangeProp, oninvalid: oninvalidProp, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, id: idProp, "aria-describedby": ariaDescribedbyProp, class: c, "aria-invalid": ariaInvalid, ...rest }: TagsInputProps = $props();
  const ctx = _getTagsInputContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(_TAGS_INPUT_PRESET, styling ?? ctx?.styling));
  const seps = $derived((Array.isArray(separator) ? separator : [separator]).filter((s) => s.length > 0));
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
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function splitBySeps(text: string): string[] {
    if (!seps.length) return [text];
    return text.split(new RegExp(seps.map(escapeRe).join("|")));
  }
  const hasSep = (text: string) => seps.some((s) => text.includes(s));
  $effect(() => {
    if (ctx) ctx.element = element;
  });

  // *** Event Handlers *** //
  function commitAdd(values: string[], added: string[]): string[] {
    let keep = added;
    const a = events?.onadd?.({ values, added });
    if (a) keep = keep.filter((x) => a.includes(x));
    const b = ctx?.events?.onadd?.({ values, added });
    if (b) keep = keep.filter((x) => b.includes(x));
    return keep;
  }
  function addMany(cands: string[]) {
    let batch = cands;
    if (unique) {
      const seen = new Set(effValues);
      batch = batch.filter((v) => !seen.has(v) && (seen.add(v), true));
    }
    if (!batch.length) return;
    const kept = commitAdd(effValues, batch);
    if (!kept.length) return;
    setValues([...effValues, ...kept]);
  }
  function splitCommit(text: string, commitTrailing: boolean) {
    const segs = splitBySeps(text);
    const trailing = commitTrailing ? "" : (segs.pop() ?? "");
    const cleaned = segs.map((s) => (trim ? s.trim() : s)).filter((s) => s.length > 0);
    addMany(cleaned);
    setValue(trailing);
  }
  function commitRemove(values: string[], removed: string[]): string[] {
    let keep = removed;
    const a = events?.onremove?.({ values, removed });
    if (a) keep = keep.filter((x) => a.includes(x));
    const b = ctx?.events?.onremove?.({ values, removed });
    if (b) keep = keep.filter((x) => b.includes(x));
    return keep;
  }
  function remove(index: number) {
    const target = effValues[index];
    if (!commitRemove(effValues, [target]).includes(target)) return;
    setValues(effValues.filter((_, i) => i !== index));
  }
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (ev.key !== "Enter" || ev.isComposing) return;
    ev.preventDefault();
    splitCommit(effValue, true);
  };
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    oninputProp?.(ev);
    const input = ev as unknown as InputEvent;
    if (input.isComposing || input.inputType === "insertFromPaste") return;
    splitCommit(ev.currentTarget.value, false);
  };
  const hpaste: ClipboardEventHandler<HTMLInputElement> = (ev) => {
    onpasteProp?.(ev);
    if (ev.defaultPrevented || !paste) return;
    const clip = ev.clipboardData?.getData("text") ?? "";
    if (!hasSep(clip)) return;
    ev.preventDefault();
    const el = ev.currentTarget;
    const start = el.selectionStart ?? effValue.length;
    const end = el.selectionEnd ?? effValue.length;
    splitCommit(effValue.slice(0, start) + clip + effValue.slice(end), true);
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
    oninput={hinput}
    onpaste={hpaste}
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
