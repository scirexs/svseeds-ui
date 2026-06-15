import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import FileInput, { type FileRejectReason } from "#svs/_FileInput.svelte";
import { PARTS, VARIANT } from "#svs/core";
import FileInputCtxProvider from "./fixtures/FileInputCtxProvider.svelte";
import FileInputDragProbe from "./fixtures/FileInputDragProbe.svelte";

function mkFile(name: string, type = "", size = 10): File {
  const f = new File(["x".repeat(Math.min(size, 1024))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}
function names(files: File[]): string[] {
  return files.map((f) => f.name);
}
function expectReasons(actual: string[], expected: string[]) {
  expect([...actual].sort()).toEqual([...expected].sort());
}

const zone = createRawSnippet(() => ({ render: () => "<span>zone</span>" }));

describe("_FileInput rendering", () => {
  test("renders one sr-only file input, root, visible wrapper, attrs, and children args", () => {
    const children = createRawSnippet((files: () => File[], dragover: () => boolean, variant: () => string) => ({
      render: () => `<span data-testid="probe">${files().length}:${dragover()}:${variant()}</span>`,
    }));
    const { container, getByTestId } = render(FileInput, {
      class: "x",
      multiple: true,
      accept: ".png",
      name: "upload",
      "aria-label": "Upload",
      "data-x": "ok",
      children,
    });
    const input = container.querySelector("input") as HTMLInputElement;
    const root = container.firstElementChild as HTMLDivElement;
    const middle = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    expect(container.querySelectorAll("input")).toHaveLength(1);
    expect(middle).toContainElement(input);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveClass("svs-file-input", PARTS.MAIN, "x");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", ".png");
    expect(input).toHaveAttribute("name", "upload");
    expect(input).toHaveAttribute("aria-label", "Upload");
    expect(input).toHaveAttribute("data-x", "ok");
    expect(root).toHaveClass("svs-file-input", PARTS.WHOLE);
    expect(middle).toHaveClass("svs-file-input", PARTS.MIDDLE);
    expect(input.getAttribute("style")).toContain("clip-path: inset(50%)");
    expect(getByTestId("probe")).toHaveTextContent(`0:false:${VARIANT.NEUTRAL}`);
  });

  test("root is not exposed as a button (no role/tabindex/keydown control)", () => {
    const { container } = render(FileInput, { children: zone });
    const root = container.firstElementChild as HTMLDivElement;
    expect(root).not.toHaveAttribute("role");
    expect(root).not.toHaveAttribute("tabindex");
  });

  test("root key presses do not proxy activation to the native input", async () => {
    const { container } = render(FileInput, { children: zone });
    const root = container.firstElementChild as HTMLDivElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    await fireEvent.keyDown(root, { key: "Enter" });
    await fireEvent.keyDown(root, { key: " " });

    expect(click).not.toHaveBeenCalled();
  });

  test("cancelling the picker does not throw (native files resync hook)", () => {
    const { container } = render(FileInput, { children: zone });
    const input = container.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("cancel"));
    expect(input).toBeInTheDocument();
  });
});

describe("_FileInput self-validation", () => {
  test("rejects by accept, maxSize, maxFiles, and collects mixed reasons", async () => {
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], multiple: true, accept: ".png,image/*", maxSize: 1_000_000, maxFiles: 2, droppable: true, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;
    const good = mkFile("a.png", "image/png");
    const txt = mkFile("a.txt", "text/plain");
    const big = mkFile("b.png", "image/png", 2_000_000);
    const extra = mkFile("c.png", "image/png");

    await fireEvent.change(input, { target: { files: [txt] } });
    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["accept"]);

    await fireEvent.change(input, { target: { files: [big] } });
    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["maxSize"]);

    await fireEvent.change(input, { target: { files: [good, extra, mkFile("d.png", "image/png")] } });
    expect(names(props.files)).toEqual(["a.png", "c.png"]);
    expect(props.rejectBy).toEqual(["maxFiles"]);

    props.files = [];
    await tick();
    await fireEvent.drop(container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement, { dataTransfer: { files: [good, txt, big] } });
    expect(names(props.files)).toEqual(["a.png"]);
    expectReasons(props.rejectBy, ["accept", "maxSize"]);
  });

  test("single mode replaces, and rejectBy resets after accepted add", async () => {
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;
    const f1 = mkFile("one.png", "image/png");
    const f2 = mkFile("two.png", "image/png");

    await fireEvent.change(input, { target: { files: [mkFile("bad.txt", "text/plain")] } });
    expect(props.rejectBy).toEqual(["accept"]);

    await fireEvent.change(input, { target: { files: [f1] } });
    expect(props.files).toEqual([f1]);
    expect(props.rejectBy).toEqual([]);

    await fireEvent.change(input, { target: { files: [f2] } });
    expect(props.files).toEqual([f2]);
  });
});

