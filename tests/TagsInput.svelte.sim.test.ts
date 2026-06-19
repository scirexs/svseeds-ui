import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import TagsInput from "#svs/TagsInput.svelte";
import TagsInputCtxProvider from "./fixtures/TagsInputCtxProvider.svelte";
import { PARTS, VARIANT, _fnClass } from "#svs/core";

const preset = "svs-tags-input";
const mainCls = (variant: string) => `${_fnClass(preset)(PARTS.MAIN, variant)}`.split(" ");
const paste = (input: HTMLInputElement, text: string) => fireEvent.paste(input, { clipboardData: { getData: () => text } });
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

describe("Basic rendering and structure", () => {
  test("renders with no props", () => {
    const { container } = render(TagsInput);
    const whole = container.querySelector(`.${preset}`);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(whole).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("");
  });

  test("renders with initial values", () => {
    const values = ["tag1", "tag2"];
    const { container } = render(TagsInput, { values });

    const badges = container.querySelectorAll(`.${preset}.${PARTS.LABEL}`);
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent("tag1");
    expect(badges[1]).toHaveTextContent("tag2");
  });

  test("renders with initial value", () => {
    const value = "test input";
    const { getByRole } = render(TagsInput, { value });
    const input = getByRole("textbox") as HTMLInputElement;

    expect(input).toHaveValue(value);
  });

  test("renders tags on left by default", () => {
    const values = ["tag1"];
    const { container } = render(TagsInput, { values });

    const whole = container.querySelector(`.${preset}`);
    const tagsSpan = whole?.querySelector(`.${preset}.aux`);
    const input = container.querySelector("input");

    expect(tagsSpan).toBeInTheDocument();
    expect(tagsSpan?.nextElementSibling).toBe(input);
  });

  test("renders tags on right when side='right'", () => {
    const values = ["tag1"];
    const { container } = render(TagsInput, { values, side: "right" });

    const whole = container.querySelector(`.${preset}`);
    const tagsSpan = whole?.querySelector(`.${preset}.aux`);
    const input = container.querySelector("input");

    expect(tagsSpan).toBeInTheDocument();
    expect(input?.nextElementSibling).toBe(tagsSpan);
  });

  test("remove button is type='button'", () => {
    const { container } = render(TagsInput, { values: ["tag1"] });
    const btn = container.querySelector(`.${preset}.${PARTS.EXTRA}`) as HTMLButtonElement;

    expect(btn).toHaveAttribute("type", "button");
  });

  test("remove button has default accessible name", () => {
    const { getByRole } = render(TagsInput, { values: ["tag1", "tag2"] });

    expect(getByRole("button", { name: "Remove tag1" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Remove tag2" })).toBeInTheDocument();
  });

  test("remove button supports custom removeAriaLabel", () => {
    const { getByRole } = render(TagsInput, {
      values: ["x"],
      removeAriaLabel: (text: string) => `delete ${text}`,
    });

    expect(getByRole("button", { name: "delete x" })).toBeInTheDocument();
  });

  test("default icon is decorative", () => {
    const { container } = render(TagsInput, { values: ["tag1"] });
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  test("label snippet renders custom per-tag content", () => {
    const label = vi.fn().mockImplementation(
      createRawSnippet((text: () => string, variant: () => string) => {
        return { render: () => `<span data-testid="custom-label">${variant()}:${text()}</span>` };
      }),
    );
    const { container, getAllByTestId } = render(TagsInput, {
      values: ["tag1", "tag2"],
      label,
      variant: VARIANT.ACTIVE,
    });

    const labels = getAllByTestId("custom-label");
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveTextContent(`${VARIANT.ACTIVE}:tag1`);
    expect(labels[1]).toHaveTextContent(`${VARIANT.ACTIVE}:tag2`);
    expect(container.querySelectorAll(`.${preset}.${PARTS.LABEL}`)[0]).not.toHaveTextContent(/^tag1$/);
    expect(label).toHaveBeenCalledTimes(2);
  });

  test("extra snippet renders custom remove-button content", async () => {
    const user = userEvent.setup();
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
    const { container, getByRole, getByTestId } = render(TagsInput, props);

    const button = getByRole("button", { name: "remove custom tag1" });
    expect(container.querySelector("svg")).toBeNull();
    expect(getByTestId("custom-extra")).toHaveTextContent("custom tag1");

    await user.click(button);

    expect(props.values).toEqual([]);
    expect(extra).toHaveBeenCalledTimes(1);
  });

  test("renders with attach", () => {
    const attach = vi.fn().mockImplementation(() => ({}));
    const { container } = render(TagsInput, { attach });
    const input = container.querySelector("input");

    expect(input).toBeInTheDocument();
    expect(attach).toHaveBeenCalled();
  });
});

describe("Tag addition functionality", () => {
  test("adds tag on Enter key", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;
    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["new tag"]);
    expect(props.value).toBe("");
  });

  test("trims whitespace by default", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "  spaced tag  ");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["spaced tag"]);
  });

  test("onadd receives trimmed value", async () => {
    const onadd = vi.fn();
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "  spaced  ");
    await user.keyboard("{Enter}");

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
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    expect(onadd).not.toHaveBeenCalled();
    expect(props.values).toEqual([]);
  });

  test("does not trim when trim=false", async () => {
    const props = $state({ values: [] as string[], value: "", trim: false });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "  spaced tag  ");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["  spaced tag  "]);
  });

  test("prevents duplicate tags by default without firing onadd", async () => {
    const onadd = vi.fn();
    const props = $state({ values: ["existing"], value: "", events: { onadd } });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "existing");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["existing"]);
    expect(props.value).toBe("");
    expect(onadd).not.toHaveBeenCalled();
  });

  test("allows duplicate tags when unique=false", async () => {
    const props = $state({ values: ["existing"], value: "", unique: false });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "existing");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["existing", "existing"]);
  });

  test("does not add empty tag", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;
    input.focus();

    await user.keyboard("{Enter}");

    expect(props.values).toEqual([]);
  });

  test("does not add tag while composing", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await fireEvent.keyDown(input, {
      key: "Enter",
      isComposing: true,
    });

    expect(props.values).toEqual([]);
  });

  test("live commit on separator keystroke", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "a,");

    expect(props.values).toEqual(["a"]);
    expect(props.value).toBe("");
    expect(input).toHaveValue("");
  });

  test("live commit keeps trailing partial", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "a,b");

    expect(props.values).toEqual(["a"]);
    expect(props.value).toBe("b");
    expect(input).toHaveValue("b");
  });

  test("multiple separators in one typed burst", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await fireEvent.input(input, { target: { value: "a,b," }, inputType: "insertText" });

    expect(props.values).toEqual(["a", "b"]);
    expect(props.value).toBe("");
    expect(input).toHaveValue("");
  });

  test("custom single-char separator", async () => {
    const props = $state({ values: [] as string[], value: "", separator: ";" });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "a,");

    expect(props.values).toEqual([]);
    expect(props.value).toBe("a,");

    await user.type(input, ";");

    expect(props.values).toEqual(["a,"]);
    expect(props.value).toBe("");
  });

  test("empty separator disables splitting", async () => {
    const props = $state({ values: [] as string[], value: "", separator: "" });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "a,b");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["a,b"]);
    expect(props.value).toBe("");
  });

  test("does not commit live input while composing", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;
    input.value = "a,";

    await fireEvent(input, new InputEvent("input", { bubbles: true, inputType: "insertText", isComposing: true }));

    expect(props.values).toEqual([]);
  });

  test("Enter splits current box on separators", async () => {
    const props = $state({ values: [] as string[], value: "x,y,z" });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;
    input.focus();

    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["x", "y", "z"]);
    expect(props.value).toBe("");
  });

  test("paste splits into multiple tags", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;

    await paste(input, "a,b,c");

    expect(props.values).toEqual(["a", "b", "c"]);
    expect(props.value).toBe("");
  });

  test("paste merges with existing box content", async () => {
    const props = $state({ values: [] as string[], value: "AAA" });
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;
    input.setSelectionRange(3, 3);

    await paste(input, "B,C,D");

    expect(props.values).toEqual(["AAAB", "C", "D"]);
    expect(props.value).toBe("");
  });

  test("paste over a full selection overwrites", async () => {
    const props = $state({ values: [] as string[], value: "AAA" });
    const { getByRole } = render(TagsInput, props);
    const input = getByRole("textbox") as HTMLInputElement;
    input.setSelectionRange(0, 3);

    await paste(input, "B,C,D");

    expect(props.values).toEqual(["B", "C", "D"]);
    expect(props.value).toBe("");
  });

  test("paste on newline-delimited text", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "x\ny\nz");

    expect(props.values).toEqual(["x", "y", "z"]);
  });

  test("Windows CRLF + trim default strips carriage returns", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "x\r\ny\r\nz");

    expect(props.values).toEqual(["x", "y", "z"]);
  });

  test("Windows CRLF + trim=false keeps carriage returns", async () => {
    const props = $state({ values: [] as string[], value: "", trim: false });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "x\r\ny");

    expect(props.values).toEqual(["x\r", "y"]);
  });

  test("paste without separator is native", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "single");

    expect(props.values).toEqual([]);
  });

  test("paste:false leaves delimited text un-split", async () => {
    const props = $state({ values: [] as string[], value: "", paste: false });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "a,b");

    expect(props.values).toEqual([]);
  });

  test("user onpaste runs first and can cancel", async () => {
    const onpaste = vi.fn((ev: ClipboardEvent) => ev.preventDefault());
    const props = $state({ values: [] as string[], value: "", onpaste });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "a,b");

    expect(onpaste).toHaveBeenCalledTimes(1);
    expect(props.values).toEqual([]);
  });

  test("trim applies per segment", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, " a , b ");

    expect(props.values).toEqual(["a", "b"]);
  });

  test("unique dedupes within a paste batch", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "a,a,b");

    expect(props.values).toEqual(["a", "b"]);
  });

  test("unique drops already-existing values in batch", async () => {
    const props = $state({ values: ["a"], value: "" });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "a,b,c");

    expect(props.values).toEqual(["a", "b", "c"]);
  });

  test("unique=false keeps duplicates", async () => {
    const props = $state({ values: [] as string[], value: "", unique: false });
    const { getByRole } = render(TagsInput, props);

    await paste(getByRole("textbox") as HTMLInputElement, "a,a");

    expect(props.values).toEqual(["a", "a"]);
  });

  test("onadd fires once with the full batch", async () => {
    const onadd = vi.fn();
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { getByRole } = render(TagsInput, { props });

    await paste(getByRole("textbox") as HTMLInputElement, "a,b,c");

    expect(onadd).toHaveBeenCalledTimes(1);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["a", "b", "c"] });
  });

  test("onadd veto of subset commits only the kept", async () => {
    const onadd = vi.fn().mockReturnValue(["a", "c"]);
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { getByRole } = render(TagsInput, { props });

    await paste(getByRole("textbox") as HTMLInputElement, "a,b,c");

    expect(props.values).toEqual(["a", "c"]);
  });

  test("onadd returns [] cancels the whole batch", async () => {
    const onadd = vi.fn().mockReturnValue([]);
    const props = $state({ values: [] as string[], value: "", events: { onadd } });
    const { getByRole } = render(TagsInput, { props });

    await paste(getByRole("textbox") as HTMLInputElement, "a,b");

    expect(props.values).toEqual([]);
  });

  test("onadd not fired for empty post-filter batch", async () => {
    const onadd = vi.fn();
    const props = $state({ values: ["a"], value: "", unique: true, events: { onadd } });
    const { getByRole } = render(TagsInput, { props });

    await paste(getByRole("textbox") as HTMLInputElement, "a,a");

    expect(onadd).not.toHaveBeenCalled();
    expect(props.values).toEqual(["a"]);
  });
});

