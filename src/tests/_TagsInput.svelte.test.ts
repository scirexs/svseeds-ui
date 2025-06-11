import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import TagsInput from "../lib/_svseeds/_TagsInput.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

const preset = "svs-tags-input";

// Mock Badge component to avoid dependency issues
vi.mock("../lib/_svseeds/_Badge.svelte", () => ({
  default: vi.fn().mockImplementation(({ children, onclick, ...props }) => ({
    render: () => `<button class="mock-badge" onclick="${onclick}">${children}</button>`,
  })),
}));

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

    const badges = container.querySelectorAll(`.${preset}.svs-badge.main`);
    waitFor(() => {
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("tag1");
      expect(badges[1]).toHaveTextContent("tag2");
    });
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

  test("renders tags on right when type='right'", () => {
    const values = ["tag1"];
    const { container } = render(TagsInput, { values, type: "right" });

    const whole = container.querySelector(`.${preset}`);
    const tagsSpan = whole?.querySelector(`.${preset}.aux`);
    const input = container.querySelector("input");

    expect(tagsSpan).toBeInTheDocument();
    expect(input?.nextElementSibling).toBe(tagsSpan);
  });

  test("renders with action", () => {
    const action = vi.fn().mockImplementation(() => ({}));
    const { container } = render(TagsInput, { action });
    const input = container.querySelector("input");

    expect(input).toBeInTheDocument();
    expect(action).toHaveBeenCalled();
  });
});

describe("Tag addition functionality", () => {
  test("adds tag on Enter key", async () => {
    const props = $state({ values: [] as string[], value: "" });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["new tag"]);
    expect(props.value).toBe("");
  });

  test("adds tag on custom confirm key", async () => {
    const props = $state({ values: [] as string[], value: "", confirm: ["Tab"] });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "new tag");
    await user.keyboard("{Tab}");

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

  test("does not trim when trim=false", async () => {
    const props = $state({ values: [] as string[], value: "", trim: false });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "  spaced tag  ");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["  spaced tag  "]);
  });

  test("prevents duplicate tags by default", async () => {
    const props = $state({ values: ["existing"], value: "" });
    const user = userEvent.setup();
    const { container } = render(TagsInput, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await user.type(input, "existing");
    await user.keyboard("{Enter}");

    expect(props.values).toEqual(["existing"]);
    expect(props.value).toBe("");
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
  test("calls onadd event handler", async () => {
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

    expect(onadd).toHaveBeenCalledWith([], "new tag");
    expect(props.values).toEqual(["new tag"]);
  });

  test("cancels tag addition when onadd returns true", async () => {
    const onadd = vi.fn().mockReturnValue(true);
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

    expect(onadd).toHaveBeenCalledWith([], "new tag");
    expect(props.values).toEqual([]);
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

    waitFor(() => {
      expect(onremove).toHaveBeenCalledWith(["tag1", "tag2"], "tag1", 0);
      expect(props.values).toEqual(["tag2"]);
    });
  });

  test("cancels tag removal when onremove returns true", async () => {
    const onremove = vi.fn().mockReturnValue(true);
    const props = $state({
      values: ["tag1", "tag2"],
      events: { onremove },
    });
    const user = userEvent.setup();
    const { container } = render(TagsInput, { props });

    const badges = container.querySelectorAll(".mock-badge");
    await user.click(badges[0]);

    waitFor(() => {
      expect(onremove).toHaveBeenCalledWith(["tag1", "tag2"], "tag1", 0);
      expect(props.values).toEqual(["tag1", "tag2"]);
    });
  });
});

describe("Attributes and styling", () => {
  test("applies custom attributes to input", () => {
    const attributes = {
      placeholder: "Enter tags...",
      "data-testid": "tags-input",
      name: "tags",
    };
    const { container } = render(TagsInput, { attributes });
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveAttribute("placeholder", "Enter tags...");
    expect(input).toHaveAttribute("data-testid", "tags-input");
    expect(input).toHaveAttribute("name", "tags");
  });

  test("ignores class, type, and onkeydown attributes", () => {
    const attributes = {
      class: "custom-class",
      type: "password",
      onkeydown: vi.fn(),
    };
    const { container } = render(TagsInput, { attributes });
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).not.toHaveAttribute("class", "custom-class");
    expect(input).toHaveAttribute("type", "text");
  });

  test("calls original onkeydown handler", async () => {
    const onkeydown = vi.fn();
    const attributes = { onkeydown };
    const user = userEvent.setup();
    const { container } = render(TagsInput, { attributes });
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
    const props = $state({ variant: "" });
    const { container } = render(TagsInput, props);

    expect(props.variant).toBe(VARIANT.NEUTRAL);
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
});
