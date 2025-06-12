<!--
  @component
  default value: `(value)`
  ```ts
  interface ComboBoxProps {
    options: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean // (true)
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
-->
<script module lang="ts">
  export interface ComboBoxProps {
    options: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean // (true)
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ComboBoxReqdProps = "options";
  export type ComboBoxBindProps = "value" | "expanded" | "variant" | "element";

  const preset = "svs-combo-box";
  const NA = -1;

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { options, extra, value = $bindable(""), expanded = $bindable(false), search = true, attributes, action, element = $bindable(), styling, variant = $bindable("") }: ComboBoxProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const idList = elemId.id;
  const attrs = omit(attributes, "class", "type", "value", "list", "role", "aria-haspopup", "aria-autocomplete", "aria-controls", "aria-expanded");
  let selected = $state(NA);
  let overflow = $state({x: false, y: false});
  let listElem: HTMLUListElement | undefined = $state();

  // *** Bind Handlers *** //
  let listboxStyle = $derived(`position:absolute;cursor:default;user-select:none;visibility: ${expanded ? "visible" : "hidden"};${overflow.x ? "right:0%;" : ""}${overflow.y ? "bottom:100%;" : ""}`);
  let opts = $derived([...options.keys()]);
  let maxlen = $derived(opts.reduce((max, x) => Math.max(max, [...x].length), 0));

  // *** Event Handlers *** //
  function open(activate: boolean = false, bottom: boolean = false) {
    if (expanded) return;
    selected = opts.indexOf(value);
    if (activate && selected === NA) selected = bottom ? opts.length - 1 : 0;
    observeOverflow();
    expanded = true;
  }
  function observeOverflow() {
    if (!listElem || !window) return;
    const rect = listElem.getBoundingClientRect();
    overflow.x = window.innerWidth < rect.right;
    overflow.y = window.innerHeight < rect.bottom;
  }
  function apply() {
    if (!expanded) return;
    value = opts[selected];
    if (element) element.selectionStart = value.length;
    close();
  }
  function close() {
    expanded = false;
    selected = NA;
  }
  function oninput(ev: Event) {
    if ((ev as InputEvent).isComposing) return;
    if ([...value].length > maxlen) return;
    if (options.has(value)) {
      selected = opts.indexOf(value);
      return;
    }
    if (!search) return;
    selected = opts.findIndex((x) => x.startsWith(value));
  }
  function onkeydown(ev: KeyboardEvent) {
    if (ev.isComposing) return;
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey) return;
    switch (ev.key) {
      case "Escape": if (!ev.altKey && expanded) close(); break;
      case "Enter": if (!ev.altKey && expanded && selected > NA) apply(); break;
      case "ArrowDown": caseArrowDown(ev, ev.altKey); break;
      case "ArrowUp": caseArrowUp(ev, ev.altKey); break;
    }
  }
  function caseArrowDown(ev: KeyboardEvent, alt: boolean) {
    if (alt && expanded) return;
    ev.preventDefault();
    if (alt && !expanded) return open();
    if (!alt && !expanded) return open(true);
    if (selected < opts.length - 1) selected++;
    if (selected === NA) selected = 0;
  }
  function caseArrowUp(ev: KeyboardEvent, alt: boolean) {
    if (alt && !expanded) return;
    ev.preventDefault();
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (selected > 0) selected--;
    if (selected === NA) selected = opts.length - 1;
  }
</script>

<!---------------------------------------->
<svelte:document onscroll={() => close()} />

{#if options.size}
  <span class={cls(PARTS.WHOLE, variant)} style="position:relative;">
    {#if action}
      <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {oninput} {...attrs} use:action />
    {:else}
      <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {oninput} {...attrs} />
    {/if}
    {#if extra}
      <div class={cls(PARTS.EXTRA, variant)} style="position:absolute;top:50%;right:0%;transform:translateY(-50%);pointer-events:none;">
        {@render extra(expanded, variant)}
      </div>
    {/if}
    <ul bind:this={listElem} class={cls(PARTS.BOTTOM, expanded ? VARIANT.ACTIVE : variant)} id={idList} role="listbox" style={listboxStyle}>
      {#each opts as opt, i (opt)}
        {@const isSelected = i === selected}
        {@const labelStatus = isSelected ? VARIANT.ACTIVE : variant}
        {@const onpointerenter = () => selected = i}
        <li class={cls(PARTS.LABEL, labelStatus)} aria-selected={isSelected} role="option" onpointerdown={apply} {onpointerenter}>
          {opt}
        </li>
      {/each}
    </ul>
  </span>
{/if}
