import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import TagsInput from "#svs/TagsInput.svelte";
import TagsInputCtxProvider from "./fixtures/TagsInputCtxProvider.svelte";
import { PARTS, VARIANT, _fnClass } from "#svs/core";

const element = (target: Element | null | undefined) => expect.element(target as HTMLElement | null);
const byBtnName = (root: ParentNode, name: string | RegExp) =>
  [...root.querySelectorAll("button")].find((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    return typeof name === "string" ? label === name : name.test(label);
  }) as HTMLButtonElement;
const preset = "svs-tags-input";
const mainCls = (variant: string) => `${_fnClass(preset)(PARTS.MAIN, variant)}`.split(" ");
const paste = async (input: HTMLInputElement, text: string) => {
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  await tick();
};
const stateDefaults = () => ({
  values: [] as string[],
  value: "",
  variant: VARIANT.NEUTRAL,
  element: undefined as HTMLInputElement | undefined,
  ariaErrMsgId: undefined as string | undefined,
  styling: undefined as string | undefined,
  id: undefined as string | undefined,
  describedby: undefined as string | undefined,
});

describe("Basic rendering and structure", async () => {
  test("renders with no props", async () => {
    const { container } = render(TagsInput);
    const whole = container.querySelector(`.${preset}`);
    const input = container.querySelector("input") as HTMLInputElement;

    await element(whole).toBeInTheDocument();
    await element(input).toBeInTheDocument();
    await element(input).toHaveAttribute("type", "text");
    await element(input).toHaveValue("");
  });

  test("renders with initial values", async () => {
    const values = ["tag1", "tag2"];
    const { container } = render(TagsInput, { values });

    const badges = container.querySelectorAll(`.${preset}.${PARTS.LABEL}`);
    expect(badges).toHaveLength(2);
    await element(badges[0]).toHaveTextContent("tag1");
    await element(badges[1]).toHaveTextContent("tag2");
  });

  test("renders with initial value", async () => {
    const value = "test input";
    const { container } = render(TagsInput, { value });
    const input = container.querySelector("input") as HTMLInputElement;

    await element(input).toHaveValue(value);
  });

  test("renders tags on left by default", async () => {
    const values = ["tag1"];
    const { container } = render(TagsInput, { values });

    const whole = container.querySelector(`.${preset}`);
    const tagsSpan = whole?.querySelector(`.${preset}.aux`);
    const input = container.querySelector("input");

    await element(tagsSpan).toBeInTheDocument();
    expect(tagsSpan?.nextElementSibling).toBe(input);
  });

  test("renders tags on right when side='right'", async () => {
    const values = ["tag1"];
    const { container } = render(TagsInput, { values, side: "right" });

    const whole = container.querySelector(`.${preset}`);
    const tagsSpan = whole?.querySelector(`.${preset}.aux`);
    const input = container.querySelector("input");

    await element(tagsSpan).toBeInTheDocument();
    expect(input?.nextElementSibling).toBe(tagsSpan);
  });

  test("remove button is type='button'", async () => {
    const { container } = render(TagsInput, { values: ["tag1"] });
    const btn = container.querySelector(`.${preset}.${PARTS.EXTRA}`) as HTMLButtonElement;

    await element(btn).toHaveAttribute("type", "button");
  });

  test("remove button has default accessible name", async () => {
    const { container } = render(TagsInput, { values: ["tag1", "tag2"] });

    await element(byBtnName(container, "Remove tag1")).toBeInTheDocument();
    await element(byBtnName(container, "Remove tag2")).toBeInTheDocument();
  });

  test("remove button supports custom removeAriaLabel", async () => {
    const { container } = render(TagsInput, {
      values: ["x"],
      removeAriaLabel: (text: string) => `delete ${text}`,
    });

    await element(byBtnName(container, "delete x")).toBeInTheDocument();
  });

  test("default icon is decorative", async () => {
    const { container } = render(TagsInput, { values: ["tag1"] });
    const svg = container.querySelector("svg");

    await element(svg).toHaveAttribute("aria-hidden", "true");
    await element(svg).toHaveAttribute("focusable", "false");
  });

  test("label snippet renders custom per-tag content", async () => {
    const label = vi.fn().mockImplementation(
      createRawSnippet((text: () => string, variant: () => string) => {
        return { render: () => `<span data-testid="custom-label">${variant()}:${text()}</span>` };
      }),
    );
    const { container } = render(TagsInput, {
      values: ["tag1", "tag2"],
      label,
      variant: VARIANT.ACTIVE,
    });

    const labels = [...container.querySelectorAll(`[data-testid="${"custom-label"}"]`)];
    expect(labels).toHaveLength(2);
    await element(labels[0]).toHaveTextContent(`${VARIANT.ACTIVE}:tag1`);
    await element(labels[1]).toHaveTextContent(`${VARIANT.ACTIVE}:tag2`);
    expect(container.querySelectorAll(`.${preset}.${PARTS.LABEL}`)[0]).not.toHaveTextContent(/^tag1$/);
    expect(label).toHaveBeenCalledTimes(2);
  });

  test("extra snippet renders custom remove-button content", async () => {
    const extra = vi.fn().mockImplementation(
      createRawSnippet((text: () => string) => {
        return { render: () => `<span data-testid="custom-extra">custom ${text()}</span>` };
      }),
    );
    const props = $state({
      values: ["tag1"],
      extra,
      removeAriaLabel: (text: string) => `remove custom ${text}`,
    });
    const { container } = render(TagsInput, props);

    const button = byBtnName(container, "remove custom tag1");
    expect(container.querySelector("svg")).toBeNull();
    await element(container.querySelector(`[data-testid="${"custom-extra"}"]`) as HTMLElement).toHaveTextContent("custom tag1");

    await userEvent.click(button);

    expect(props.values).toEqual([]);
    expect(extra).toHaveBeenCalledTimes(1);
  });

  test("renders with attach", async () => {
    const attach = vi.fn().mockImplementation(() => ({}));
    const { container } = render(TagsInput, { attach });
    const input = container.querySelector("input");

    await element(input).toBeInTheDocument();
    expect(attach).toHaveBeenCalled();
  });
});

