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
    removeLabel?: (text: string) => string; // ((text) => `Remove ${text}`)
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
    <input class={["main", class]} {...rest} type="text" aria-invalid={ariaInvalid ?? (ariaErrMsgId ? true : undefined)} aria-errormessage={ariaErrMsgId} bind:value bind:this={element} {@attach attach} />
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
    onadd?: (values: string[], value: string) => undefined | boolean;
    onremove?: (values: string[], value: string, index: number) => undefined | boolean;
  }

  const preset = "svs-tags-input";
  const CONFIRM_KEY = "Enter";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLInputAttributes, type KeyboardEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, values = $bindable([]), value = $bindable(""), side = "left", removeAriaLabel = (text: string) => `Remove ${text}`, confirm = [CONFIRM_KEY], trim = true, unique = true, ariaErrMsgId, events, onkeydown, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, "aria-invalid": ariaInvalid, ...rest }: TagsInputProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const confirmKeys = $derived(new Set(confirm?.length ? confirm : [CONFIRM_KEY]));

  // *** Event Handlers *** //
  function add() {
    if (unique && values.includes(value)) {
      value = "";
      return;
    }
    values = [...values, value];
    value = "";
  }
  function remove(index: number) {
    if (events?.onremove?.(values, values[index], index)) return;
    values = values.filter((_, i) => i !== index);
  }
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (!confirmKeys.has(ev.key) || ev.isComposing) return;
    ev.preventDefault();
    if (trim) value = value.trim();
    if (!value) return;
    if (events?.onadd?.(values, value)) return;
    add();
  };
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)}>
  {@render tags(side === "left")}
  <input
    bind:value
    bind:this={element}
    class={[cls(PARTS.MAIN, variant), c]}
    {...rest}
    type="text"
    onkeydown={hkeydown}
    aria-invalid={ariaInvalid ?? (ariaErrMsgId ? true : undefined)}
    aria-errormessage={ariaErrMsgId}
    {@attach attach}
  />
  {@render tags(side === "right")}
</div>

{#snippet tags(render: boolean)}
  {#if render}
    <span class={cls(PARTS.AUX, variant)}>
      {#each values as text, i}
        <span class={cls(PARTS.LABEL, variant)}>
          {#if label}
            {@render label(text, variant)}
          {:else}
            {text}
          {/if}
          <button class={cls(PARTS.EXTRA, variant)} type="button" aria-label={removeAriaLabel(text)} onclick={() => remove(i)}>
            {#if extra}
              {@render extra(text, variant)}
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