describe("Tag removal functionality", () => {
  test("removes tag when tag's button is clicked", async () => {
    const props = $state({ values: ["tag1", "tag2", "tag3"] });
    const user = userEvent.setup();
    const { getAllByRole } = render(TagsInput, props);

    const badges = getAllByRole("button");
    await user.click(badges[1]); // Click second tag

    expect(props.values).toEqual(["tag1", "tag3"]);
  });

  test("removes first tag", async () => {
    const props = $state({ values: ["tag1", "tag2"] });
    const user = userEvent.setup();
    const { getAllByRole } = render(TagsInput, props);

    const badges = getAllByRole("button");
    await user.click(badges[0]);

    expect(props.values).toEqual(["tag2"]);
  });

  test("removes last tag", async () => {
    const props = $state({ values: ["tag1", "tag2"] });
    const user = userEvent.setup();
    const { getAllByRole } = render(TagsInput, props);

    const badges = getAllByRole("button");
    await user.click(badges[1]);

    expect(props.values).toEqual(["tag1"]);
  });
});

describe("Event handlers", () => {
  test("calls onadd event handler and commits when it returns undefined", async () => {
    const onadd = vi.fn();
    const onremove = vi.fn();
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd, onremove },
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, { props });
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

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
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, { props });
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["new tag"] });
    expect(props.values).toEqual([]);
    expect(props.value).toBe("");
    expect(input).toHaveValue("");
  });

  test("commits tag addition when onadd returns the added value", async () => {
    const onadd = vi.fn().mockReturnValue(["new tag"]);
    const props = $state({
      values: [] as string[],
      value: "",
      events: { onadd },
    });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInput, { props });
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

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
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await user.click(badges[0]);

    await waitFor(() => {
      expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
      expect(props.values).toEqual(["tag2"]);
    });
  });

  test("cancels tag removal when onremove returns []", async () => {
    const onremove = vi.fn().mockReturnValue([]);
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await user.click(badges[0]);

    await waitFor(() => {
      expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
      expect(props.values).toEqual(["tag1", "tag2"]);
    });
  });

  test("removes tag when onremove returns the removed value", async () => {
    const onremove = vi.fn().mockReturnValue(["tag1"]);
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".svs-tags-input.extra");
    await user.click(badges[0]);

    await waitFor(() => {
      expect(onremove).toHaveBeenCalledWith({ values: ["tag1", "tag2"], removed: ["tag1"] });
      expect(props.values).toEqual(["tag2"]);
    });
  });
});

