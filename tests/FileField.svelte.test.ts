import axe from "axe-core";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import FileField, { type FileFieldConstraint, type FileFieldValidation } from "#svs/FileField.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

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
const dt = (files: File[]) => {
  const t = new DataTransfer();
  for (const f of files) t.items.add(f);
  return t;
};
const setFiles = async (input: HTMLInputElement, files: File[]) => {
  input.files = dt(files).files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
};
const fireDrag = async (el: HTMLElement, type: "dragenter" | "dragover" | "dragleave", files: File[] = []) => {
  el.dispatchEvent(new DragEvent(type, { dataTransfer: dt(files), bubbles: true, cancelable: true }));
  await tick();
};
const group = (container: HTMLElement) => container.querySelector('[role="group"]') as HTMLElement;
const alert = (container: HTMLElement) => container.querySelector('[role="alert"]') as HTMLElement | null;
const byText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("*")).find((e) => e.textContent?.trim() === text) as HTMLElement;
const has = (el: Element, ...names: string[]) => expect([...el.classList]).toEqual(expect.arrayContaining(names));

describe("FileField layout and default child", () => {
  test("renders label, extra, group, bottom, side snippets, and native file input", async () => {
    const { container, getByTestId } = render(FileField, { label, extra, aux, left, right, bottom, files: [mkFile("a.png")], content });
    const root = group(container);
    const lbl = container.querySelector(`.${PARTS.LABEL}`) as HTMLLabelElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const btm = container.querySelector(`.${PARTS.BOTTOM}`) as HTMLElement;

    await tick();
    has(root, "svs-file-field", PARTS.WHOLE);
    expect(root.getAttribute("aria-labelledby")).toBe(lbl.id);
    expect(lbl.getAttribute("for")).toBe(input.id);
    expect(byText(lbl, extra)).toBeTruthy();
    expect(input.getAttribute("type")).toBe("file");
    has(btm, "svs-file-field", PARTS.BOTTOM);
    await expect.element(input).toHaveAccessibleDescription(bottom);
    await expect.element(getByTestId("aux")).toHaveTextContent("1:active:");
    await expect.element(getByTestId("left")).toHaveTextContent("1:active:");
    await expect.element(getByTestId("right")).toHaveTextContent("1:active:");
  });

  test("reserves bottom, replaces child, and forwards content snippet", async () => {
    const reserved = render(FileField, { reserve: true, content });
    const root = group(reserved.container);
    has(root.lastElementChild as Element, "svs-file-field", PARTS.BOTTOM);
    expect(root.lastElementChild?.textContent).toBe("");

    await reserved.rerender({ bottom, content });
    has(root.lastElementChild as Element, "svs-file-field", PARTS.BOTTOM);
    expect(root.lastElementChild?.textContent).toBe(bottom);

    const children = createRawSnippet(() => ({ render: () => "<span data-testid='replacement'>custom</span>" }));
    const custom = render(FileField, { children, content });
    await expect.element(custom.getByTestId("replacement")).toBeInTheDocument();
    expect(custom.container.querySelector("input")).toBeNull();

    const forwarded = render(FileField, { content });
    expect(forwarded.container.querySelector('[data-testid="content"]')?.textContent).toBe(`0:false:${VARIANT.NEUTRAL}`);
  });

  test("renders children without a content prop", () => {
    const children = createRawSnippet(() => ({ render: () => "<span data-testid='replacement'>custom</span>" }));
    const { container, getByTestId } = render(FileField, { children });

    expect(getByTestId("replacement")).toBeTruthy();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();
  });

  test("name reaches the file input and no hidden inputs are rendered", () => {
    const { container } = render(FileField, { name: "docs", content });
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input.getAttribute("name")).toBe("docs");
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
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();
    expect(props.element).toBe(input);

    await setFiles(input, [mkFile("a.txt", "text/plain")]);
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("type");
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
    await setFiles(sizeRender.container.querySelector("input") as HTMLInputElement, [mkFile("big.png", "image/png", 10)]);
    expect(sizeProps.variant).toBe(VARIANT.INACTIVE);
    expect(alert(sizeRender.container)?.textContent).toBe("size");

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
    await setFiles(countRender.container.querySelector("input") as HTMLInputElement, [
      mkFile("a.png", "image/png"),
      mkFile("b.png", "image/png"),
    ]);
    expect(names(countProps.files)).toEqual(["a.png"]);
    expect(countProps.variant).toBe(VARIANT.INACTIVE);
    expect(alert(countRender.container)?.textContent).toBe("count");

    const silentProps = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      content,
      constraints: [] as FileFieldConstraint[],
      fileInput: { accept: ".png" },
    });
    const silentRender = render(FileField, silentProps);
    await tick();
    await setFiles(silentRender.container.querySelector("input") as HTMLInputElement, [mkFile("a.txt", "text/plain")]);
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
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    await setFiles(input, [mkFile("bad.txt", "text/plain"), mkFile("tool.exe", "image/png"), mkFile("ok.png", "image/png")]);
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("type");

    props.files = [];
    props.variant = VARIANT.NEUTRAL;
    await tick();
    await setFiles(input, [mkFile("tool.exe", "image/png")]);
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("no exe");

    await setFiles(input, [mkFile("ok.png", "image/png")]);
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
  });
});

