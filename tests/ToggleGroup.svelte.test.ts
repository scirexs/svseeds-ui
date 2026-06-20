import { describe, expect, test, vi } from "vitest";
import { render as svRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import ToggleGroup, { type ToggleOption } from "#svs/ToggleGroup.svelte";
import { PARTS, VARIANT, _fnClass } from "#svs/core";
import ToggleGroupCtxProvider from "./fixtures/ToggleGroupCtxProvider.svelte";

const options = new Map([
  ["option1", "Option 1"],
  ["option2", "Option 2"],
  ["option3", "Option 3"],
]);

const attachfn = () => {};

const customSnippet = createRawSnippet((value: () => string) => {
  return { render: () => `<span data-testid="custom-${value()}">${value().toUpperCase()}</span>` };
});

const byRole = (container: HTMLElement, role: string) =>
  Array.from(container.querySelectorAll(`[role="${role}"]`)) as HTMLElement[];
const byTestId = (container: HTMLElement, id: string) =>
  Array.from(container.querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[];
const render = (component: any, props?: any) => {
  const result = svRender(component, props);
  const { container } = result;
  return {
    ...result,
    getAllByRole: (role: string) => byRole(container, role),
    getByRole: (role: string) => byRole(container, role)[0],
    getAllByTestId: (id: string) => byTestId(container, id),
    getByTestId: (id: string) => byTestId(container, id)[0],
  };
};

describe("Switching existence of elements", () => {
  test("no props", () => {
    const { container } = render(ToggleGroup, { options: new Map() });
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
  });

  test("with options", () => {
    const { getByRole, getAllByRole } = render(ToggleGroup, { options });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toBeInTheDocument();
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent("Option 1");
    expect(buttons[1]).toHaveTextContent("Option 2");
    expect(buttons[2]).toHaveTextContent("Option 3");
  });

  test("single selection mode", () => {
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, multiple: false });
    const group = getByRole("radiogroup") as HTMLSpanElement;
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    expect(group).toBeInTheDocument();
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
    expect(buttons[2]).toHaveAttribute("tabindex", "-1");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("role", "radio");
    });
  });

  test("with attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const { getAllByRole } = render(ToggleGroup, { options, attach });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons).toHaveLength(3);
    expect(attach).toHaveBeenCalledTimes(3);
  });

  test("with initial values", () => {
    const values = ["option1", "option3"];
    const { getAllByRole } = render(ToggleGroup, { options, values });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).toHaveAttribute("aria-checked", "true");
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
    expect(buttons[2]).toHaveAttribute("aria-checked", "true");
  });

  test("with ariaDescId", () => {
    const ariaDescId = "test-desc";
    const { getByRole } = render(ToggleGroup, { options, ariaDescId });
    const group = getByRole("group") as HTMLSpanElement;

    expect(group).toHaveAttribute("aria-describedby", ariaDescId);
  });

  test("with ariaErrMsgId (multiple mode)", () => {
    const ariaErrMsgId = "test-error";
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, ariaErrMsgId, multiple: true });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-errormessage", ariaErrMsgId);
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute("aria-invalid");
      expect(button).not.toHaveAttribute("aria-errormessage");
    });
  });

  test("with ariaErrMsgId (single mode)", () => {
    const ariaErrMsgId = "test-error";
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, ariaErrMsgId, multiple: false });
    const group = getByRole("radiogroup") as HTMLSpanElement;
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-errormessage", ariaErrMsgId);
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute("aria-invalid");
      expect(button).not.toHaveAttribute("aria-errormessage");
    });
  });

  test("with custom snippet", () => {
    const optionsWithSnippet = new Map([
      ["option1", "Option 1"],
      ["option2", "custom"],
    ]);
    const { getAllByRole, getByTestId } = render(ToggleGroup, {
      options: optionsWithSnippet,
      children: customSnippet,
    });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).toHaveTextContent("OPTION1");
    expect(buttons[1]).toContainElement(getByTestId("custom-option2"));
    expect(getByTestId("custom-option2")).toHaveTextContent("OPTION2");
  });

  test("per-option disabled", async () => {
    const props = $state({
      options: new Map<string, string | ToggleOption>([
        ["a", "A"],
        ["b", { text: "B", disabled: true }],
        ["c", "C"],
      ]),
      values: ["b"],
    });
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    expect(buttons[2]).not.toBeDisabled();
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");

    buttons[1].click();
    await tick();
    expect(props.values).toEqual(["b"]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");
  });

  test("per-option arbitrary attributes and component-owned precedence", () => {
    const optionsWithAttrs = new Map<string, any>([
      [
        "a",
        {
          text: "A",
          title: "tip",
          "data-testid": "opt-a",
          type: "submit",
          role: "button",
          "aria-checked": false,
          "aria-invalid": true,
          "aria-errormessage": "bad",
        },
      ],
    ]);
    const { getByTestId } = render(ToggleGroup, { options: optionsWithAttrs, values: ["a"] });
    const button = getByTestId("opt-a") as HTMLButtonElement;

    expect(button).toHaveAttribute("title", "tip");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("role", "checkbox");
    expect(button).toHaveAttribute("aria-checked", "true");
    expect(button).not.toHaveAttribute("aria-invalid");
    expect(button).not.toHaveAttribute("aria-errormessage");
  });

  test("string, object, and mixed option forms render", () => {
    const pureString = render(ToggleGroup, { options: new Map([["a", "A"]]) });
    expect(pureString.getByRole("checkbox")).toHaveTextContent("A");
    pureString.unmount();

    const pureObject = render(ToggleGroup, { options: new Map([["b", { text: "B" }]]) });
    expect(pureObject.getByRole("checkbox")).toHaveTextContent("B");
    pureObject.unmount();

    const mixed = render(ToggleGroup, {
      options: new Map<string, string | ToggleOption>([
        ["a", "A"],
        ["b", { text: "B" }],
        ["c", "C"],
      ]),
    });
    const buttons = mixed.getAllByRole("checkbox") as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent)).toEqual(["A", "B", "C"]);
  });
});

