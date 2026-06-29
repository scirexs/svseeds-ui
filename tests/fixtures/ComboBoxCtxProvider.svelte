<script lang="ts">
  import ComboBox, { _setComboBoxContext, type ComboBoxContext, type ComboBoxProps } from "#svs/ComboBox.svelte";
  import type { SvelteSet } from "svelte/reactivity";
  import type { SVSClass, SVSVariant } from "#svs/core";

  interface State {
    options: SvelteSet<string> | Set<string>;
    value: string;
    variant: SVSVariant;
    styling?: SVSClass;
    commits: number;
  }
  interface Props {
    state: State;
    input?: ComboBoxProps;
  }

  let { state, input = {} }: Props = $props();
  const ctx: ComboBoxContext = {
    get options() {
      return state.options;
    },
    get value() {
      return state.value;
    },
    set value(v) {
      state.value = v;
    },
    get variant() {
      return state.variant;
    },
    get styling() {
      return state.styling;
    },
    commit() {
      state.commits += 1;
    },
  };
  _setComboBoxContext(ctx);
</script>

<ComboBox {...input} />
