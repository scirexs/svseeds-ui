<!--
  @component
  default value: `(value)`
  ```ts
  interface TagsInputProps {
    label?: Snippet<[string, string]>; // Snippet<[value,status]>
    aux?: Snippet<[string, string]>; // Snippet<[value,status]>
    values?: string[]; // bindable
    value?: string; // bindable
    type?: "left" | "right"; // ("left")
    confirm?: string[]; // (["Enter"])
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string; // bindable
    events?: TagsInputEvents;
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
  }
  interface TagsInputEvents { // cancel if true
    onadd?: (values: string[], value: string) => void | boolean;
    onremove?: (values: string[], value: string, index: number) => void | boolean;
  }
  ```
-->
<script module lang="ts">
  export interface TagsInputProps {
    label?: Snippet<[string, string]>; // Snippet<[value,status]>
    aux?: Snippet<[string, string]>; // Snippet<[value,status]>
    values?: string[]; // bindable
    value?: string; // bindable
    type?: "left" | "right"; // ("left")
    confirm?: string[]; // (["Enter"])
    trim?: boolean; // (true)
    unique?: boolean; // (true)
    ariaErrMsgId?: string; // bindable
    events?: TagsInputEvents;
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
  }
  export type TagsInputReqdProps = never;
  export type TagsInputBindProps = "values" | "value" | "ariaErrMsgId" | "status" | "element";
  export interface TagsInputEvents { // cancel if true
    onadd?: (values: string[], value: string) => void | boolean;
    onremove?: (values: string[], value: string, index: number) => void | boolean;
  }

  type TagsInputTarget = { currentTarget: EventTarget & HTMLInputElement };
  type BadgeTarget = { currentTarget: EventTarget & HTMLButtonElement; };
  const preset = "svs-tags-input";
  const CONFIRM_KEY = "Enter";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, PARTS, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { label, aux, values = $bindable([]), value = $bindable(""), type = "left", confirm = [], trim = true, unique = true, ariaErrMsgId = $bindable(), events, status = $bindable(""), style, attributes, action, element = $bindable() }: TagsInputProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  const attrs = omit(attributes, "class", "type", "onkeydown");
  const confirmKeys = new Set([CONFIRM_KEY, ...confirm]);
  let invalid = $derived(ariaErrMsgId ? true : undefined);

  // *** Event Handlers *** //
  function onkeydown(ev: KeyboardEvent & TagsInputTarget) {
    attributes?.onkeydown?.(ev);
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
  function remove(index: number): (ev: MouseEvent & BadgeTarget) => void {
    return () => {
      if (events?.onremove?.(values, values[index], index)) return;
      values = values.filter((_, i) => i !== index);
    };
  }
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, status)}>
  {@render tags(type === "left")}
  {#if action}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, status)} type="text" {onkeydown} aria-invalid={invalid} aria-errormessage={ariaErrMsgId} {...attrs} use:action />
  {:else}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, status)} type="text" {onkeydown} aria-invalid={invalid} aria-errormessage={ariaErrMsgId} {...attrs} />
  {/if}
  {@render tags(type === "right")}
</div>

{#snippet tags(render: boolean)}
  {#if render}
    <span class={cls(type, status)}>
      {#each values as value, i}
        <span class={cls(PARTS.LABEL, status)}>
          {#if label}
            {@render label(value, status)}
          {:else}
            {value}
          {/if}
          <button class={cls(PARTS.AUX, status)} onclick={remove(i)}>
            {#if aux}
              {@render aux(value, status)}
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="10" height="10"><path d="M511.998 70.682 441.315 0 256.002 185.313 70.685 0 .002 70.692l185.314 185.314L.002 441.318 70.69 512l185.312-185.312L441.315 512l70.683-70.682-185.314-185.312z" /></svg>
            {/if}
          </button>
        </span>
      {/each}
    </span>
  {/if}
{/snippet}