describe("_FileInput events and context", () => {
  test("prop onadd vetoes candidates and receives primitive rejections", async () => {
    const keep = mkFile("keep.png", "image/png");
    const veto = mkFile("veto.png", "image/png");
    const rejected = mkFile("bad.txt", "text/plain");
    const onadd = vi.fn(({ candidates }) => [candidates[1]]);
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], multiple: true, accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await fireEvent.change(input, { target: { files: [keep, veto, rejected] } });

    expect(names(props.files)).toEqual(["keep.png"]);
    expect(props.rejectBy).toEqual(["accept"]);
    expect(onadd).toHaveBeenCalledWith({
      candidates: [keep, veto],
      rejected: [{ file: rejected, reason: "accept" }],
      files: [],
    });
  });

  test("onadd still runs when every incoming file is rejected by the primitive gate", async () => {
    const rejected = mkFile("bad.txt", "text/plain");
    const onadd = vi.fn();
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await fireEvent.change(input, { target: { files: [rejected] } });

    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["accept"]);
    expect(onadd).toHaveBeenCalledWith({
      candidates: [],
      rejected: [{ file: rejected, reason: "accept" }],
      files: [],
    });
  });

  test("context values win, writes commit through ctx, vetoes are unioned, and hooks order is prop then ctx", async () => {
    const propFile = mkFile("prop.png", "image/png");
    const ctxFile = mkFile("ctx.png", "image/png");
    const keep = mkFile("keep.png", "image/png");
    const propVeto = mkFile("prop-veto.png", "image/png");
    const ctxVeto = mkFile("ctx-veto.png", "image/png");
    const order: string[] = [];
    const propChange = vi.fn(() => order.push("prop-change"));
    const ctxChange = vi.fn(() => order.push("ctx-change"));
    const propInvalid = vi.fn(() => order.push("prop-invalid"));
    const ctxInvalid = vi.fn(() => order.push("ctx-invalid"));
    const children = createRawSnippet((files: () => File[], _dragover: () => boolean, variant: () => string) => ({
      render: () => `<span data-testid="ctx-probe">${names(files()).join(",")}:${variant()}</span>`,
    }));
    const state = $state({
      files: [ctxFile],
      variant: VARIANT.ACTIVE,
      element: undefined as HTMLInputElement | undefined,
      ariaErrMsgId: "err",
      styling: "ctx-style",
      id: "ctx-id",
      describedby: "desc",
    });
    const { container, getByTestId } = render(FileInputCtxProvider, {
      state,
      hooks: { events: { onadd: () => [ctxVeto] }, onchange: ctxChange, oninvalid: ctxInvalid },
      input: { files: [propFile], multiple: true, events: { onadd: () => [propVeto] }, onchange: propChange, oninvalid: propInvalid, children },
    });
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(getByTestId("ctx-probe")).toHaveTextContent("ctx.png:active");
    expect(state.element).toBe(input);
    expect(input).toHaveAttribute("id", "ctx-id");
    expect(input).toHaveAttribute("aria-describedby", "desc");
    expect(input).toHaveAttribute("aria-errormessage", "err");

    await fireEvent.change(input, { target: { files: [keep, propVeto, ctxVeto] } });
    expect(names(state.files)).toEqual(["ctx.png", "keep.png"]);
    expect(order).toEqual(["prop-change", "ctx-change"]);

    await fireEvent.invalid(input);
    expect(order).toEqual(["prop-change", "ctx-change", "prop-invalid", "ctx-invalid"]);
  });
});