describe("Status and styling", () => {
  const preset = "svs-toggle-group";

  test("default variant and classes", () => {
    const { getByRole, getAllByRole } = render(ToggleGroup, { options });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
    buttons.forEach((button) => {
      expect(button).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
    });
  });

  test("with custom variant", () => {
    const variant = VARIANT.INACTIVE;
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, variant });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toHaveClass(preset, PARTS.WHOLE, variant);
    buttons.forEach((button) => {
      expect(button).toHaveClass(preset, PARTS.MAIN, variant);
    });
  });

  test("active state for selected options", () => {
    const values = ["option1"];
    const { getAllByRole } = render(ToggleGroup, { options, values });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
    expect(buttons[1]).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(buttons[2]).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("with string styling", () => {
    const styling = "custom-styling";
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, styling });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toHaveClass(styling, PARTS.WHOLE, VARIANT.NEUTRAL);
    buttons.forEach((button) => {
      expect(button).toHaveClass(styling, PARTS.MAIN, VARIANT.NEUTRAL);
    });
  });

  test("with object styling", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
    };
    const styling = {
      whole: dynObj,
      main: dynObj,
    };
    const values = ["option1"];
    const { getByRole, getAllByRole } = render(ToggleGroup, { options, styling, values });
    const group = getByRole("group") as HTMLSpanElement;
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(group).toHaveClass(dynObj.base, dynObj.neutral);
    expect(buttons[0]).toHaveClass(dynObj.base, dynObj.active);
    expect(buttons[1]).toHaveClass(dynObj.base, dynObj.neutral);
    expect(buttons[2]).toHaveClass(dynObj.base, dynObj.neutral);
  });
});

