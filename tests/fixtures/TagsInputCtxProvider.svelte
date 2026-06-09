<script lang="ts">
  import TagsInput, { setTagsInputContext, type TagsInputContext, type TagsInputProps, type TagsInputEvents } from "#svs/_TagsInput.svelte";
  import { type SVSClass, type SVSVariant } from "#svs/core";

  interface State {
    values: string[];
    value: string;
    variant: SVSVariant;
    element: HTMLInputElement | undefined;
    ariaErrMsgId: string | undefined;
    styling: SVSClass | undefined;
    id: string | undefined;
    describedby: string | undefined;
  }
  interface Hooks {
    events?: TagsInputEvents;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }
  interface Props {
    state: State;
    hooks?: Hooks;
    input?: TagsInputProps;
  }

  let { state, hooks, input = {} }: Props = $props();
  const ctx: TagsInputContext = {
    get values() {
      return state.values;
    },
    set values(v) {
      state.values = v;
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
    set element(v: HTMLInputElement | undefined) {
      state.element = v;
    },
    get ariaErrMsgId() {
      return state.ariaErrMsgId;
    },
    get styling() {
      return state.styling;
    },
    get id() {
      return state.id;
    },
    get describedby() {
      return state.describedby;
    },
    events: {
      onadd: (values, value) => hooks?.events?.onadd?.(values, value),
      onremove: (values, value, index) => hooks?.events?.onremove?.(values, value, index),
    },
    onchange: (ev) => hooks?.onchange?.(ev),
    oninvalid: (ev) => hooks?.oninvalid?.(ev),
  };
  setTagsInputContext(ctx);
</script>

<TagsInput {...input} />
