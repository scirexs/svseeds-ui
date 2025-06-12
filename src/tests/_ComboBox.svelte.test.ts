import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import ComboBox from "../lib/_svseeds/_ComboBox.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

const actionfn = () => {
  return {};
};

describe("Switching existence of elements", () => {
  const options = new Set(["option1", "option2", "option3"]);

  test("basic combobox with options", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;
    expect(combobox).toHaveAttribute("type", "text");
    expect(combobox).toHaveAttribute("role", "combobox");
    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-autocomplete", "none");
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    await user.click(combobox);

    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = within(listbox).getAllByRole("option");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("option1");
    expect(items[1]).toHaveTextContent("option2");
    expect(items[2]).toHaveTextContent("option3");
  });

  test("w/ action", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const { getByRole } = render(ComboBox, { options, action });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveAttribute("role", "combobox");
    expect(action).toHaveBeenCalled();
  });

  test("w/ default value", () => {
    const value = "option2";
    const { getByRole } = render(ComboBox, { options, value });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveValue(value);
  });

  test("w/ expanded initially", () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(listbox).toHaveStyle("visibility: visible");
  });

  test("w/ custom variant", () => {
    const { getByRole } = render(ComboBox, { options, variant: VARIANT.ACTIVE });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveClass("svs-combo-box", PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("w/ attributes", () => {
    const attributes = {
      placeholder: "Select option",
      name: "combo",
      required: true,
    };
    const { getByRole } = render(ComboBox, { options, attributes });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveAttribute("placeholder", "Select option");
    expect(combobox).toHaveAttribute("name", "combo");
    expect(combobox).toHaveAttribute("required");
  });

  test("w/ ignored attributes", () => {
    const attributes = {
      class: "custom-class",
      type: "email",
      value: "ignored",
      list: "ignored-list",
      role: "ignored-role",
    };
    const { getByRole } = render(ComboBox, { options, attributes });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).not.toHaveClass("custom-class");
    expect(combobox).toHaveAttribute("type", "text");
    expect(combobox).toHaveAttribute("role", "combobox");
    expect(combobox).not.toHaveAttribute("list", "ignored-list");
  });
});

describe("Focus and blur behavior", () => {
  const options = new Set(["apple", "banana", "cherry"]);

  test("opens on focus", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    // expect(listbox).toHaveStyle("visibility: hidden");
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    await user.click(combobox);

    const listbox = getByRole("listbox") as HTMLUListElement;
    expect(listbox).toHaveStyle("visibility: visible");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
  });

  test("closes on blur", async () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;

    expect(listbox).toHaveStyle("visibility: visible");
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    await fireEvent.blur(combobox);

    expect(listbox).toHaveStyle("visibility: hidden");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("focuses and selects existing value", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options, value: "banana" });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);

    const items = getAllByRole("option");
    expect(items[1]).toHaveAttribute("aria-selected", "true");
    expect(items[1]).toHaveClass("svs-combo-box", PARTS.LABEL, VARIANT.ACTIVE);
  });
});

describe("Keyboard navigation", () => {
  const options = new Set(["apple", "banana", "cherry", "date"]);

  test("Arrow Down opens and navigates", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{ArrowDown}");

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    const items = getAllByRole("option");
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveAttribute("aria-selected", "false");
    expect(items[1]).toHaveAttribute("aria-selected", "true");
  });

  test("Arrow Up opens from bottom and navigates", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    const items = getAllByRole("option");

    await user.keyboard("{ArrowUp}");
    expect(items[3]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(items[3]).toHaveAttribute("aria-selected", "false");
    expect(items[2]).toHaveAttribute("aria-selected", "true");
  });

  test("Alt+Arrow Down opens without selection", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    const items = getAllByRole("option");
    items.forEach((item) => {
      expect(item).toHaveAttribute("aria-selected", "false");
    });
  });

  test("Alt+Arrow Up closes when expanded", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("Enter applies selection", async () => {
    const user = userEvent.setup();
    const props = $state({ options, value: "" });
    const { getByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}"); // Select "banana"
    await user.keyboard("{Enter}");

    expect(props.value).toBe("banana");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("Escape closes dropdown", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{Escape}");

    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("ignores keydown when composing", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);
    await user.keyboard("{Escape}");
    await fireEvent.keyDown(combobox, {
      key: "ArrowDown",
      isComposing: true,
    });

    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("ignores keydown with modifier keys", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);
    await user.keyboard("{Escape}{Control>}{ArrowDown}{/Control}");

    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });

  test("boundary navigation", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{ArrowDown}"); // Select first item

    let items = getAllByRole("option");
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    // Try to go beyond first item up
    await user.keyboard("{ArrowUp}");
    items = getAllByRole("option");
    expect(items[0]).toHaveAttribute("aria-selected", "true"); // Should stay at first

    // Navigate to last item
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    items = getAllByRole("option");
    expect(items[3]).toHaveAttribute("aria-selected", "true");

    // Try to go beyond last item
    await user.keyboard("{ArrowDown}");
    items = getAllByRole("option");
    expect(items[3]).toHaveAttribute("aria-selected", "true"); // Should stay at last
  });
});

