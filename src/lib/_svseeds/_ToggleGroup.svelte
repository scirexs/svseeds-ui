<!--
  @component
  default value: `(value)`
  ```ts
  interface ToggleGroupProps {
    options: SvelteMap<string, string> | Map<string, string>;
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    action?: Action;
    [key: string]: unknown | Snippet<[string]>;
  }
  ```
-->
<script module lang="ts">
  export interface ToggleGroupProps {
    options: SvelteMap<string, string> | Map<string, string>;
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    action?: Action;
    [key: string]: unknown | Snippet<[string]>;
  }
  export type ToggleGroupReqdProps = "options";
  export type ToggleGroupBindProps = "values" | "ariaErrMsgId" | "status";

  const preset = "svs-toggle-group";

  function getSnippet(text: string, rest: Record<string, unknown>): Snippet<[string]> | undefined {
    if (!Object.hasOwn(rest, text)) return;
    if (typeof rest[text] !== "function") return;
    return rest[text] as Snippet<[string]>;
  }

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSStyle, STATE, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { options, values = $bindable([]), multiple = true, ariaDescId, ariaErrMsgId = $bindable(), status = $bindable(""), style, attributes, action, ...rest }: ToggleGroupProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  const role = multiple ? "checkbox" : "radio";
  const roleGroup = multiple ? "group" : "radiogroup";

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([value, text]) => ({ value, text, checked: values.includes(value) }))]);
  let invalid = $derived(ariaErrMsgId ? true : undefined);

  // *** Event Handlers *** //
  const update = multiple
    ? (value: string) => (values.includes(value) ? values.filter((x) => x !== value) : opts.map((x) => x.value).filter((x) => [...values, value].includes(x)))
    : (value: string) => (values.includes(value) ? [] : [value]);
  function updateValues(value: string): () => void {
    return () => values = update(value);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <span class={cls(PARTS.WHOLE, status)} role={roleGroup} aria-describedby={ariaDescId} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple ? ariaErrMsgId : undefined}>
    {#each opts as { value, text, checked } (value)}
      {@const c = cls(PARTS.MAIN, checked ? STATE.ACTIVE : status)}
      {#if action}
        <button class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? ariaErrMsgId : undefined} onclick={updateValues(value)} type="button" {role} use:action>
          {@render content(value, text)}
        </button>
      {:else}
        <button class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? ariaErrMsgId : undefined} onclick={updateValues(value)} type="button" {role}>
          {@render content(value, text)}
        </button>
      {/if}
    {/each}
  </span>
{/if}

{#snippet content(value: string, text: string)}
  {@const snippet = getSnippet(text, rest)}
  {#if snippet}
    {@render snippet(value)}
  {:else}
    {text}
  {/if}
{/snippet}
