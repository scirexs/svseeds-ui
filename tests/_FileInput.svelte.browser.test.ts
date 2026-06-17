import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
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
const drop = async (el: HTMLElement, files: File[]) => {
  el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt(files), bubbles: true, cancelable: true }));
  await tick();
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("_FileInput rendering", () => {
  test("renders one sr-only file input, root, visible wrapper, attrs, and children args", async () => {
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
    expect(middle.contains(input)).toBe(true);
    expect(input.getAttribute("type")).toBe("file");
    expect([...input.classList]).toEqual(expect.arrayContaining(["svs-file-input", PARTS.MAIN, "x"]));
    expect(input.hasAttribute("multiple")).toBe(true);
    expect(input.getAttribute("accept")).toBe(".png");
    expect(input.getAttribute("name")).toBe("upload");
    expect(input.getAttribute("aria-label")).toBe("Upload");
    expect(input.getAttribute("data-x")).toBe("ok");
    expect([...root.classList]).toEqual(expect.arrayContaining(["svs-file-input", PARTS.WHOLE]));
    expect([...middle.classList]).toEqual(expect.arrayContaining(["svs-file-input", PARTS.MIDDLE]));
    expect(input.getAttribute("style")).toContain("clip-path: inset(50%)");
    expect(input.getAttribute("style")).not.toContain("pointer-events");
    await expect.element(getByTestId("probe")).toHaveTextContent(`0:false:${VARIANT.NEUTRAL}`);
  });

  test("root is not exposed as a button (no role/tabindex/keydown control)", () => {
    const { container } = render(FileInput, { children: zone });
    const root = container.firstElementChild as HTMLDivElement;
    expect(root.hasAttribute("role")).toBe(false);
    expect(root.hasAttribute("tabindex")).toBe(false);
  });

  test("root key presses do not proxy activation to the native input", async () => {
    const { container } = render(FileInput, { children: zone });
    const root = container.firstElementChild as HTMLDivElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    root.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await tick();

    expect(click).not.toHaveBeenCalled();
  });

  test("cancelling the picker does not throw (native files resync hook)", () => {
    const { container } = render(FileInput, { children: zone });
    const input = container.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("cancel"));
    expect(input.isConnected).toBe(true);
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

    await setFiles(input, [txt]);
    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["accept"]);

    await setFiles(input, [big]);
    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["maxSize"]);

    await setFiles(input, [good, extra, mkFile("d.png", "image/png")]);
    expect(names(props.files)).toEqual(["a.png", "c.png"]);
    expect(props.rejectBy).toEqual(["maxFiles"]);

    props.files = [];
    await tick();
    await drop(container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement, [good, txt, big]);
    expect(names(props.files)).toEqual(["a.png"]);
    expectReasons(props.rejectBy, ["accept", "maxSize"]);
  });

  test("single mode replaces, and rejectBy resets after accepted add", async () => {
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;
    const f1 = mkFile("one.png", "image/png");
    const f2 = mkFile("two.png", "image/png");

    await setFiles(input, [mkFile("bad.txt", "text/plain")]);
    expect(props.rejectBy).toEqual(["accept"]);

    await setFiles(input, [f1]);
    expect(props.files).toEqual([f1]);
    expect(props.rejectBy).toEqual([]);

    await setFiles(input, [f2]);
    expect(props.files).toEqual([f2]);
  });
});

