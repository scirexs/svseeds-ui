import { describe, expect, test } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import FileField, { type FileFieldConstraint, type FileFieldValidation } from "#svs/FileField.svelte";
import { PARTS, VARIANT } from "#svs/core";

function mkFile(name: string, type = "", size = 10): File {
  const f = new File(["x".repeat(Math.min(size, 1024))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}
function names(files: File[]): string[] {
  return files.map((f) => f.name);
}

const label = "Attachments";
const extra = "(optional)";
const bottom = "Choose files";
const aux = createRawSnippet((files: () => File[], variant: () => string, element: () => HTMLInputElement | undefined) => ({
  render: () => `<span data-testid="aux">${files().length}:${variant()}:${element() ? "element" : "none"}</span>`,
}));
const left = createRawSnippet((files: () => File[], variant: () => string, element: () => HTMLInputElement | undefined) => ({
  render: () => `<span data-testid="left">${files().length}:${variant()}:${element() ? "element" : "none"}</span>`,
}));
const right = createRawSnippet((files: () => File[], variant: () => string, element: () => HTMLInputElement | undefined) => ({
  render: () => `<span data-testid="right">${files().length}:${variant()}:${element() ? "element" : "none"}</span>`,
}));
const content = createRawSnippet((files: () => File[], dragover: () => boolean, variant: () => string) => ({
  render: () => `<span data-testid="content">${files().length}:${dragover()}:${variant()}</span>`,
}));

describe("FileField layout and default child", () => {
  test("renders label, extra, group, bottom, side snippets, and native file input", async () => {
    const { container, getByRole, getByText, getByTestId } = render(FileField, { label, extra, aux, left, right, bottom, files: [mkFile("a.png")], content });
    const group = getByRole("group");
    const lbl = getByText(label);
    const input = container.querySelector("input") as HTMLInputElement;
    const btm = getByText(bottom);

    await tick();
    expect(group).toHaveClass("svs-file-field", PARTS.WHOLE);
    expect(group).toHaveAttribute("aria-labelledby", lbl.id);
    expect(lbl).toHaveAttribute("for", input.id);
    expect(within(lbl).getByText(extra)).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "file");
    expect(btm).toHaveClass("svs-file-field", PARTS.BOTTOM);
    expect(input).toHaveAccessibleDescription(bottom);
    expect(getByTestId("aux")).toHaveTextContent("1:active:");
    expect(getByTestId("left")).toHaveTextContent("1:active:");
    expect(getByTestId("right")).toHaveTextContent("1:active:");
  });

  test("reserves and flips bottom, replaces child, and forwards content snippet", () => {
    const reserved = render(FileField, { reserve: true, content });
    const group = reserved.getByRole("group");
    expect(group.lastElementChild).toHaveClass("svs-file-field", PARTS.BOTTOM);
    expect(group.lastElementChild).toHaveTextContent("");

    reserved.rerender({ bottom, flip: true, content });
    expect(group.firstElementChild).toHaveClass("svs-file-field", PARTS.BOTTOM);
    expect(group.firstElementChild).toHaveTextContent(bottom);

    const children = createRawSnippet(() => ({ render: () => "<span data-testid='replacement'>custom</span>" }));
    const custom = render(FileField, { children, content });
    expect(custom.getByTestId("replacement")).toBeInTheDocument();
    expect(custom.container.querySelector("input")).toBeNull();

    const forwarded = render(FileField, { content });
    expect(within(forwarded.container).getByTestId("content")).toHaveTextContent(`0:false:${VARIANT.NEUTRAL}`);
  });

  test("name reaches the file input and no hidden inputs are rendered", () => {
    const { container } = render(FileField, { name: "docs", content });
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveAttribute("name", "docs");
    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });
});

describe("FileField constraints", () => {
  test("primitive rejection reasons map to messages and leave files uncommitted", async () => {
    const props = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [(({ reason }) => (reason === "accept" ? "type" : null)) as FileFieldConstraint],
      fileInput: { accept: ".png" },
    });
    const { container, getByRole } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();
    expect(props.element).toBe(input);

    await fireEvent.change(input, { target: { files: [mkFile("a.txt", "text/plain")] } });
    await tick();
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("type");
  });

  test("maxSize and maxFiles reasons map similarly, while unhandled reasons reject silently", async () => {
    const sizeProps = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [(({ reason }) => (reason === "maxSize" ? "size" : null)) as FileFieldConstraint],
      fileInput: { maxSize: 5 },
    });
    const sizeRender = render(FileField, sizeProps);
    await tick();
    await fireEvent.change(sizeRender.container.querySelector("input") as HTMLInputElement, { target: { files: [mkFile("big.png", "image/png", 10)] } });
    await tick();
    expect(sizeProps.variant).toBe(VARIANT.INACTIVE);
    expect(sizeRender.getByRole("alert")).toHaveTextContent("size");

    const countProps = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      multiple: true,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [(({ reason }) => (reason === "maxFiles" ? "count" : null)) as FileFieldConstraint],
      fileInput: { maxFiles: 1 },
    });
    const countRender = render(FileField, countProps);
    await tick();
    await fireEvent.change(countRender.container.querySelector("input") as HTMLInputElement, {
      target: { files: [mkFile("a.png", "image/png"), mkFile("b.png", "image/png")] },
    });
    await tick();
    expect(names(countProps.files)).toEqual(["a.png"]);
    expect(countProps.variant).toBe(VARIANT.INACTIVE);
    expect(within(countRender.container).getByRole("alert")).toHaveTextContent("count");

    const silentProps = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, constraints: [] as FileFieldConstraint[], fileInput: { accept: ".png" } });
    const silentRender = render(FileField, silentProps);
    await tick();
    await fireEvent.change(silentRender.container.querySelector("input") as HTMLInputElement, { target: { files: [mkFile("a.txt", "text/plain")] } });
    await tick();
    expect(silentProps.files).toEqual([]);
    expect(silentProps.variant).toBe(VARIANT.NEUTRAL);
    expect(silentRender.container.querySelector(`.${PARTS.BOTTOM}`)).toBeNull();
  });

  test("custom constraints veto candidates before commit and primitive messages take precedence", async () => {
    const props = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      multiple: true,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [
        (({ file, reason }) => {
          if (reason === "accept") return "type";
          if (!reason && file.name.endsWith(".exe")) return "no exe";
          return null;
        }) as FileFieldConstraint,
      ],
      fileInput: { accept: "image/*" },
    });
    const { container, getByRole } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    await fireEvent.change(input, { target: { files: [mkFile("bad.txt", "text/plain"), mkFile("tool.exe", "image/png"), mkFile("ok.png", "image/png")] } });
    await tick();
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("type");

    props.files = [];
    props.variant = VARIANT.NEUTRAL;
    await tick();
    await fireEvent.change(input, { target: { files: [mkFile("tool.exe", "image/png")] } });
    await tick();
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("no exe");

    await fireEvent.change(input, { target: { files: [mkFile("ok.png", "image/png")] } });
    await tick();
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });
});