describe("User interactions", () => {
  test("multiple selection toggle", async () => {
    const props = $state({ options, values: [] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    // Select option1
    await user.click(buttons[0]);
    expect(props.values).toEqual(["option1"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");

    // Select option2
    await user.click(buttons[1]);
    expect(props.values).toEqual(["option1", "option2"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");

    // Deselect option1
    await user.click(buttons[0]);
    expect(props.values).toEqual(["option2"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");
  });

  test("events.onadd can veto adding with [] but does not gate removing", async () => {
    const onadd = vi.fn(({ added }: { added: string[] }) => (added[0] === "option2" ? [] : undefined));
    const props = $state({ options, values: [] as string[], events: { onadd } });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, { props });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[1]);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["option2"] });
    expect(props.values).toEqual([]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");

    await user.click(buttons[0]);
    expect(props.values).toEqual(["option1"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");

    onadd.mockClear();
    await user.click(buttons[0]);
    expect(onadd).not.toHaveBeenCalled();
    expect(props.values).toEqual([]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
  });

  test("events.onremove can veto removing with []", async () => {
    const onremove = vi.fn(() => []);
    const props = $state({ options, values: ["option1"], events: { onremove } });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, { props });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);

    expect(onremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(props.values).toEqual(["option1"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");
  });

  test("events.onremove does not fire on add or disabled", async () => {
    const disabledOptions = new Map<string, string | ToggleOption>([
      ["option1", "Option 1"],
      ["option2", { text: "Option 2", disabled: true }],
      ["option3", "Option 3"],
    ]);
    const onadd = vi.fn();
    const onremove = vi.fn();
    const props = $state({
      options: disabledOptions,
      values: ["option2"] as string[],
      events: { onadd, onremove },
    });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, { props });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    expect(onadd).toHaveBeenCalledWith({ values: ["option2"], added: ["option1"] });
    expect(onremove).not.toHaveBeenCalled();
    expect(props.values).toEqual(["option1", "option2"]);

    await user.click(buttons[0]);
    expect(onremove).toHaveBeenCalledWith({ values: ["option1", "option2"], removed: ["option1"] });
    expect(props.values).toEqual(["option2"]);

    onremove.mockClear();
    buttons[1].click();
    await tick();
    expect(onremove).not.toHaveBeenCalled();
    expect(props.values).toEqual(["option2"]);
  });

  test("single selection radio behavior", async () => {
    const props = $state({ options, values: [], multiple: false });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    // Select option1
    await user.click(buttons[0]);
    expect(props.values).toEqual(["option1"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
    expect(buttons[2]).toHaveAttribute("aria-checked", "false");

    // Select option2 (should deselect option1)
    await user.click(buttons[1]);
    expect(props.values).toEqual(["option2"]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");
    expect(buttons[2]).toHaveAttribute("aria-checked", "false");

    // Click same option again (should deselect)
    await user.click(buttons[1]);
    expect(props.values).toEqual([]);
    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
    expect(buttons[1]).toHaveAttribute("aria-checked", "false");
    expect(buttons[2]).toHaveAttribute("aria-checked", "false");
  });

  test("maintains order in multiple selection", async () => {
    const props = $state({ options, values: [] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    // Select in different order
    await user.click(buttons[2]); // option3
    await user.click(buttons[0]); // option1
    await user.click(buttons[1]); // option2

    // Should maintain the order from options Map
    expect(props.values).toEqual(["option1", "option2", "option3"]);

    // Deselect middle option
    await user.click(buttons[1]); // deselect option2
    expect(props.values).toEqual(["option1", "option3"]);
  });

  test("multiple selection drops out-of-options values after toggle", async () => {
    const props = $state({ options, values: ["option1", "ghost", "option2"] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[2]);
    expect(props.values).toEqual(["option1", "option2", "option3"]);

    await user.click(buttons[1]);
    expect(props.values).toEqual(["option1", "option3"]);
  });

  test("single mode roving tabindex", async () => {
    const selected = render(ToggleGroup, { options, values: ["option2"], multiple: false });
    let buttons = selected.getAllByRole("radio") as HTMLButtonElement[];
    expect(buttons[0]).toHaveAttribute("tabindex", "-1");
    expect(buttons[1]).toHaveAttribute("tabindex", "0");
    expect(buttons[2]).toHaveAttribute("tabindex", "-1");
    selected.unmount();

    const firstDisabled = render(ToggleGroup, {
      options: new Map<string, string | ToggleOption>([
        ["option1", { text: "Option 1", disabled: true }],
        ["option2", "Option 2"],
        ["option3", "Option 3"],
      ]),
      multiple: false,
    });
    buttons = firstDisabled.getAllByRole("radio") as HTMLButtonElement[];
    expect(buttons[0]).toHaveAttribute("tabindex", "-1");
    expect(buttons[1]).toHaveAttribute("tabindex", "0");
    expect(buttons[2]).toHaveAttribute("tabindex", "-1");
    firstDisabled.unmount();

    const props = $state({ options, values: [], multiple: true });
    const user = userEvent;
    const multipleMode = render(ToggleGroup, props);
    buttons = multipleMode.getAllByRole("checkbox") as HTMLButtonElement[];
    buttons.forEach((button) => expect(button).not.toHaveAttribute("tabindex"));

    buttons[0].focus();
    await user.keyboard("[ArrowRight]");
    expect(buttons[0]).toHaveFocus();
    expect(props.values).toEqual([]);
  });

  test("single mode arrow, Home, and End navigation", async () => {
    const props = $state({ options, values: [], multiple: false });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    buttons[0].focus();
    await user.keyboard("[ArrowRight]");
    expect(buttons[1]).toHaveFocus();
    expect(props.values).toEqual(["option2"]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");

    await user.keyboard("[ArrowDown]");
    expect(buttons[2]).toHaveFocus();
    expect(props.values).toEqual(["option3"]);

    await user.keyboard("[ArrowRight]");
    expect(buttons[0]).toHaveFocus();
    expect(props.values).toEqual(["option1"]);

    await user.keyboard("[ArrowLeft]");
    expect(buttons[2]).toHaveFocus();
    expect(props.values).toEqual(["option3"]);

    await user.keyboard("[ArrowUp]");
    expect(buttons[1]).toHaveFocus();
    expect(props.values).toEqual(["option2"]);

    await user.keyboard("[Home]");
    expect(buttons[0]).toHaveFocus();
    expect(props.values).toEqual(["option1"]);

    await user.keyboard("[End]");
    expect(buttons[2]).toHaveFocus();
    expect(props.values).toEqual(["option3"]);
  });

  test("single mode arrow navigation skips disabled options", async () => {
    const props = $state({
      options: new Map<string, string | ToggleOption>([
        ["a", "A"],
        ["b", { text: "B", disabled: true }],
        ["c", "C"],
      ]),
      values: [],
      multiple: false,
    });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    buttons[0].focus();
    await user.keyboard("[ArrowRight]");
    expect(buttons[2]).toHaveFocus();
    expect(props.values).toEqual(["c"]);

    await user.keyboard("[Home]");
    expect(buttons[0]).toHaveFocus();
    expect(props.values).toEqual(["a"]);

    await user.keyboard("[End]");
    expect(buttons[2]).toHaveFocus();
    expect(props.values).toEqual(["c"]);
  });

  test("keyboard navigation", async () => {
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, { options });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    // Focus first button
    buttons[0].focus();
    expect(buttons[0]).toHaveFocus();

    // Space to activate
    await user.keyboard("[Space]");
    await expect.element(buttons[0]).toHaveAttribute("aria-checked", "true");
  });

  test("with attach and user interaction", async () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = $state({ options, values: [], attach });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    expect(props.values).toEqual(["option1"]);
    expect(attach).toHaveBeenCalledTimes(3); // Called once for each button during mount
  });
});

describe("Embedded in field context", () => {
  const preset = "svs-toggle-group";
  const cls = _fnClass(preset);

  test("variant comes from context", () => {
    const state = $state({ values: [] as string[], variant: VARIANT.ACTIVE, elements: [] as HTMLButtonElement[] });
    const { getByRole } = render(ToggleGroupCtxProvider, { state, input: { options } });
    const group = getByRole("group") as HTMLSpanElement;

    expect(group).toHaveClass(...`${cls(PARTS.WHOLE, VARIANT.ACTIVE)}`.split(" "));
  });

  test("styling comes from context unless own styling is present", () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, styling: "ctx-style", elements: [] as HTMLButtonElement[] });
    const ctxOnly = render(ToggleGroupCtxProvider, { state, input: { options } });
    expect(ctxOnly.getByRole("group")).toHaveClass(...`${_fnClass(preset, "ctx-style")(PARTS.WHOLE, VARIANT.NEUTRAL)}`.split(" "));
    ctxOnly.unmount();

    const ownWins = render(ToggleGroupCtxProvider, { state, input: { options, styling: "own-style" } });
    const group = ownWins.getByRole("group") as HTMLSpanElement;
    expect(group).toHaveClass(...`${_fnClass(preset, "own-style")(PARTS.WHOLE, VARIANT.NEUTRAL)}`.split(" "));
    expect(group).not.toHaveClass("ctx-style");
  });

  test("values come from context checked state", () => {
    const state = $state({ values: ["option2"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options } });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");
    expect(buttons[2]).toHaveAttribute("aria-checked", "false");
  });

  test("click writes to context values", async () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options, multiple: true } });

    await user.click(getAllByRole("checkbox")[0]);
    expect(state.values).toEqual(["option1"]);
  });

  test("click toggles off through context", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options } });

    await user.click(getAllByRole("checkbox")[0]);
    expect(state.values).toEqual([]);
  });

  test("elements are mirrored into context", async () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options } });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await tick();
    expect(state.elements).toHaveLength(3);
    expect(state.elements[0]).toBe(buttons[0]);
  });

  test("ariaErrMsgId and aria-invalid come from context", () => {
    const state = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      ariaErrMsgId: "err-1",
      elements: [] as HTMLButtonElement[],
    });
    const { getByRole } = render(ToggleGroupCtxProvider, { state, input: { options, ariaErrMsgId: "own-err" } });
    const group = getByRole("group") as HTMLSpanElement;

    expect(group).toHaveAttribute("aria-errormessage", "err-1");
    expect(group).toHaveAttribute("aria-invalid", "true");
  });

  test("ariaDescId comes from context", () => {
    const state = $state({
      values: [] as string[],
      variant: VARIANT.NEUTRAL,
      ariaDescId: "desc-1",
      elements: [] as HTMLButtonElement[],
    });
    const { getByRole } = render(ToggleGroupCtxProvider, { state, input: { options, ariaDescId: "own-desc" } });

    expect(getByRole("group")).toHaveAttribute("aria-describedby", "desc-1");
  });

  test("context onadd hook can veto add with []", async () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const onadd = vi.fn(() => []);
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, hooks: { events: { onadd } }, input: { options } });

    await user.click(getAllByRole("checkbox")[0]);
    expect(onadd).toHaveBeenCalledWith({ values: [], added: ["option1"] });
    expect(state.values).toEqual([]);
  });

  test("own and context onadd both fire", async () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const ownOnadd = vi.fn();
    const ctxOnadd = vi.fn();
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, {
      state,
      hooks: { events: { onadd: ctxOnadd } },
      input: { options, events: { onadd: ownOnadd } },
    });

    await user.click(getAllByRole("checkbox")[0]);
    expect(ownOnadd).toHaveBeenCalledWith({ values: [], added: ["option1"] });
    expect(ctxOnadd).toHaveBeenCalledWith({ values: [], added: ["option1"] });
    expect(state.values).toEqual(["option1"]);
  });

  test("own and context onadd compose by intersection", async () => {
    const state = $state({ values: [] as string[], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const ownOnadd = vi.fn(() => ["option1"]);
    const ctxOnadd = vi.fn(() => []);
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, {
      state,
      hooks: { events: { onadd: ctxOnadd } },
      input: { options, events: { onadd: ownOnadd } },
    });

    await user.click(getAllByRole("checkbox")[0]);
    expect(ownOnadd).toHaveBeenCalledWith({ values: [], added: ["option1"] });
    expect(ctxOnadd).toHaveBeenCalledWith({ values: [], added: ["option1"] });
    expect(state.values).toEqual([]);
  });

  test("context onremove hook can veto remove with []", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const onremove = vi.fn(() => []);
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, hooks: { events: { onremove } }, input: { options } });

    await user.click(getAllByRole("checkbox")[0]);
    expect(onremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(state.values).toEqual(["option1"]);
  });

  test("own and context onremove both fire in order", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const ownOnremove = vi.fn();
    const ctxOnremove = vi.fn();
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, {
      state,
      hooks: { events: { onremove: ctxOnremove } },
      input: { options, events: { onremove: ownOnremove } },
    });

    await user.click(getAllByRole("checkbox")[0]);
    expect(ownOnremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(ctxOnremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(ownOnremove.mock.invocationCallOrder[0]).toBeLessThan(ctxOnremove.mock.invocationCallOrder[0]);
    expect(state.values).toEqual([]);
  });

  test("own and context onremove compose by intersection", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const ownOnremove = vi.fn(() => []);
    const ctxOnremove = vi.fn(() => ["option1"]);
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, {
      state,
      hooks: { events: { onremove: ctxOnremove } },
      input: { options, events: { onremove: ownOnremove } },
    });

    await user.click(getAllByRole("checkbox")[0]);
    expect(ownOnremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(ctxOnremove).toHaveBeenCalledWith({ values: ["option1"], removed: ["option1"] });
    expect(state.values).toEqual(["option1"]);
  });

  test("single-select via context", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options, multiple: false } });

    await user.click(getAllByRole("radio")[1]);
    expect(state.values).toEqual(["option2"]);
  });

  test("single-select keyboard navigation writes to context values", async () => {
    const state = $state({ values: ["option1"], variant: VARIANT.NEUTRAL, elements: [] as HTMLButtonElement[] });
    const user = userEvent;
    const { getAllByRole } = render(ToggleGroupCtxProvider, { state, input: { options, multiple: false } });
    const buttons = getAllByRole("radio") as HTMLButtonElement[];

    buttons[0].focus();
    await user.keyboard("[ArrowRight]");
    expect(buttons[1]).toHaveFocus();
    expect(state.values).toEqual(["option2"]);
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");
  });
});