describe("_FileInput events and context", () => {
  test("prop onadd commits returned files and receives primitive rejections", async () => {
    const keep = mkFile("keep.png", "image/png");
    const veto = mkFile("veto.png", "image/png");
    const rejected = mkFile("bad.txt", "text/plain");
    const onadd = vi.fn(({ added }: { added: File[] }) => [added[0]]);
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], multiple: true, accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [keep, veto, rejected]);

    expect(names(props.files)).toEqual(["keep.png"]);
    expect(props.rejectBy).toEqual(["accept"]);
    expect(onadd).toHaveBeenCalledWith({
      values: [],
      added: [keep, veto],
      rejected: [{ file: rejected, reason: "accept" }],
    });
  });

  test("prop onadd returning [] vetoes all accepted files", async () => {
    const first = mkFile("first.png", "image/png");
    const second = mkFile("second.png", "image/png");
    const onadd = vi.fn(() => []);
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], multiple: true, accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [first, second]);

    expect(props.files).toEqual([]);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: [first, second], rejected: [] });
  });

  test("prop onadd returning undefined commits every accepted file", async () => {
    const first = mkFile("first.png", "image/png");
    const second = mkFile("second.png", "image/png");
    const onadd = vi.fn();
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], multiple: true, accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [first, second]);

    expect(props.files).toEqual([first, second]);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: [first, second], rejected: [] });
  });

  test("single-mode onadd receives the pre-change file collection", async () => {
    const existing = mkFile("existing.png", "image/png");
    const next = mkFile("next.png", "image/png");
    const onadd = vi.fn();
    const props = $state({ files: [existing] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [next]);

    expect(props.files).toEqual([next]);
    expect(onadd).toHaveBeenCalledWith({ values: [existing], added: [next], rejected: [] });
  });

  test("single-mode onadd full veto retains the existing file", async () => {
    const existing = mkFile("existing.png", "image/png");
    const incoming = mkFile("incoming.png", "image/png");
    const onadd = vi.fn(() => []);
    const props = $state({ files: [existing] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [incoming]);

    expect(props.files).toEqual([existing]);
    expect(onadd).toHaveBeenCalledWith({ values: [existing], added: [incoming], rejected: [] });
  });

  test("single-mode primitive gate rejection retains the existing file", async () => {
    const existing = mkFile("existing.png", "image/png");
    const rejected = mkFile("bad.txt", "text/plain");
    const onadd = vi.fn();
    const props = $state({ files: [existing] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [rejected]);

    expect(props.files).toEqual([existing]);
    expect(props.rejectBy).toEqual(["accept"]);
    expect(onadd).toHaveBeenCalledWith({ values: [existing], added: [], rejected: [{ file: rejected, reason: "accept" }] });
    expect(names([...(input.files ?? [])])).toEqual(["existing.png"]);
  });

  test("onadd still runs when every incoming file is rejected by the primitive gate", async () => {
    const rejected = mkFile("bad.txt", "text/plain");
    const onadd = vi.fn();
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", events: { onadd }, children: zone });
    const { container } = render(FileInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await setFiles(input, [rejected]);

    expect(props.files).toEqual([]);
    expect(props.rejectBy).toEqual(["accept"]);
    expect(onadd).toHaveBeenCalledWith({
      values: [],
      added: [],
      rejected: [{ file: rejected, reason: "accept" }],
    });
  });

  test("context values win, writes commit through ctx, allow-lists intersect, and hooks order is prop then ctx", async () => {
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
      hooks: { events: { onadd: () => [keep, propVeto] }, onchange: ctxChange, oninvalid: ctxInvalid },
      input: { files: [propFile], multiple: true, events: { onadd: () => [keep, ctxVeto] }, onchange: propChange, oninvalid: propInvalid, children },
    });
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    await expect.element(getByTestId("ctx-probe")).toHaveTextContent("ctx.png:active");
    expect(state.element).toBe(input);
    expect(input.getAttribute("id")).toBe("ctx-id");
    expect(input.getAttribute("aria-describedby")).toBe("desc");
    expect(input.getAttribute("aria-errormessage")).toBe("err");

    await setFiles(input, [keep, propVeto, ctxVeto]);
    expect(names(state.files)).toEqual(["ctx.png", "keep.png"]);
    expect(order).toEqual(["prop-change", "ctx-change"]);

    input.dispatchEvent(new Event("invalid", { bubbles: true }));
    await tick();
    expect(order).toEqual(["prop-change", "ctx-change", "prop-invalid", "ctx-invalid"]);
  });

  test("prop onremove can veto removal with []", async () => {
    const a = mkFile("a.png", "image/png");
    const b = mkFile("b.png", "image/png");
    const onremove = vi.fn(() => []);
    const aux = createRawSnippet((files: () => File[], remove: () => (file: File) => void) => ({
      render: () => `<button type="button" data-testid="remove">${files().map((f) => f.name).join(",")}</button>`,
      setup: (node: Element) => {
        $effect(() => {
          node.textContent = files().map((f) => f.name).join(",");
          (node as HTMLButtonElement).onclick = () => {
            const file = files()[0];
            if (file) remove()(file);
          };
        });
      },
    }));
    const props = $state({ files: [a, b] as File[], multiple: true, events: { onremove }, children: zone, aux });
    const { getByTestId } = render(FileInput, { props });

    await getByTestId("remove").click();

    expect(onremove).toHaveBeenCalledWith({ values: [a, b], removed: [a] });
    expect(props.files).toEqual([a, b]);
  });

  test("prop onremove commits when undefined is returned", async () => {
    const a = mkFile("a.png", "image/png");
    const b = mkFile("b.png", "image/png");
    const onremove = vi.fn();
    const aux = createRawSnippet((files: () => File[], remove: () => (file: File) => void) => ({
      render: () => `<button type="button" data-testid="remove">${files().map((f) => f.name).join(",")}</button>`,
      setup: (node: Element) => {
        $effect(() => {
          node.textContent = files().map((f) => f.name).join(",");
          (node as HTMLButtonElement).onclick = () => {
            const file = files()[0];
            if (file) remove()(file);
          };
        });
      },
    }));
    const props = $state({ files: [a, b] as File[], multiple: true, events: { onremove }, children: zone, aux });
    const { getByTestId } = render(FileInput, { props });

    await getByTestId("remove").click();

    expect(onremove).toHaveBeenCalledWith({ values: [a, b], removed: [a] });
    expect(props.files).toEqual([b]);
  });

  test("prop onremove commits when the removed file is returned", async () => {
    const a = mkFile("a.png", "image/png");
    const b = mkFile("b.png", "image/png");
    const onremove = vi.fn(() => [a]);
    const aux = createRawSnippet((files: () => File[], remove: () => (file: File) => void) => ({
      render: () => `<button type="button" data-testid="remove">${files().map((f) => f.name).join(",")}</button>`,
      setup: (node: Element) => {
        $effect(() => {
          node.textContent = files().map((f) => f.name).join(",");
          (node as HTMLButtonElement).onclick = () => {
            const file = files()[0];
            if (file) remove()(file);
          };
        });
      },
    }));
    const props = $state({ files: [a, b] as File[], multiple: true, events: { onremove }, children: zone, aux });
    const { getByTestId } = render(FileInput, { props });

    await getByTestId("remove").click();

    expect(onremove).toHaveBeenCalledWith({ values: [a, b], removed: [a] });
    expect(props.files).toEqual([b]);
  });

  test("prop and context onremove compose by intersection", async () => {
    const a = mkFile("a.png", "image/png");
    const b = mkFile("b.png", "image/png");
    const ownOnremove = vi.fn(() => []);
    const ctxOnremove = vi.fn(() => [a]);
    const aux = createRawSnippet((files: () => File[], remove: () => (file: File) => void) => ({
      render: () => `<button type="button" data-testid="remove">${files().map((f) => f.name).join(",")}</button>`,
      setup: (node: Element) => {
        $effect(() => {
          node.textContent = files().map((f) => f.name).join(",");
          (node as HTMLButtonElement).onclick = () => {
            const file = files()[0];
            if (file) remove()(file);
          };
        });
      },
    }));
    const state = $state({
      files: [a, b],
      variant: VARIANT.NEUTRAL,
      element: undefined as HTMLInputElement | undefined,
      ariaErrMsgId: undefined as string | undefined,
      styling: undefined as string | undefined,
      id: undefined as string | undefined,
      describedby: undefined as string | undefined,
    });
    const { getByTestId } = render(FileInputCtxProvider, {
      state,
      hooks: { events: { onremove: ctxOnremove } },
      input: { multiple: true, events: { onremove: ownOnremove }, children: zone, aux },
    });

    await getByTestId("remove").click();

    expect(ownOnremove).toHaveBeenCalledWith({ values: [a, b], removed: [a] });
    expect(ctxOnremove).toHaveBeenCalledWith({ values: [a, b], removed: [a] });
    expect(state.files).toEqual([a, b]);
  });
});