describe("FileField validations and bindings", () => {
  test("whole-list validations react to add and external removal", async () => {
    const validations: FileFieldValidation[] = [({ value }) => (value.length < 1 ? "required" : null)];
    const props = $state({ files: [mkFile("seed.png", "image/png")] as File[], variant: VARIANT.NEUTRAL, content, validations });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("required");

    await setFiles(input, [mkFile("a.png", "image/png")]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("required");
  });

  test("pristine empty field does not show validation error until touched", async () => {
    const validations: FileFieldValidation[] = [({ value }) => (value.length < 1 ? "required" : null)];
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, validations });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(alert(container)).toBeNull();

    await setFiles(input, [mkFile("a.png", "image/png")]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("required");
  });

  test("external files mutation after a rejected add clears stale add errors", async () => {
    const props = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      content,
      element: undefined as HTMLInputElement | undefined,
      constraints: [(({ file, reason }) => (!reason && file.name.endsWith(".exe") ? "no exe" : null)) as FileFieldConstraint],
    });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    await setFiles(input, [mkFile("tool.exe", "application/octet-stream")]);
    expect(props.files).toEqual([]);
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe("no exe");

    props.files = [mkFile("ok.png", "image/png")];
    await tick();
    await tick();
    expect(names(props.files)).toEqual(["ok.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(alert(container)).toBeNull();
  });

  test("binds files, variant, and element; invalid event prevents default", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, element: undefined as HTMLInputElement | undefined });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;
    await tick();

    expect(props.element).toBe(input);
    await setFiles(input, [mkFile("a.png", "image/png")]);
    expect(names(props.files)).toEqual(["a.png"]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    const ev = new Event("invalid", { cancelable: true });
    input.setCustomValidity("native");
    const prevented = !input.dispatchEvent(ev);
    await tick();
    expect(prevented).toBe(true);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });

  test("variant semantics and styling chain are applied", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    has(input, "svs-file-field", "svs-file-input", PARTS.MAIN);

    await setFiles(input, [mkFile("a.png", "image/png")]);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.files = [];
    await tick();
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("drag-over active display stays local to the nested file input", async () => {
    const props = $state({ files: [] as File[], variant: VARIANT.NEUTRAL, content, fileInput: { droppable: true } });
    const { container } = render(FileField, props);
    const root = group(container);
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireDrag(label, "dragenter");
    has(label, VARIANT.ACTIVE);
    has(root, VARIANT.NEUTRAL);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await fireDrag(label, "dragleave");
    has(label, VARIANT.NEUTRAL);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });
});

describe("accessibility (axe)", () => {
  test("default render has no violations", async () => {
    const { container } = render(FileField, { label, content });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("invalid state has no violations", async () => {
    const msg = "required";
    const validations: FileFieldValidation[] = [({ value }) => (value.length < 1 ? msg : null)];
    const props = $state({ label, files: [] as File[], variant: VARIANT.NEUTRAL, content, validations });
    const { container } = render(FileField, props);
    const input = container.querySelector("input") as HTMLInputElement;

    input.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();
    expect(props.variant).toBe(VARIANT.INACTIVE);
    expect(alert(container)?.textContent).toBe(msg);
    expect(await axe.run(container)).toHaveNoViolations();
  });
});