describe("Edge cases", () => {
  test("empty options", () => {
    const { container } = render(ToggleGroup, { options: new Map() });
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
  });

  test("options with empty values", () => {
    const emptyOptions = new Map([
      ["", "Empty Key"],
      ["valid", "Valid Option"],
    ]);
    const { getAllByRole } = render(ToggleGroup, { options: emptyOptions });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Empty Key");
    expect(buttons[1]).toHaveTextContent("Valid Option");
  });

  test("values not in options", () => {
    const props = $state({
      options,
      values: ["option1", "nonexistent", "option2"],
    });
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    // Only valid options should be checked
    expect(buttons[0]).toHaveAttribute("aria-checked", "true"); // option1
    expect(buttons[1]).toHaveAttribute("aria-checked", "true"); // option2
    expect(buttons[2]).toHaveAttribute("aria-checked", "false"); // option3
  });

  test("multiple to single runtime toggle reconciles values", async () => {
    const props = $state({
      options,
      multiple: true,
      values: ["option1", "option2", "option3"],
    });
    const { rerender, getAllByRole } = render(ToggleGroup, props);

    props.multiple = false;
    await rerender(props);
    await tick();

    expect(props.values).toEqual(["option1"]);
    const buttons = getAllByRole("radio") as HTMLButtonElement[];
    expect(buttons.filter((button) => button.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");
  });

  test("elements bindable array receives buttons", () => {
    const props = $state({ options, elements: [] as HTMLButtonElement[] });
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(props.elements).toHaveLength(3);
    expect(props.elements[0]).toBe(buttons[0]);
    expect(props.elements[1]).toBe(buttons[1]);
    expect(props.elements[2]).toBe(buttons[2]);
  });

  test("children snippet receives computed variant", () => {
    const variantSnippet = createRawSnippet((value: () => string, _text: () => string, variant: () => string) => {
      return { render: () => `<span data-testid="variant-${value()}">${variant()}</span>` };
    });
    const { getByTestId } = render(ToggleGroup, {
      options,
      values: ["option1"],
      children: variantSnippet,
    });

    expect(getByTestId("variant-option1")).toHaveTextContent(VARIANT.ACTIVE);
    expect(getByTestId("variant-option2")).toHaveTextContent(VARIANT.NEUTRAL);
  });

  test("reactive options update", async () => {
    const props = $state({
      options: new Map([
        ["a", "A"],
        ["b", "B"],
      ]),
      values: ["a"],
    });
    const { rerender, getAllByRole } = render(ToggleGroup, props);

    let buttons = getAllByRole("checkbox") as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true");

    // Update options
    props.options = new Map([
      ["a", "A"],
      ["c", "C"],
      ["d", "D"],
    ]);
    await rerender(props);

    buttons = getAllByRole("checkbox") as HTMLButtonElement[];
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("aria-checked", "true"); // 'a' still selected
    expect(buttons[1]).toHaveAttribute("aria-checked", "false"); // 'c' not selected
    expect(buttons[2]).toHaveAttribute("aria-checked", "false"); // 'd' not selected
  });
});
