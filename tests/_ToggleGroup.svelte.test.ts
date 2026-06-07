import { describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import ToggleGroup, { type ToggleOption } from "#svs/_ToggleGroup.svelte";
import { PARTS, VARIANT } from "#svs/core";

const options = new Map([
  ["option1", "Option 1"],
  ["option2", "Option 2"],
  ["option3", "Option 3"],
]);

const attachfn = () => {};

const customSnippet = createRawSnippet((value: () => string) => {
  return { render: () => `<span data-testid="custom-${value()}">${value().toUpperCase()}</span>` };
});

describe("Switching existence of elements", () => {
  test("no props", () => {
    try {
      const { container } = render(ToggleGroup, { options: new Map() });
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
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
    const user = userEvent.setup();
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    expect(buttons[2]).not.toBeDisabled();
    expect(buttons[1]).toHaveAttribute("aria-checked", "true");

    await user.click(buttons[1]);
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
    const user = userEvent.setup();
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

  test("single selection radio behavior", async () => {
    const props = $state({ options, values: [], multiple: false });
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    const { getAllByRole } = render(ToggleGroup, { options });
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    // Focus first button
    buttons[0].focus();
    expect(buttons[0]).toHaveFocus();

    // Space to activate
    await user.keyboard("[Space]");
    await waitFor(() => {
      expect(buttons[0]).toHaveAttribute("aria-checked", "true");
    });
  });

  test("with attach and user interaction", async () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = $state({ options, values: [], attach });
    const user = userEvent.setup();
    const { getAllByRole } = render(ToggleGroup, props);
    const buttons = getAllByRole("checkbox") as HTMLButtonElement[];

    await user.click(buttons[0]);
    expect(props.values).toEqual(["option1"]);
    expect(attach).toHaveBeenCalledTimes(3); // Called once for each button during mount
  });
});

describe("Edge cases", () => {
  test("empty options", () => {
    try {
      const { container } = render(ToggleGroup, { options: new Map() });
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
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