describe("Tag addition functionality", async () => {
  test("adds tag on Enter key", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;
    await userEvent.type(input, "new tag");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["new tag"]);
    expect(props.value).toBe("");
  });

  test("trims whitespace by default", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "  spaced tag  ");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["spaced tag"]);
  });

  test("onadd receives trimmed value", async () => {
    const onadd = vi.fn();
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "  spaced  ");
    await userEvent.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["spaced"] });
    expect(props.values).toEqual(["spaced"]);
  });

  test("onadd is not fired for whitespace-only input", async () => {
    const onadd = vi.fn();
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "   ");
    await userEvent.keyboard("{Enter}");

    expect(onadd).not.toHaveBeenCalled();
    expect(props.values).toEqual([]);
  });

  test("does not trim when trim=false", async () => {
    const props = $state({ values: [] as string[], value: "", trim: false });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "  spaced tag  ");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["  spaced tag  "]);
  });

  test("prevents duplicate tags by default without firing onadd", async () => {
    const onadd = vi.fn();
    const props = $state({ values: ["existing"], value: "", events: { onadd } });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "existing");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["existing"]);
    expect(props.value).toBe("");
    expect(onadd).not.toHaveBeenCalled();
  });

  test("allows duplicate tags when unique=false", async () => {
    const props = $state({ values: ["existing"], value: "", unique: false });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "existing");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["existing", "existing"]);
  });

  test("does not add empty tag", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.focus();

    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual([]);
  });

  test("does not add tag while composing", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true }));
    await tick();

    expect(props.values).toEqual([]);
  });

  test("live commit on separator keystroke", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "a,");

    expect(props.values).toEqual(["a"]);
    expect(props.value).toBe("");
    await element(input).toHaveValue("");
  });

  test("live commit keeps trailing partial", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "a,b");

    expect(props.values).toEqual(["a"]);
    expect(props.value).toBe("b");
    await element(input).toHaveValue("b");
  });

  test("multiple separators in one typed burst", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    input.value = "a,b,";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertText", bubbles: true }));
    await tick();

    expect(props.values).toEqual(["a", "b"]);
    expect(props.value).toBe("");
    await element(input).toHaveValue("");
  });

  test("custom single-char separator", async () => {
    const props = $state({ values: [] as string[], value: "", separator: ";" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "a,");

    expect(props.values).toEqual([]);
    expect(props.value).toBe("a,");

    await userEvent.type(input, ";");

    expect(props.values).toEqual(["a,"]);
    expect(props.value).toBe("");
  });

  test("empty separator disables splitting", async () => {
    const props = $state({ values: [] as string[], value: "", separator: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "a,b");
    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["a,b"]);
    expect(props.value).toBe("");
  });

  test("does not commit live input while composing", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.value = "a,";

    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", isComposing: true }));
    await tick();

    expect(props.values).toEqual([]);
  });

  test("Enter splits current box on separators", async () => {
    const props = $state({ values: [] as string[], value: "x,y,z" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.focus();

    await userEvent.keyboard("{Enter}");

    expect(props.values).toEqual(["x", "y", "z"]);
    expect(props.value).toBe("");
  });

  test("paste splits into multiple tags", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await paste(input, "a,b,c");

    expect(props.values).toEqual(["a", "b", "c"]);
    expect(props.value).toBe("");
  });

  test("paste merges with existing box content", async () => {
    const props = $state({ values: [] as string[], value: "AAA" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.setSelectionRange(3, 3);

    await paste(input, "B,C,D");

    expect(props.values).toEqual(["AAAB", "C", "D"]);
    expect(props.value).toBe("");
  });

  test("paste over a full selection overwrites", async () => {
    const props = $state({ values: [] as string[], value: "AAA" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.setSelectionRange(0, 3);

    await paste(input, "B,C,D");

    expect(props.values).toEqual(["B", "C", "D"]);
    expect(props.value).toBe("");
  });

  test("paste on newline-delimited text", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "x\ny\nz");

    expect(props.values).toEqual(["x", "y", "z"]);
  });

  test("Windows CRLF + trim default strips carriage returns", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "x\r\ny\r\nz");

    expect(props.values).toEqual(["x", "y", "z"]);
  });

  test("Windows CRLF + trim=false keeps carriage returns", async () => {
    const props = $state({ values: [] as string[], value: "", trim: false });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "x\r\ny");

    expect(props.values).toEqual(["x\r", "y"]);
  });

  test("paste without separator is native", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "single");

    expect(props.values).toEqual([]);
  });

  test("paste:false leaves delimited text un-split", async () => {
    const props = $state({ values: [] as string[], value: "", paste: false });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(props.values).toEqual([]);
  });

  test("user onpaste runs first and can cancel", async () => {
    const onpaste = vi.fn((ev: ClipboardEvent) => ev.preventDefault());
    const props = $state({ values: [] as string[], value: "", onpaste });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(onpaste).toHaveBeenCalledTimes(1);
    expect(props.values).toEqual([]);
  });

  test("trim applies per segment", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, " a , b ");

    expect(props.values).toEqual(["a", "b"]);
  });

  test("unique dedupes within a paste batch", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,a,b");

    expect(props.values).toEqual(["a", "b"]);
  });

  test("unique drops already-existing values in batch", async () => {
    const props = $state({ values: ["a"], value: "" });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,b,c");

    expect(props.values).toEqual(["a", "b", "c"]);
  });

  test("unique=false keeps duplicates", async () => {
    const props = $state({ values: [] as string[], value: "", unique: false });
    const { container } = render(TagsInput, props);

    await paste(container.querySelector("input") as HTMLInputElement, "a,a");

    expect(props.values).toEqual(["a", "a"]);
  });

  test("onadd fires once with the full batch", async () => {
    const onadd = vi.fn();
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { container } = render(TagsInput, { props });

    await paste(container.querySelector("input") as HTMLInputElement, "a,b,c");

    expect(onadd).toHaveBeenCalledTimes(1);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["a", "b", "c"] });
  });

  test("onadd veto of subset commits only the kept", async () => {
    const onadd = vi.fn().mockReturnValue(["a", "c"]);
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { container } = render(TagsInput, { props });

    await paste(container.querySelector("input") as HTMLInputElement, "a,b,c");

    expect(props.values).toEqual(["a", "c"]);
  });

  test("onadd returns [] cancels the whole batch", async () => {
    const onadd = vi.fn().mockReturnValue([]);
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { container } = render(TagsInput, { props });

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(props.values).toEqual([]);
  });

  test("onadd not fired for empty post-filter batch", async () => {
    const onadd = vi.fn();
    const props = $state({ values: ["a"], value: "", unique: true, events: { onadd } });
    const { container } = render(TagsInput, { props });

    await paste(container.querySelector("input") as HTMLInputElement, "a,a");

    expect(onadd).not.toHaveBeenCalled();
    expect(props.values).toEqual(["a"]);
  });
});

