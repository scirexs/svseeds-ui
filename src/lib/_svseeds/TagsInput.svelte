<script module lang="ts">
  export type TagsInputProps = {
    values?: string[], // bindable
    value?: string, // bindable
    type?: "left" | "right", // <"left">
    confirm?: string[], // <["Enter"]>
    trim?: boolean, // <true>
    unique?: boolean, // <true>
    ariaErrMsgId?: string, // bindable
    events?: TagsInputEvents,
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLInputAttributes,
    action?: Action,
    element?: HTMLInputElement, // bindable
    deps?: TagsInputDeps,
  };
  export type TagsInputDeps = {
    svsBadge?: Omit<BadgeProps, BadgeReqdProps | BadgeBindProps | "type" | "href">,
  };
  export type TagsInputReqdProps = never;
  export type TagsInputBindProps = "values" | "value" | "ariaErrMsgId" | "status" | "element";
  export type TagsInputEvents = { // cancel if true
    onadd?: (values: string[], value: string) => void | boolean,
    onremove?: (values: string[], value: string, index: number) => void | boolean,
  };

  type TagsInputTarget = { currentTarget: EventTarget & HTMLInputElement };
  type BadgeTarget = { currentTarget: EventTarget & HTMLButtonElement; };
  const preset = "svs-tags-input";
  const CONFIRM_KEY = "Enter";

  import { type Action } from "svelte/action";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, AREA, fnClass, omit } from "./core";
  import Badge, { type BadgeProps, type BadgeReqdProps, type BadgeBindProps } from "./_Badge.svelte";
</script>

<script lang="ts">
  let { values = $bindable([]), value = $bindable(""), type = "left", confirm = [], trim = true, unique = true, ariaErrMsgId = $bindable(), events, status = $bindable(""), style, attributes, action, element = $bindable(), deps }: TagsInputProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const attrs = omit(attributes, "class", "type", "onkeydown");
  const confirmKeys = new Set([CONFIRM_KEY, ...confirm]);

  // *** Initialize Deps *** //
  const svsBadge = {
    ...omit(deps?.svsBadge, "onclick", "right", "style"),
    style: deps?.svsBadge?.style ?? `${preset} svs-badge`,
  };

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
    return (ev) => {
      deps?.svsBadge?.onclick?.(ev);
      if (events?.onremove?.(values, values[index], index)) return;
      values = values.filter((_, i) => i !== index);
    };
  }
</script>

<!---------------------------------------->

<div class={cls(AREA.WHOLE, status)}>
  {@render tags(type === "left")}
  {#if action}
    <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} type="text" {onkeydown} {...attrs} use:action />
  {:else}
    <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} type="text" {onkeydown} {...attrs} />
  {/if}
  {@render tags(type === "right")}
</div>

{#snippet tags(render: boolean)}
  {#if render}
    <span class={cls(type, status)}>
      {#each values as value, i}
        <Badge bind:status type="right" onclick={remove(i)} {...svsBadge}>
          {value}
          {#snippet right(status)}
            {#if deps?.svsBadge?.right}
              {@render deps.svsBadge.right(status)}
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="min-width: 5px; min-height: 5px;"><path d="M511.998 70.682 441.315 0 256.002 185.313 70.685 0 .002 70.692l185.314 185.314L.002 441.318 70.69 512l185.312-185.312L441.315 512l70.683-70.682-185.314-185.312z" /></svg>
            {/if}
          {/snippet}
        </Badge>
      {/each}
    </span>
  {/if}
{/snippet}
