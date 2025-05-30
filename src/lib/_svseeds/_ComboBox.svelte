<script module lang="ts">
  export type ComboBoxProps = {
    options: SvelteSet<string> | Set<string>,
    value?: string, // bindable
    expanded?: boolean, // bindable
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLInputAttributes,
    action?: Action,
    element?: HTMLInputElement, // bindable
  };
  export type ComboBoxReqdProps = "options";
  export type ComboBoxBindProps = "value" | "expanded" | "status" | "element";

  const preset = "svs-combo-box";
  const NA = -1;
  const optionStyle = "cursor: default; user-select: none;";

  import { untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, AREA, elemId, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { options, value = $bindable(""), expanded = $bindable(false), status = $bindable(""), style, attributes, action, element = $bindable() }: ComboBoxProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
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
    if (activate && selected === NA) selected = bottom ? opts.length-- : 0;
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
    if (selected + 1 < opts.length) selected++;
  }
  function caseArrowUp(alt: boolean) {
    if (alt && !expanded) return;
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (selected - 1 >= 0) selected--;
  }
</script>

<!---------------------------------------->

{#if options.size}
  <div class={cls(AREA.WHOLE, status)}>
    <div style="position: relative; width: fit-content; height: fit-content;">
      {#if action}
        <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {...attrs} use:action />
      {:else}
        <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} type="text" role="combobox" aria-haspopup="listbox" aria-autocomplete="none" aria-controls={idList} aria-expanded={expanded} onfocus={() => open()} onblur={close} {onkeydown} {...attrs} />
      {/if}
      <ul bind:this={listElem} class={cls(AREA.BOTTOM, status)} id={idList} role="listbox" style={listboxStyle}>
        {#each opts as opt, i (opt)}
          {@const isSelected = i === selected}
          {@const labelStatus = isSelected ? STATE.ACTIVE : status}
          {@const onpointerenter = () => selected = i}
          <li class={cls(AREA.LABEL, labelStatus)} aria-selected={isSelected} role="option" style={optionStyle} onpointerdown={apply} {onpointerenter}>
            {opt}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