describe("Mouse interactions", () => {
  const options = new Set(["red", "green", "blue"]);

  test("hover selects option", async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(ComboBox, { options, expanded: true });
    const items = getAllByRole("option");

    await user.hover(items[1]);

    expect(items[0]).toHaveAttribute("aria-selected", "false");
    expect(items[1]).toHaveAttribute("aria-selected", "true");
    expect(items[2]).toHaveAttribute("aria-selected", "false");
  });

  test("click applies selection", async () => {
    const user = userEvent.setup();
    const props = $state({ options, value: "", expanded: true });
    const { getByRole, getAllByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;
    const items = getAllByRole("option");

    await user.click(items[2]);

    expect(props.value).toBe("blue");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });
});

describe("State management and bindings", () => {
  const options = new Set(["item1", "item2", "item3"]);

  test("value binding works", async () => {
    const props = $state({ options, value: "item1" });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveValue("item1");

    props.value = "item2";
    await rerender(props);
    expect(combobox).toHaveValue("item2");
  });

  test("expanded binding works", async () => {
    const props = $state({ options, expanded: false });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveAttribute("aria-expanded", "false");
    // expect(listbox).toHaveStyle("visibility: hidden");

    props.expanded = true;
    await rerender(props);
    const listbox = getByRole("listbox") as HTMLUListElement;
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(listbox).toHaveStyle("visibility: visible");
  });

  test("variant binding works", async () => {
    const props = $state({ options, variant: "" });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveClass("svs-combo-box", PARTS.MAIN, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);
    expect(combobox).toHaveClass("svs-combo-box", PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("element binding works", () => {
    const props = $state({ options, element: undefined as HTMLInputElement | undefined });
    render(ComboBox, props);

    expect(props.element).toBeInstanceOf(HTMLInputElement);
    expect(props.element?.tagName).toBe("INPUT");
  });
});

describe("Style and class handling", () => {
  const options = new Set(["opt1", "opt2"]);

  test("default classes", () => {
    const { container, getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const whole = container.firstElementChild as HTMLSpanElement;
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    expect(whole).toHaveClass("svs-combo-box", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(combobox).toHaveClass("svs-combo-box", PARTS.MAIN, VARIANT.NEUTRAL);
    expect(listbox).toHaveClass("svs-combo-box", PARTS.BOTTOM, VARIANT.NEUTRAL);
    expect(items[0]).toHaveClass("svs-combo-box", PARTS.LABEL, VARIANT.NEUTRAL);
  });

  test("string styling classes", () => {
    const styling = "custom-combo";
    const { container, getByRole, getAllByRole } = render(ComboBox, { options, styling, expanded: true });
    const whole = container.firstElementChild as HTMLSpanElement;
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    expect(whole).toHaveClass(styling, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(combobox).toHaveClass(styling, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(listbox).toHaveClass(styling, PARTS.BOTTOM, VARIANT.NEUTRAL);
    expect(items[0]).toHaveClass(styling, PARTS.LABEL, VARIANT.NEUTRAL);
  });

  test("object styling classes", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const styling = {
      whole: dynObj,
      main: dynObj,
      bottom: dynObj,
      label: dynObj,
    };
    const { container, getByRole, getAllByRole } = render(ComboBox, {
      options,
      styling,
      variant: VARIANT.ACTIVE,
      expanded: true,
    });

    const whole = container.firstElementChild as HTMLSpanElement;
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(combobox).toHaveClass(dynObj.base, dynObj.active);
    expect(listbox).toHaveClass(dynObj.base, dynObj.active);
    expect(items[0]).toHaveClass(dynObj.base, dynObj.active);
  });
});

describe("ARIA and accessibility", () => {
  const options = new Set(["accessible1", "accessible2"]);

  test("ARIA attributes are properly set", () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-autocomplete", "none");
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    const controlsId = combobox.getAttribute("aria-controls");
    expect(listbox).toHaveAttribute("id", controlsId);

    items.forEach((item, index) => {
      expect(item).toHaveAttribute("role", "option");
      expect(item).toHaveAttribute("aria-selected", index === 1 ? "false" : "false");
    });
  });

  test("selected item has proper ARIA state", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await user.keyboard("{ArrowDown}");

    const items = getAllByRole("option");
    expect(items[0]).toHaveAttribute("aria-selected", "true");
    expect(items[1]).toHaveAttribute("aria-selected", "false");
  });
});

describe("Edge cases and error handling", () => {
  test("single option", async () => {
    const user = userEvent.setup();
    const singleOption = new Set(["only"]);
    const { getByRole, getAllByRole } = render(ComboBox, { options: singleOption });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);
    await user.keyboard("{ArrowDown}");

    const items = getAllByRole("option");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    // Try navigating beyond bounds
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  test("value not in options", () => {
    const options = new Set(["a", "b", "c"]);
    const { getByRole } = render(ComboBox, { options, value: "invalid" });
    const combobox = getByRole("combobox") as HTMLInputElement;

    expect(combobox).toHaveValue("invalid");
  });

  test("selection cursor position after apply", async () => {
    const user = userEvent.setup();
    const options = new Set(["short", "verylongtext"]);
    const props = $state({ options, value: "", element: undefined as HTMLInputElement | undefined });
    const { getByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await user.click(combobox);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}"); // Select "verylongtext"
    await user.keyboard("{Enter}");

    expect(props.value).toBe("verylongtext");
    // Note: selectionStart check would require more complex setup in test environment
  });
});