describe("_FileInput drop zone and a11y", () => {
  test("drag state is exposed and drop runs the add pipeline", async () => {
    const props = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true });
    const { container, getByTestId } = render(FileInputDragProbe, props);
    const label = container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireDrag(label, "dragenter");
    await tick();
    expect(label.getAttribute("data-dragover")).toBe("true");
    await expect.element(getByTestId("drag")).toHaveTextContent("true");

    await fireDrag(label, "dragleave");
    expect(label.hasAttribute("data-dragover")).toBe(false);

    await fireDrag(label, "dragover");
    await drop(label, [mkFile("good.png", "image/png"), mkFile("bad.txt", "text/plain")]);
    expect(label.hasAttribute("data-dragover")).toBe(false);
    expect(names(props.files)).toEqual(["good.png"]);
    expect(props.rejectBy).toEqual(["accept"]);
  });

  test("drag and drop are ignored when droppable is absent or false", async () => {
    const absent = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true, children: zone });
    const absentView = render(FileInput, absent);
    const absentLabel = absentView.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireDrag(absentLabel, "dragenter");
    await tick();
    expect(absentLabel.hasAttribute("data-dragover")).toBe(false);
    await drop(absentLabel, [mkFile("absent.png", "image/png")]);
    expect(absent.files).toEqual([]);
    expect(absent.rejectBy).toEqual([]);

    const explicit = $state({ files: [] as File[], rejectBy: [] as FileRejectReason[], accept: ".png", multiple: true, droppable: false, children: zone });
    const explicitView = render(FileInput, explicit);
    const explicitLabel = explicitView.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;

    await fireDrag(explicitLabel, "dragenter");
    await tick();
    expect(explicitLabel.hasAttribute("data-dragover")).toBe(false);
    await drop(explicitLabel, [mkFile("explicit.png", "image/png")]);
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

    await drop(label, [mkFile("a.png", "image/png")]);
    expect(props.files).toEqual([]);
    await label.click();
    await tick();
    expect(disabledClick).not.toHaveBeenCalled();

    const active = render(FileInput, { droppable: true, children: zone });
    await tick();
    const liveInput = active.container.querySelector("input") as HTMLInputElement;
    const liveMiddle = active.container.querySelector(`label.${PARTS.MIDDLE}`) as HTMLLabelElement;
    const click = vi.fn();
    liveInput.addEventListener("click", click);
    await liveMiddle.click();
    await tick();
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

    await fireDrag(label, "dragenter");
    await tick();
    await expect.element(getByTestId("variant")).toHaveTextContent(`0:true:${VARIANT.ACTIVE}`);
    expect([...label.classList]).toEqual(expect.arrayContaining([VARIANT.ACTIVE]));

    await fireDrag(label, "dragleave");
    await tick();
    await expect.element(getByTestId("variant")).toHaveTextContent(`0:false:${VARIANT.NEUTRAL}`);
    expect([...label.classList]).toEqual(expect.arrayContaining([VARIANT.NEUTRAL]));
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
    expect([...root.children]).toContain(auxEl);
    expect(label.contains(auxEl)).toBe(false);
    await getByTestId("remove").click();
    await tick();
    expect(props.files).toEqual([b]);
    expect(names([...(input.files ?? [])])).toEqual(["b.png"]);
  });

  test("flip controls aux and label DOM order", () => {
    const aux = createRawSnippet(() => ({ render: () => "<span>aux</span>" }));
    const normal = render(FileInput, { children: zone, aux });
    let items = [...(normal.container.firstElementChild as HTMLDivElement).children];
    expect([...items[0].classList]).toEqual(expect.arrayContaining([PARTS.MIDDLE]));
    expect([...items[1].classList]).toEqual(expect.arrayContaining([PARTS.AUX]));

    const flipped = render(FileInput, { children: zone, aux, flip: true });
    items = [...(flipped.container.firstElementChild as HTMLDivElement).children];
    expect([...items[0].classList]).toEqual(expect.arrayContaining([PARTS.AUX]));
    expect([...items[1].classList]).toEqual(expect.arrayContaining([PARTS.MIDDLE]));
  });

  test("standalone and context a11y attributes are wired", () => {
    const plain = render(FileInput, { "aria-describedby": "desc", "aria-invalid": "true", children: zone });
    const input = plain.container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-describedby")).toBe("desc");
    expect(input.getAttribute("aria-invalid")).toBe("true");

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
    expect(ctxInput.getAttribute("aria-describedby")).toBe("ctx-desc");
    expect(ctxInput.getAttribute("aria-invalid")).toBe("true");
    expect(ctxInput.getAttribute("aria-errormessage")).toBe("ctx-err");
  });

  test("syncing external files does not throw and input click resets value", async () => {
    const props = $state({ files: [] as File[], children: zone });
    const { container } = render(FileInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const file = mkFile("a.png", "image/png");
    props.files = [file];
    await tick();

    expect(props.files).toHaveLength(1);
    expect(input.files?.item(0)).toBe(file);
    await input.click();
    await tick();
    expect(input.value).toBe("");
  });
});
