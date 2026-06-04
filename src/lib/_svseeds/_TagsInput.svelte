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
    type?: "left" | "right"; // ("left")
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
          <button class="extra">
            {#if extra}
              {extra}
            {:else}
              // Default Icon
            {/if}
          </button>
        </span>
      {/each}
    </span>
    <input class={["main", class]} {...rest} type="text" aria-errormessage={ariaErrMsgId} bind:value bind:this={element} {@attach attach} />
  </div>
  ```
-->
<script module lang="ts">
  export interface TagsInputProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: Snippet<[string, string]>; // Snippet<[value,variant]>
    extra?: Snippet<[string, string]>; // Snippet<[value,variant]>
    values?: string[]; // bindable
    value?: string; // bindable
    type?: "left" | "right"; // ("left")
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

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, values = $bindable([]), value = $bindable(""), type = "left", confirm = [], trim = true, unique = true, ariaErrMsgId, events, onkeydown, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: TagsInputProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  // svelte-ignore state_referenced_locally
  const confirmKeys = new Set([CONFIRM_KEY, ...confirm]);
  let invalid = $derived(ariaErrMsgId ? true : undefined);

  // *** Event Handlers *** //
  function hkeydown(ev: KeyboardEvent) {
    onkeydown?.(ev as any);
    if (!confirmKeys.has(ev.key) || ev.isComposing) return;
    ev.preventDefault();
    if (events?.onadd?.(values, value)) return;
    if (trim) value = value.trim();
    add();
  }
  function add() {
    if (unique && values.includes(value)) value = "";
    if (!value) return;
    values = [...values, value];
    value = "";
  }
  function remove(index: number): (ev: MouseEvent) => void {
    return () => {
      if (events?.onremove?.(values, values[index], index)) return;
      values = values.filter((_, i) => i !== index);
    };
  }
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)}>
  {@render tags(type === "left")}
  <input
    bind:value
    bind:this={element}
    class={[cls(PARTS.MAIN, variant), c]}
    {...rest}
    type="text"
    onkeydown={hkeydown}
    aria-invalid={invalid}
    aria-errormessage={ariaErrMsgId}
    {@attach attach}
  />
  {@render tags(type === "right")}
</div>

{#snippet tags(render: boolean)}
  {#if render}
    <span class={cls(PARTS.AUX, variant)}>
      {#each values as value, i}
        <span class={cls(PARTS.LABEL, variant)}>
          {#if label}
            {@render label(value, variant)}
          {:else}
            {value}
          {/if}
          <button class={cls(PARTS.EXTRA, variant)} onclick={remove(i)}>
            {#if extra}
              {@render extra(value, variant)}
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="10" height="10"
                ><path
                  d="M511.998 70.682 441.315 0 256.002 185.313 70.685 0 .002 70.692l185.314 185.314L.002 441.318 70.69 512l185.312-185.312L441.315 512l70.683-70.682-185.314-185.312z"
                /></svg
              >
            {/if}
          </button>
        </span>
      {/each}
    </span>
  {/if}
{/snippet}
