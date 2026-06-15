<script lang="ts">
  import FileInput, { _setFileInputContext, type FileInputContext, type FileInputEvents, type FileInputProps } from "#svs/_FileInput.svelte";
  import { type SVSClass, type SVSVariant } from "#svs/core";

  interface State {
    files: File[];
    variant: SVSVariant;
    element: HTMLInputElement | undefined;
    ariaErrMsgId: string | undefined;
    styling: SVSClass | undefined;
    id: string | undefined;
    describedby: string | undefined;
  }
  interface Hooks {
    events?: FileInputEvents;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }
  interface Props {
    state: State;
    hooks?: Hooks;
    input?: FileInputProps;
  }

  let { state, hooks, input = {} }: Props = $props();
  const ctx: FileInputContext = {
    get files() {
      return state.files;
    },
    set files(v) {
      state.files = v;
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
      onadd: (detail) => hooks?.events?.onadd?.(detail),
    },
    onchange: (ev) => hooks?.onchange?.(ev),
    oninvalid: (ev) => hooks?.oninvalid?.(ev),
  };
  _setFileInputContext(ctx);
</script>

<FileInput {...input} />
