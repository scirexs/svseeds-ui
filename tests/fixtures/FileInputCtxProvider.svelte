<script lang="ts">
  import FileInput, { _setFileInputContext, type FileInputContext, type FileInputEvents, type FileInputProps } from "#svs/FileInput.svelte";
  import { type SVSClass, type SVSVariant } from "#svs/core";
  import { createRawSnippet } from "svelte";

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
  type InputProps = Omit<FileInputProps, "children"> & { children?: FileInputProps["children"] };
  interface Props {
    state: State;
    hooks?: Hooks;
    input?: InputProps;
  }

  let { state, hooks, input = {} }: Props = $props();
  const children = createRawSnippet(() => ({ render: () => "<span>zone</span>" }));
  const inputChildren = $derived(input.children ?? children);
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
      onremove: (detail) => hooks?.events?.onremove?.(detail),
    },
    onchange: (ev) => hooks?.onchange?.(ev),
    oninvalid: (ev) => hooks?.oninvalid?.(ev),
  };
  _setFileInputContext(ctx);
</script>

<FileInput {...input} children={inputChildren} />