describe("Attributes and styling", () => {
  test("applies custom attributes to input", () => {
    const { container } = render(TagsInput, {
      placeholder: "Enter tags...",
      "data-testid": "tags-input",
      name: "tags",
    });
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveAttribute("placeholder", "Enter tags...");
    expect(input).toHaveAttribute("data-testid", "tags-input");
    expect(input).toHaveAttribute("name", "tags");
  });

  test("class merged onto control, input type forced to text", () => {
    const { container } = render(TagsInput, { class: "custom-class" });
    const root = container.querySelector("div") as HTMLDivElement;
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveClass("custom-class"); // merged onto the control (same as ...rest)
    expect(root).not.toHaveClass("custom-class"); // not on the WHOLE root
    expect(input).toHaveAttribute("type", "text");
  });

  test("calls original onkeydown handler", async () => {
    const onkeydown = vi.fn();
    const user = userEvent.setup();
    const { container } = render(TagsInput, { onkeydown });
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "test");
    await user.keyboard("{Enter}");

    expect(onkeydown).toHaveBeenCalled();
  });

  test("applies default CSS classes", () => {
    const values = ["tag1"];
    const variant = VARIANT.ACTIVE;
    const { container } = render(TagsInput, { values, variant });

    const whole = container.querySelector(`.${preset}`);
    const input = container.querySelector("input");
    const tagsSpan = container.querySelector(`.${preset}.aux`);

    expect(whole).toHaveClass(preset, PARTS.WHOLE, variant);
    expect(input).toHaveClass(preset, PARTS.MAIN, variant);
    expect(tagsSpan).toHaveClass(preset, PARTS.AUX, variant);
  });

  test("applies string styling", () => {
    const styling = "custom-styling";
    const variant = VARIANT.NEUTRAL;
    const { container } = render(TagsInput, { styling, variant });

    const whole = container.querySelector(".custom-styling");
    const input = container.querySelector("input");

    expect(whole).toHaveClass("custom-styling", PARTS.WHOLE, variant);
    expect(input).toHaveClass("custom-styling", PARTS.MAIN, variant);
  });
});