describe("Tag removal functionality", async () => {
  test("removes tag when tag's button is clicked", async () => {
    const props = $state({ values: ["tag1", "tag2", "tag3"] });
    const { container } = render(TagsInput, props);

    const badges = [...container.querySelectorAll("button")] as HTMLButtonElement[];
    await userEvent.click(badges[1]); // Click second tag

    expect(props.values).toEqual(["tag1", "tag3"]);
  });

  test("removes first tag", async () => {
    const props = $state({ values: ["tag1", "tag2"] });
    const { container } = render(TagsInput, props);

    const badges = [...container.querySelectorAll("button")] as HTMLButtonElement[];
    await userEvent.click(badges[0]);

    expect(props.values).toEqual(["tag2"]);
  });

  test("removes last tag", async () => {
    const props = $state({ values: ["tag1", "tag2"] });
    const { container } = render(TagsInput, props);

    const badges = [...container.querySelectorAll("button")] as HTMLButtonElement[];
    await userEvent.click(badges[1]);

    expect(props.values).toEqual(["tag1"]);
  });
});

describe("Event handlers", async () => {
  test("calls onadd event handler and commits when it returns undefined", async () => {
    const onadd = vi.fn();
    const onremove = vi.fn();
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd, onremove },
    });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "new tag");
    await userEvent.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["new tag"] });
    expect(props.values).toEqual(["new tag"]);
  });

  test("cancels tag addition when onadd returns []", async () => {
    const onadd = vi.fn().mockReturnValue([]);
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "new tag");
    await userEvent.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["new tag"] });
    expect(props.values).toEqual([]);
    expect(props.value).toBe("");
    await element(input).toHaveValue("");
  });

  test("commits tag addition when onadd returns the added value", async () => {
    const onadd = vi.fn().mockReturnValue(["new tag"]);
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "new tag");
    await userEvent.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["new tag"] });
    expect(props.values).toEqual(["new tag"]);
    expect(props.value).toBe("");
  });

  test("calls onremove event handler", async () => {
    const onremove = vi.fn();
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await userEvent.click(badges[0]);

    await tick();
    expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
    expect(props.values).toEqual(["tag2"]);
  });

  test("cancels tag removal when onremove returns []", async () => {
    const onremove = vi.fn().mockReturnValue([]);
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await userEvent.click(badges[0]);

    await tick();
    expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
    expect(props.values).toEqual(["tag1", "tag2"]);
  });

  test("removes tag when onremove returns the removed value", async () => {
    const onremove = vi.fn().mockReturnValue(["tag1"]);
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await userEvent.click(badges[0]);

    await tick();
    expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
    expect(props.values).toEqual(["tag2"]);
  });
});

