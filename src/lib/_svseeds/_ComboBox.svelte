<!--
  @component
  default value: `(value)`
  ```ts
  interface ComboBoxProps {
    options: SvelteSet<string> | Set<string>;
    value?: string; // bindable
    expanded?: boolean; // bindable
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
    value?: string; // bindable
    expanded?: boolean; // bindable
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
  const optionStyle = "cursor: default; user-select: none;";

  import { untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { options, value = $bindable(""), expanded = $bindable(false), attributes, action, element = $bindable(), styling, variant = $bindable("") }: ComboBoxProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const idList = elemId.id;
  const attrs = omit(attributes, "class", "type", "value", "list", "role", "aria-haspopup", "aria-autocomplete", "aria-controls", "aria-expanded");
  let selected = $state(NA);
  let overflow = $state({x: false, y: false});
  let listElem: HTMLUListElement | undefined = $state();

  // *** Bind Handlers *** //
  let listboxStyle = $derived(`position: absolute;visibility: ${expanded ? "visible" : "hidden"};${overflow.x ? "right: 0%;" : ""}${overflow.y ? "bottom: 100%;" : ""}`);
  let opts = $derived([...options.keys()]);
  $effect(() => { options;
    untrack(() => observeOverflow());
  });
  function observeOverflow() {
    if (!listElem || !window) return;
    const rect = listElem.getBoundingClientRect();
    overflow.x = window.innerWidth < rect.right;
    overflow.y = window.innerHeight < rect.bottom;
  }

  // *** Event Handlers *** //
  function open(activate: boolean = false, bottom: boolean = false) {
    if (expanded) return;
    selected = opts.indexOf(value);
    if (activate && selected === NA) selected = bottom ? opts.length - 1 : 0;
    expanded = true;
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
  function onkeydown(ev: KeyboardEvent) {
    if (ev.isComposing) return;
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey) return;
    switch (ev.key) {
      case "Escape": if (!ev.altKey && expanded) close(); break;
      case "Enter": if (!ev.altKey && expanded && selected > NA) apply(); break;
      case "ArrowDown": caseArrowDown(ev.altKey); break;
      case "ArrowUp": caseArrowUp(ev.altKey); break;
    }
  }
  function caseArrowDown(alt: boolean) {
    if (alt && !expanded) return open();
    if (alt && expanded) return;
    if (!alt && !expanded) return open(true);
    if (selected < opts.length - 1) selected++;
    if (selected === NA) selected = 0;
  }
  function caseArrowUp(alt: boolean) {
    if (alt && !expanded) return;
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (selected > 0) selected--;
    if (selected === NA) selected = opts.length - 1;
  }
</script>

<!---------------------------------------->

{#if options.size}
  <div class={cls(PARTS.WHOLE, variant)}>
    <div class={cls(PARTS.MIDDLE, variant)} style="position: relative; width: fit-content; height: fit-content;">
      {#if action}
        <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {...attrs} use:action />
      {:else}
        <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {...attrs} />
      {/if}
      <ul bind:this={listElem} class={cls(PARTS.BOTTOM, variant)} id={idList} role="listbox" style={listboxStyle}>
        {#each opts as opt, i (opt)}
          {@const isSelected = i === selected}
          {@const labelStatus = isSelected ? VARIANT.ACTIVE : variant}
          {@const onpointerenter = () => selected = i}
          <li class={cls(PARTS.LABEL, labelStatus)} aria-selected={isSelected} role="option" style={optionStyle} onpointerdown={apply} {onpointerenter}>
            {opt}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