describe("Status and state management", () => {
  test("initializes with neutral variant by default", () => {
    const { container } = render(TagsInput, { variant: VARIANT.NEUTRAL });
    const whole = container.querySelector(`.${preset}`);

    expect(whole).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("maintains provided variant", () => {
    const variant = VARIANT.ACTIVE;
    const { container } = render(TagsInput, { variant });
    const whole = container.querySelector(`.${preset}`);

    expect(whole).toHaveClass(preset, PARTS.WHOLE, variant);
  });

  test("binds element reference", () => {
    const props = $state({ element: undefined as HTMLInputElement | undefined });
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.element).toBe(input);
  });

  test("binds ariaErrMsgId", () => {
    const props = $state({ ariaErrMsgId: "eid" });
    const { getByRole } = render(TagsInput, props);

    const input = getByRole("textbox");
    expect(input).toHaveAttribute("aria-errormessage", "eid");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  test("explicit aria-invalid=false overrides ariaErrMsgId-derived default", () => {
    const { getByRole } = render(TagsInput, {
      "aria-invalid": false,
      ariaErrMsgId: "eid",
    });

    const input = getByRole("textbox");
    expect(input).toHaveAttribute("aria-errormessage", "eid");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  test("explicit aria-invalid=true is preserved without ariaErrMsgId", () => {
    const { getByRole } = render(TagsInput, { "aria-invalid": true });

    expect(getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Embedded in field context", () => {
  test("variant comes from context", () => {
    const state = $state({ ...stateDefaults(), variant: VARIANT.ACTIVE });
    const { getByRole } = render(TagsInputCtxProvider, { state });

    expect(getByRole("textbox")).toHaveClass(...mainCls(VARIANT.ACTIVE));
  });

  test("own variant prop is ignored when embedded", () => {
    const state = $state({ ...stateDefaults(), variant: VARIANT.ACTIVE });
    const { getByRole } = render(TagsInputCtxProvider, { state, input: { variant: VARIANT.INACTIVE } });

    expect(getByRole("textbox")).toHaveClass(...mainCls(VARIANT.ACTIVE));
    expect(getByRole("textbox")).not.toHaveClass(VARIANT.INACTIVE);
  });

  test("add writes to context values", async () => {
    const state = $state(stateDefaults());
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, { state });
    const input = getByRole("textbox") as HTMLInputElement;

    await user.type(input, "tag1");
    await user.keyboard("{Enter}");

    expect(state.values).toEqual(["tag1"]);
    expect(state.value).toBe("");
    expect(input).toHaveValue("");
  });

  test("remove writes to context values", async () => {
    const state = $state({ ...stateDefaults(), values: ["a", "b"] });
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, { state });

    await user.click(getByRole("button", { name: "Remove a" }));

    expect(state.values).toEqual(["b"]);
  });

  test("element is mirrored into context", async () => {
    const state = $state(stateDefaults());
    const { getByRole } = render(TagsInputCtxProvider, { state });
    const input = getByRole("textbox") as HTMLInputElement;

    await waitFor(() => expect(state.element).toBe(input));
  });

  test("ariaErrMsgId and aria-invalid come from context", () => {
    const state = $state({ ...stateDefaults(), ariaErrMsgId: "err-1" });
    const { getByRole } = render(TagsInputCtxProvider, { state });
    const input = getByRole("textbox");

    expect(input).toHaveAttribute("aria-errormessage", "err-1");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  test("id and aria-describedby come from context", () => {
    const state = $state({ ...stateDefaults(), id: "ctrl-1", describedby: "desc-1" });
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      input: { id: "own-id", "aria-describedby": "own-desc" },
    });
    const input = getByRole("textbox");

    expect(input).toHaveAttribute("id", "ctrl-1");
    expect(input).toHaveAttribute("aria-describedby", "desc-1");
  });

  test("onadd composition runs user hook before field hook", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn();
    const fieldOnadd = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await user.type(getByRole("textbox"), "tag1");
    await user.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["tag1"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["tag1"] });
    expect(userOnadd.mock.invocationCallOrder[0]).toBeLessThan(fieldOnadd.mock.invocationCallOrder[0]);
    expect(state.values).toEqual(["tag1"]);
  });

  test("paste writes a batch to context values", async () => {
    const state = $state(stateDefaults());
    const { getByRole } = render(TagsInputCtxProvider, { state });

    await paste(getByRole("textbox") as HTMLInputElement, "a,b");

    expect(state.values).toEqual(["a", "b"]);
    expect(state.value).toBe("");
  });

  test("batch onadd composes user then field hook once", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn();
    const fieldOnadd = vi.fn();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await paste(getByRole("textbox") as HTMLInputElement, "a,b");

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
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await user.type(getByRole("textbox"), "blocked");
    await user.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(state.values).toEqual([]);
  });

  test("onadd intersection lets user hook block even when field hook allows", async () => {
    const state = $state(stateDefaults());
    const userOnadd = vi.fn(() => []);
    const fieldOnadd = vi.fn(() => ["blocked"]);
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onadd: fieldOnadd } },
      input: { events: { onadd: userOnadd } },
    });

    await user.type(getByRole("textbox"), "blocked");
    await user.keyboard("{Enter}");

    expect(userOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(fieldOnadd).toHaveBeenCalledWith({ values: [], added: ["blocked"] });
    expect(state.values).toEqual([]);
  });

  test("onchange composition", async () => {
    const state = $state(stateDefaults());
    const userOnchange = vi.fn();
    const fieldOnchange = vi.fn();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { onchange: fieldOnchange },
      input: { onchange: userOnchange },
    });

    await fireEvent.change(getByRole("textbox"));

    expect(userOnchange).toHaveBeenCalledTimes(1);
    expect(fieldOnchange).toHaveBeenCalledTimes(1);
    expect(userOnchange.mock.invocationCallOrder[0]).toBeLessThan(fieldOnchange.mock.invocationCallOrder[0]);
  });

  test("oninvalid composition", async () => {
    const state = $state(stateDefaults());
    const userOninvalid = vi.fn();
    const fieldOninvalid = vi.fn();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { oninvalid: fieldOninvalid },
      input: { oninvalid: userOninvalid },
    });

    await fireEvent.invalid(getByRole("textbox"));

    expect(userOninvalid).toHaveBeenCalledTimes(1);
    expect(fieldOninvalid).toHaveBeenCalledTimes(1);
    expect(userOninvalid.mock.invocationCallOrder[0]).toBeLessThan(fieldOninvalid.mock.invocationCallOrder[0]);
  });

  test("styling falls back to ctx default unless caller provides styling", async () => {
    const state = $state({ ...stateDefaults(), styling: "ctx-style" });
    const { container, rerender } = render(TagsInputCtxProvider, { state });

    expect(container.querySelector(".ctx-style")).toHaveClass("ctx-style", PARTS.WHOLE);
    expect(container.querySelector("input")).toHaveClass("ctx-style", PARTS.MAIN);

    await rerender({ state, input: { styling: "own-style" } });

    expect(container.querySelector(".own-style")).toHaveClass("own-style", PARTS.WHOLE);
    expect(container.querySelector("input")).toHaveClass("own-style", PARTS.MAIN);
  });

  test("onremove local hook composes with context through intersection", async () => {
    const state = $state({ ...stateDefaults(), values: ["a", "b"] });
    const onremove = vi.fn(() => []);
    const fieldOnremove = vi.fn(() => ["a"]);
    const user = userEvent.setup();
    const { getByRole } = render(TagsInputCtxProvider, {
      state,
      hooks: { events: { onremove: fieldOnremove } },
      input: { events: { onremove } },
    });

    await user.click(getByRole("button", { name: "Remove a" }));

    expect(onremove).toHaveBeenCalledWith({ values: ["a", "b"], removed: ["a"] });
    expect(fieldOnremove).toHaveBeenCalledWith({ values: ["a", "b"], removed: ["a"] });
    expect(state.values).toEqual(["a", "b"]);
  });
});