describe("Attributes and styling", async () => {
  test("applies custom attributes to input", async () => {
    const { container } = render(TagsInput, {
      placeholder: "Enter tags...",
      "data-testid": "tags-input",
      name: "tags",
    });
    const input = container.querySelector("input") as HTMLInputElement;

    await element(input).toHaveAttribute("placeholder", "Enter tags...");
    await element(input).toHaveAttribute("data-testid", "tags-input");
    await element(input).toHaveAttribute("name", "tags");
  });

  test("class merged onto control, input type forced to text", async () => {
    const { container } = render(TagsInput, { class: "custom-class" });
    const root = container.querySelector("div") as HTMLDivElement;
    const input = container.querySelector("input") as HTMLInputElement;

    await element(input).toHaveClass("custom-class"); // merged onto the control (same as ...rest)
    expect(root).not.toHaveClass("custom-class"); // not on the WHOLE root
    await element(input).toHaveAttribute("type", "text");
  });

  test("calls original onkeydown handler", async () => {
    const onkeydown = vi.fn();
    const { container } = render(TagsInput, { onkeydown });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "test");
    await userEvent.keyboard("{Enter}");

    expect(onkeydown).toHaveBeenCalled();
  });

  test("applies default CSS classes", async () => {
    const values = ["tag1"];
    const variant = VARIANT.ACTIVE;
    const { container } = render(TagsInput, { values, variant });

    const whole = container.querySelector(`.${preset}`);
    const input = container.querySelector("input");
    const tagsSpan = container.querySelector(`.${preset}.aux`);

    await element(whole).toHaveClass(preset, PARTS.WHOLE, variant);
    await element(input).toHaveClass(preset, PARTS.MAIN, variant);
    await element(tagsSpan).toHaveClass(preset, PARTS.AUX, variant);
  });

  test("applies string styling", async () => {
    const styling = "custom-styling";
    const variant = VARIANT.NEUTRAL;
    const { container } = render(TagsInput, { styling, variant });

    const whole = container.querySelector(".custom-styling");
    const input = container.querySelector("input");

    await element(whole).toHaveClass("custom-styling", PARTS.WHOLE, variant);
    await element(input).toHaveClass("custom-styling", PARTS.MAIN, variant);
  });
});