describe("_FileInput drop zone and a11y", () => {
  test("drag state is exposed and drop runs the add pipeline", async () => {
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true });
    const { container, getByTestId } = render(FileInputDragProbe, props);
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireEvent.dragEnter(label);
    await tick();
    expect(label).toHaveAttribute("data-dragover", "true");
    expect(getByTestId("drag")).toHaveTextContent("true");

    await fireEvent.dragLeave(label);
    expect(label).not.toHaveAttribute("data-dragover");

    await fireEvent.dragOver(label);
    await fireEvent.drop(label, { dataTransfer: { files: [mkFile("good.png", "image/png"), mkFile("bad.txt", "text/plain")] } });
    expect(label).not.toHaveAttribute("data-dragover");
    expect(names(props.files)).toEqual(["good.png"]);
    expect(props.rejectBy).toEqual(["accept"]);
  });

  test("drag and drop are ignored when droppable is absent or false", async () => {
    const absent = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true, children: zone });
    const absentView = render(FileInput, absent);
    const absentLabel = absentView.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireEvent.dragEnter(absentLabel);
    await tick();
    expect(absentLabel).not.toHaveAttribute("data-dragover");
    await fireEvent.drop(absentLabel, { dataTransfer: { files: [mkFile("absent.png", "image/png")] } });
    expect(absent.files).toEqual([]);
    expect(absent.rejectBy).toEqual([]);

    const explicit = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true, droppable: false, children: zone });
    const explicitView = render(FileInput, explicit);
    const explicitLabel = explicitView.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireEvent.dragEnter(explicitLabel);
    await tick();
    expect(explicitLabel).not.toHaveAttribute("data-dragover");
    await fireEvent.drop(explicitLabel, { dataTransfer: { files: [mkFile("explicit.png", "image/png")] } });
    expect(explicit.files).toEqual([]);
    expect(explicit.rejectBy).toEqual([]);
  });

  test("disabled drop is a no-op and visible click opens the picker once", async () => {
    const props = $state({ files: [] as File[], droppable: true, disabled: true, children: zone });
    const { container } = render(FileInput, props);
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;
    const disabledInput = container.querySelector("input") as HTMLInputElement;
    const disabledClick = vi.fn();
    disabledInput.addEventListener("click", disabledClick);

    await fireEvent.drop(label, { dataTransfer: { files: [mkFile("a.png", "image/png")] } });
    expect(props.files).toEqual([]);
    await fireEvent.click(label);
    expect(disabledClick).not.toHaveBeenCalled();

    const active = render(FileInput, { droppable: true, children: zone });
    await tick();
    const liveInput = active.container.querySelector("input") as HTMLInputElement;
    const liveMiddle = active.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;
    const click = vi.fn();
    liveInput.addEventListener("click", click);
    await fireEvent.click(liveMiddle);
    expect(click).toHaveBeenCalledTimes(1);
  });

  test("drag-over flips the rendered variant to active locally", async () => {
    const probe = createRawSnippet((files: () => File[], dragover: () => boolean, variant: () => string) => {
      const text = () => `${files().length}:${dragover()}:${variant()}`;
      return {
        render: () => `<span data-testid="variant">${text()}</span>`,
        setup: (node: Element) => {
          $effect(() => {
            node.textContent = text();
          });
        },
      };
    });
    const { container, getByTestId } = render(FileInput, { droppable: true, variant: VARIANT.NEUTRAL, children: probe });
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireEvent.dragEnter(label);
    await tick();
    expect(getByTestId("variant")).toHaveTextContent(`0:true:${VARIANT.ACTIVE}`);
    expect(label).toHaveClass(VARIANT.ACTIVE);

    await fireEvent.dragLeave(label);
    await tick();
    expect(getByTestId("variant")).toHaveTextContent(`0:false:${VARIANT.NEUTRAL}`);
    expect(label).toHaveClass(VARIANT.NEUTRAL);
  });

  test("aux renders outside the label and remove syncs bound files", async () => {
    const a = mkFile("a.png", "image/png");
    const b = mkFile("b.png", "image/png");
    const aux = createRawSnippet((files: () => File[], remove: () => (file: File) => void, variant: () => string) => {
      const text = () => `${files().map((f) => f.name).join(",")}:${variant()}`;
      return {
        render: () => `<button type="button" data-testid="remove">${text()}</button>`,
        setup: (node: Element) => {
          $effect(() => {
            node.textContent = text();
            (node as HTMLButtonElement).onclick = () => {
              const file = files()[0];
              if (file) remove()(file);
            };
          });
        },
      };
    });
    const props = $state({ files: [a, b] as File[], multiple: true, children: zone, aux });
    const { container, getByTestId } = render(FileInput, { props });
    const root = container.firstElementChild as HTMLDivElement;
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;
    const auxEl = container.querySelector(`.${PARTS.AUX}`) as HTMLDivElement;
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(root.children).toContain(auxEl);
    expect(label).not.toContainElement(auxEl);
    await fireEvent.click(getByTestId("remove"));
    await tick();
    expect(props.files).toEqual([b]);
    if (typeof DataTransfer !== "undefined") expect(names([...(input.files ?? [])])).toEqual(["b.png"]);
  });

  test("flip controls aux and label DOM order", () => {
    const aux = createRawSnippet(() => ({ render: () => "<span>aux</span>" }));
    const normal = render(FileInput, { children: zone, aux });
    let items = [...(normal.container.firstElementChild as HTMLDivElement).children];
    expect(items[0]).toHaveClass(PARTS.MIDDLE);
    expect(items[1]).toHaveClass(PARTS.AUX);

    const flipped = render(FileInput, { children: zone, aux, flip: true });
    items = [...(flipped.container.firstElementChild as HTMLDivElement).children];
    expect(items[0]).toHaveClass(PARTS.AUX);
    expect(items[1]).toHaveClass(PARTS.MIDDLE);
  });

  test("standalone and context a11y attributes are wired", () => {
    const plain = render(FileInput, { "aria-describedby": "desc", "aria-invalid": "true", children: zone });
    const input = plain.container.querySelector("input") as HTMLInputElement;
    expect(input).toHaveAttribute("aria-describedby", "desc");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const state = $state({
      files: [] as File[],
      variant: VARIANT.NEUTRAL,
      element: undefined as HTMLInputElement | undefined,
      ariaErrMsgId: "ctx-err",
      styling: undefined,
      id: undefined,
      describedby: "ctx-desc",
    });
    const ctx = render(FileInputCtxProvider, { state });
    const ctxInput = ctx.container.querySelector("input") as HTMLInputElement;
    expect(ctxInput).toHaveAttribute("aria-describedby", "ctx-desc");
    expect(ctxInput).toHaveAttribute("aria-invalid", "true");
    expect(ctxInput).toHaveAttribute("aria-errormessage", "ctx-err");
  });

  test.skipIf(typeof DataTransfer === "undefined")("syncing external files does not throw and input click resets value", async () => {
    const props = $state({ files: [] as File[], children: zone });
    const { container } = render(FileInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    props.files = [mkFile("a.png", "image/png")];
    await tick();

    expect(props.files).toHaveLength(1);
    await fireEvent.click(input);
    expect(input).toHaveValue("");
  });
});