describe("FileField validations and bindings", () => {
  test("whole-list validations react to add and external removal", async () => {
    const validations: FileFieldValidation[] = [({ value }) => (value.length < 1 ? "required" : null)];
    const props = $state({ files: [mkFile("seed.png", "image/png")] as File[], variant: VARIANT.NEUTRAL, content, validations });
    const { container, getByRole } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("required");

    await fireEvent.change(input, { target: { files: [mkFile("a.png", "image/png")] } });
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(getByRole("alert")).toHaveTextContent("required");
  });

  test("pristine empty field does not show validation error until touched", async () => {
    const validations: FileFieldValidation[] = [({ value }) => (value.length < 1 ? "required" : null)];
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, validations });
    const { container, queryByRole } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(queryByRole("alert")).toBeNull();

    await fireEvent.change(input, { target: { files: [mkFile("a.png", "image/png")] } });
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(queryByRole("alert")).toHaveTextContent("required");
  });

  test("external files mutation after a rejected add clears stale add errors", async () => {
    const props = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [(({ file, reason }) => (!reason && file.name.endsWith(".exe") ? "no exe" : null)) as FileFieldConstraint],
    });
    const { container, queryByRole } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    await fireEvent.change(input, { target: { files: [mkFile("tool.exe", "application/octet-stream")] } });
    await tick();
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(queryByRole("alert")).toHaveTextContent("no exe");

    props.files = [mkFile("ok.png", "image/png")];
    await tick();
    await tick();
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(queryByRole("alert")).toBeNull();
  });

  test("binds files, variant, and element; invalid event prevents default", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, element: undefined as HTMLInputElement | undefined });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    expect(props.element).toBe(input);
    await fireEvent.change(input, { target: { files: [mkFile("a.png", "image/png")] } });
    await tick();
    expect(names(props.files)).toEqual(["a.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    const ev = new Event("invalid", { cancelable: true });
    input.setCustomValidity("native");
    const prevented = !input.dispatchEvent(ev);
    expect(prevented).toBe(true);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("variant semantics and styling chain are applied", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(input).toHaveClass("svs-file-field", "svs-file-input", PARTS.MAIN);

    await fireEvent.change(input, { target: { files: [mkFile("a.png", "image/png")] } });
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("drag-over active display stays local to the nested file input", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, fileInput: { droppable: true } });
    const { container, getByRole } = render(FileField, props);
    const group = getByRole("group");
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireEvent.dragEnter(label);
    await tick();
    expect(label).toHaveClass(VARIANT.ACTIVE);
    expect(group).toHaveClass(VARIANT.NEUTRAL);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await fireEvent.dragLeave(label);
    await tick();
    expect(label).toHaveClass(VARIANT.NEUTRAL);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
});