describe("Status and state management", async () => {
  test("initializes with neutral variant by default", async () => {
    const { container } = render(TagsInput, { variant: VARIANT.NEUTRAL });
    const whole = container.querySelector(`.${preset}`);

    await element(whole).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("maintains provided variant", async () => {
    const variant = VARIANT.ACTIVE;
    const { container } = render(TagsInput, { variant });
    const whole = container.querySelector(`.${preset}`);

    await element(whole).toHaveClass(preset, PARTS.WHOLE, variant);
  });

  test("binds element reference", async () => {
    const props = $state({ element: undefined as HTMLInputElement | undefined });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.element).toBe(input);
  });

  test("binds ariaErrMsgId", async () => {
    const props = $state({ ariaErrMsgId: "eid" });
    const { container } = render(TagsInput, props);

    const input = container.querySelector("input") as HTMLInputElement;
    await element(input).toHaveAttribute("aria-errormessage", "eid");
    await element(input).toHaveAttribute("aria-invalid", "true");
  });

  test("explicit aria-invalid=false overrides ariaErrMsgId-derived default", async () => {
    const { container } = render(TagsInput, {
      "aria-invalid": false,
      ariaErrMsgId: "eid",
    });

    const input = container.querySelector("input") as HTMLInputElement;
    await element(input).toHaveAttribute("aria-errormessage", "eid");
    await element(input).toHaveAttribute("aria-invalid", "false");
  });

  test("explicit aria-invalid=true is preserved without ariaErrMsgId", async () => {
    const { container } = render(TagsInput, { "aria-invalid": true });

    await element(container.querySelector("input") as HTMLInputElement).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Embedded in field context", async () => {
  test("variant comes from context", async () => {
    const state = $state({ ...stateDefaults(), variant: VARIANT.ACTIVE });
    const { container } = render(TagsInputCtxProvider, { state });

    await element(container.querySelector("input") as HTMLInputElement).toHaveClass(...mainCls(VARIANT.ACTIVE));
  });

  test("own variant prop is ignored when embedded", async () => {
    const state = $state({ ...stateDefaults(), variant: VARIANT.ACTIVE });
    const { container } = render(TagsInputCtxProvider, { state, input: { variant: VARIANT.INACTIVE } });

    await element(container.querySelector("input") as HTMLInputElement).toHaveClass(...mainCls(VARIANT.ACTIVE));
    expect(container.querySelector("input") as HTMLInputElement).not.toHaveClass(VARIANT.INACTIVE);
  });

  test("add writes to context values", async () => {
    const state = $state(stateDefaults());
    const { container } = render(TagsInputCtxProvider, { state });
    const input = container.querySelector("input") as HTMLInputElement;

    await userEvent.type(input, "tag1");
    await userEvent.keyboard("{Enter}");

    expect(state.values).toEqual(["tag1"]);
    expect(state.value).toBe("");
    await element(input).toHaveValue("");
  });

  test("remove writes to context values", async () => {
    const state = $state({ ...stateDefaults(), values: ["a", "b"] });
    const { container } = render(TagsInputCtxProvider, { state });

    await userEvent.click(byBtnName(container, "Remove a"));

    expect(state.values).toEqual(["b"]);
  });

  test("element is mirrored into context", async () => {
    const state = $state(stateDefaults());
    const { container } = render(TagsInputCtxProvider, { state });
    const input = container.querySelector("input") as HTMLInputElement;

    await tick();
    expect(state.element).toBe(input);
  });

  test("ariaErrMsgId and aria-invalid come from context", async () => {
    const state = $state({ ...stateDefaults(), ariaErrMsgId: "err-1" });
    const { container } = render(TagsInputCtxProvider, { state });
    const input = container.querySelector("input") as HTMLInputElement;

    await element(input).toHaveAttribute("aria-errormessage", "err-1");
    await element(input).toHaveAttribute("aria-invalid", "true");
  });

  test("id and aria-describedby come from context", async () => {
    const state = $state({ ...stateDefaults(), id: "ctrl-1", describedby: "desc-1" });
    const { container } = render(TagsInputCtxProvider, {
      state,
      input: { id: "own-id", "aria-describedby": "own-desc" },
    });
    const input = container.querySelector("input") as HTMLInputElement;

    await element(input).toHaveAttribute("id", "ctrl-1");
    await element(input).toHaveAttribute("aria-describedby", "desc-1");
  });

  test("onadd composition runs user hook before field hook", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn();
    const fieldOnadd = vi.fn();
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await userEvent.type(container.querySelector("input") as HTMLInputElement, "tag1");
    await userEvent.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["tag1"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["tag1"] });
    expect(userOnadd.mock.invocationCallOrder[0]).toBeLessThan(fieldOnadd.mock.invocationCallOrder[0]);
    expect(state.values).toEqual(["tag1"]);
  });

  test("paste writes a batch to context values", async () => {
    const state = $state(stateDefaults());
    const { container } = render(TagsInputCtxProvider, { state });

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(state.values).toEqual(["a", "b"]);
    expect(state.value).toBe("");
  });

  test("batch onadd composes user then field hook once", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn();
    const fieldOnadd = vi.fn();
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await paste(container.querySelector("input") as HTMLInputElement, "a,b");

    expect(userOnadd).toHaveBeenCalledTimes(1);
    expect(fieldOnadd).toHaveBeenCalledTimes(1);
    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["a", "b"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["a", "b"] });
    expect(userOnadd.mock.invocationCallOrder[0]).toBeLessThan(fieldOnadd.mock.invocationCallOrder[0]);
    expect(state.values).toEqual(["a", "b"]);
  });

  test("onadd intersection lets field hook block after user hook allows", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn(() => ["blocked"]);
    const fieldOnadd = vi.fn(() => []);
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await userEvent.type(container.querySelector("input") as HTMLInputElement, "blocked");
    await userEvent.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(state.values).toEqual([]);
  });

  test("onadd intersection lets user hook block even when field hook allows", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn(() => []);
    const fieldOnadd = vi.fn(() => ["blocked"]);
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await userEvent.type(container.querySelector("input") as HTMLInputElement, "blocked");
    await userEvent.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(state.values).toEqual([]);
  });

  test("onchange composition", async () => {
    const state = $state(stateDefaults());
    const userOnchange = vi.fn();
    const fieldOnchange = vi.fn();
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { onchange: fieldOnchange },
      input: { onchange: userOnchange },
    });

    const input = container.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();

    expect(userOnchange).toHaveBeenCalledTimes(1);
    expect(fieldOnchange).toHaveBeenCalledTimes(1);
    expect(userOnchange.mock.invocationCallOrder[0]).toBeLessThan(fieldOnchange.mock.invocationCallOrder[0]);
  });

  test("oninvalid composition", async () => {
    const state = $state(stateDefaults());
    const userOninvalid = vi.fn();
    const fieldOninvalid = vi.fn();
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { oninvalid: fieldOninvalid },
      input: { oninvalid: userOninvalid },
    });

    const input = container.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("invalid", { cancelable: true }));
    await tick();

    expect(userOninvalid).toHaveBeenCalledTimes(1);
    expect(fieldOninvalid).toHaveBeenCalledTimes(1);
    expect(userOninvalid.mock.invocationCallOrder[0]).toBeLessThan(fieldOninvalid.mock.invocationCallOrder[0]);
  });

  test("styling falls back to ctx default unless caller provides styling", async () => {
    const state = $state({ ...stateDefaults(), styling: "ctx-style" });
    const { container, rerender } = render(TagsInputCtxProvider, { state });

    await element(container.querySelector(".ctx-style")).toHaveClass("ctx-style", PARTS.WHOLE);
    await element(container.querySelector("input")).toHaveClass("ctx-style", PARTS.MAIN);

    await rerender({ state, input: { styling: "own-style" } });

    await element(container.querySelector(".own-style")).toHaveClass("own-style", PARTS.WHOLE);
    await element(container.querySelector("input")).toHaveClass("own-style", PARTS.MAIN);
  });

  test("onremove local hook composes with context through intersection", async () => {
    const state = $state({ ...stateDefaults(), values: ["a", "b"] });
    const onremove = vi.fn(() => []);
    const fieldOnremove = vi.fn(() => ["a"]);
    const { container } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onremove: fieldOnremove } },
      input: { events: { onremove } },
    });

    await userEvent.click(byBtnName(container, "Remove a"));

    expect(onremove).toHaveBeenCalledWith({ values: ["a", "b"], removed: ["a"] });
    expect(fieldOnremove).toHaveBeenCalledWith({ values: ["a", "b"], removed: ["a"] });
    expect(state.values).toEqual(["a", "b"]);
  });
});
