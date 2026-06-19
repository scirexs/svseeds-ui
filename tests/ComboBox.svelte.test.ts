import { describe, expect, test, vi } from "vitest";
import { render as svRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import ComboBox from "#svs/ComboBox.svelte";
import { PARTS, VARIANT } from "#svs/core";

const attachfn = () => {};
const mockScrollIntoView = () => {
  const spy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
  return { spy, restore: () => spy.mockRestore() };
};
const byRole = (container: HTMLElement | ParentNode, role: string) =>
  Array.from(container.querySelectorAll(`[role="${role}"]`)) as HTMLElement[];
const byTestId = (container: HTMLElement, id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const render = (component: any, props?: any) => {
  const result = svRender(component, props);
  const { container } = result;
  return {
    ...result,
    getByRole: (role: string) => byRole(container, role)[0] ?? null,
    queryByRole: (role: string) => byRole(container, role)[0] ?? null,
    getAllByRole: (role: string) => byRole(container, role),
    getByTestId: (id: string) => byTestId(container, id),
  };
};
const within = (node: HTMLElement) => ({
  getAllByRole: (role: string) => byRole(node, role),
  queryAllByRole: (role: string) => byRole(node, role),
});
const fireEvent = {
  blur: async (el: HTMLElement) => {
    el.blur();
    await tick();
  },
  focus: async (el: HTMLElement) => {
    el.focus();
    await tick();
  },
  keyDown: async (el: HTMLElement, init: KeyboardEventInit) => {
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
    await tick();
  },
  pointerDown: async (el: HTMLElement) => {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await tick();
  },
  scroll: async (target: Document) => {
    target.dispatchEvent(new Event("scroll"));
    await tick();
  },
};
const has = (el: Element | null | undefined, ...names: string[]) =>
  expect([...(el?.classList ?? [])]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element | null | undefined, name: string) => expect(el?.classList.contains(name)).toBe(false);
const attr = (el: Element, name: string, value?: string | null) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(true);
  else expect(el.getAttribute(name)).toBe(value);
};
const noattr = (el: Element, name: string) => expect(el.hasAttribute(name)).toBe(false);
const txt = (el: Element | null | undefined, value: string) => expect(el?.textContent).toContain(value);
const val = (el: HTMLInputElement, value: string) => expect(el.value).toBe(value);
const focus = (el: Element) => expect(document.activeElement).toBe(el);
const inDoc = (el: Element | null | undefined) => expect(!!el?.isConnected).toBe(true);
const style = (el: Element, name: keyof CSSStyleDeclaration, value: string) => expect(getComputedStyle(el)[name]).toBe(value);

describe("Switching existence of elements", () => {
  const options = new Set(["option1", "option2", "option3"]);

  test("basic combobox with options", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;
    attr(combobox, "type", "text");
    attr(combobox, "role", "combobox");
    attr(combobox, "aria-haspopup", "listbox");
    attr(combobox, "aria-autocomplete", "list");
    attr(combobox, "aria-expanded", "false");

    await userEvent.click(combobox);

    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = within(listbox).getAllByRole("option");
    expect(items).toHaveLength(3);
    txt(items[0], "option1");
    txt(items[1], "option2");
    txt(items[2], "option3");
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const { getByRole } = render(ComboBox, { options, attach });
    const combobox = getByRole("combobox") as HTMLInputElement;

    attr(combobox, "role", "combobox");
    expect(attach).toHaveBeenCalled();
  });

  test("w/ default value", () => {
    const value = "option2";
    const { getByRole } = render(ComboBox, { options, value });
    const combobox = getByRole("combobox") as HTMLInputElement;

    val(combobox, value);
  });

  test("w/ expanded initially", () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;

    attr(combobox, "aria-expanded", "true");
    style(listbox, "visibility", "visible");
  });

  test("w/ custom variant", () => {
    const { getByRole } = render(ComboBox, { options, variant: VARIANT.ACTIVE });
    const combobox = getByRole("combobox") as HTMLInputElement;

    has(combobox, "svs-combo-box", PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("w/ attributes", () => {
    const { getByRole } = render(ComboBox, {
      options,
      placeholder: "Select option",
      name: "combo",
      required: true,
    });
    const combobox = getByRole("combobox") as HTMLInputElement;

    attr(combobox, "placeholder", "Select option");
    attr(combobox, "name", "combo");
    attr(combobox, "required");
  });

  test("class merged onto control, type/role forced", () => {
    const { getByRole } = render(ComboBox, { options, class: "custom-class", type: "email", role: "spinbutton" } as any);
    const combobox = getByRole("combobox") as HTMLInputElement;
    const root = combobox.parentElement as HTMLElement;

    has(combobox, "custom-class"); // merged onto the control (same as ...rest)
    lacks(root, "custom-class"); // not on the WHOLE root
    attr(combobox, "type", "text"); // forced, not from rest
    attr(combobox, "role", "combobox"); // forced, not from rest
  });
});

describe("Focus and blur behavior", () => {
  const options = new Set(["apple", "banana", "cherry"]);

  test("opens on focus", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    // style(listbox, "visibility", "hidden");
    attr(combobox, "aria-expanded", "false");

    await userEvent.click(combobox);

    const listbox = getByRole("listbox") as HTMLUListElement;
    style(listbox, "visibility", "visible");
    attr(combobox, "aria-expanded", "true");
  });

  test("closes on blur", async () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;

    style(listbox, "visibility", "visible");
    attr(combobox, "aria-expanded", "true");

    combobox.focus();
    await tick();
    await fireEvent.blur(combobox);

    style(listbox, "visibility", "hidden");
    attr(combobox, "aria-expanded", "false");
  });

  test("click reopens after Escape while focus remains on input", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{Escape}");
    focus(combobox);
    attr(combobox, "aria-expanded", "false");

    await userEvent.click(combobox);

    attr(combobox, "aria-expanded", "true");
    expect(within(getByRole("listbox")).getAllByRole("option")).toHaveLength(3);
  });

  test("focuses and selects existing value", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, value: "banana" });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);

    const items = getAllByRole("option");
    attr(items[1], "aria-selected", "true");
    has(items[1], "svs-combo-box", PARTS.LABEL, VARIANT.ACTIVE);
  });
});

describe("Keyboard navigation", () => {
  const options = new Set(["apple", "banana", "cherry", "date"]);

  test("Arrow Down opens and navigates", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{ArrowDown}");

    attr(combobox, "aria-expanded", "true");
    const items = getAllByRole("option");
    attr(items[0], "aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");
    attr(items[0], "aria-selected", "false");
    attr(items[1], "aria-selected", "true");
  });

  test("Arrow Up opens from bottom and navigates", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    attr(combobox, "aria-expanded", "true");

    const items = getAllByRole("option");

    await userEvent.keyboard("{ArrowUp}");
    attr(items[3], "aria-selected", "true");

    await userEvent.keyboard("{ArrowUp}");
    attr(items[3], "aria-selected", "false");
    attr(items[2], "aria-selected", "true");
  });

  test("Alt+Arrow Down opens without selection", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");

    attr(combobox, "aria-expanded", "true");
    const items = getAllByRole("option");
    items.forEach((item) => {
      attr(item, "aria-selected", "false");
    });
  });

  test("Alt+Arrow Up closes when expanded", async () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");

    attr(combobox, "aria-expanded", "false");
  });

  test("Enter applies selection", async () => {
    const props = $state({ options, value: "" });
    const { getByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}"); // Select "banana"
    await userEvent.keyboard("{Enter}");

    expect(props.value).toBe("banana");
    attr(combobox, "aria-expanded", "false");
  });

  test("Escape closes dropdown", async () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{Escape}");

    attr(combobox, "aria-expanded", "false");
  });

  test("ignores keydown when composing", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{Escape}");
    await fireEvent.keyDown(combobox, {
      key: "ArrowDown",
      isComposing: true,
    });

    attr(combobox, "aria-expanded", "false");
  });

  test("ignores keydown with modifier keys", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{Escape}{Control>}{ArrowDown}{/Control}");

    attr(combobox, "aria-expanded", "false");
  });

  test("boundary navigation", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{ArrowDown}"); // Select first item

    let items = getAllByRole("option");
    attr(items[0], "aria-selected", "true");

    // Try to go beyond first item up
    await userEvent.keyboard("{ArrowUp}");
    items = getAllByRole("option");
    attr(items[0], "aria-selected", "true"); // Should stay at first

    // Navigate to last item
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    items = getAllByRole("option");
    attr(items[3], "aria-selected", "true");

    // Try to go beyond last item
    await userEvent.keyboard("{ArrowDown}");
    items = getAllByRole("option");
    attr(items[3], "aria-selected", "true"); // Should stay at last
  });
});

describe("Mouse interactions", () => {
  const options = new Set(["red", "green", "blue"]);

  test("hover selects option", async () => {
    const { getAllByRole } = render(ComboBox, { options, expanded: true });
    const items = getAllByRole("option");

    await userEvent.hover(items[1]);

    attr(items[0], "aria-selected", "false");
    attr(items[1], "aria-selected", "true");
    attr(items[2], "aria-selected", "false");
  });

  test("click applies selection", async () => {
    const props = $state({ options, value: "", expanded: true });
    const { getByRole, getAllByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;
    const items = getAllByRole("option");

    await userEvent.click(items[2]);

    expect(props.value).toBe("blue");
    attr(combobox, "aria-expanded", "false");
  });
});

describe("State management and bindings", () => {
  const options = new Set(["item1", "item2", "item3"]);

  test("value binding works", async () => {
    const props = $state({ options, value: "item1" });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    val(combobox, "item1");

    props.value = "item2";
    await rerender(props);
    val(combobox, "item2");
  });

  test("expanded binding works", async () => {
    const props = $state({ options, expanded: false });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    attr(combobox, "aria-expanded", "false");
    // style(listbox, "visibility", "hidden");

    props.expanded = true;
    await rerender(props);
    const listbox = getByRole("listbox") as HTMLUListElement;
    attr(combobox, "aria-expanded", "true");
    style(listbox, "visibility", "visible");
  });

  test("variant binding works", async () => {
    const props = $state({ options, variant: VARIANT.NEUTRAL as string });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    has(combobox, "svs-combo-box", PARTS.MAIN, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);
    has(combobox, "svs-combo-box", PARTS.MAIN, VARIANT.ACTIVE);
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

    has(whole, "svs-combo-box", PARTS.WHOLE, VARIANT.NEUTRAL);
    has(combobox, "svs-combo-box", PARTS.MAIN, VARIANT.NEUTRAL);
    has(listbox, "svs-combo-box", PARTS.BOTTOM, VARIANT.ACTIVE);
    has(items[0], "svs-combo-box", PARTS.LABEL, VARIANT.NEUTRAL);
  });

  test("string styling classes", () => {
    const styling = "custom-combo";
    const { container, getByRole, getAllByRole } = render(ComboBox, { options, styling, expanded: true });
    const whole = container.firstElementChild as HTMLSpanElement;
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    has(whole, styling, PARTS.WHOLE, VARIANT.NEUTRAL);
    has(combobox, styling, PARTS.MAIN, VARIANT.NEUTRAL);
    has(listbox, styling, PARTS.BOTTOM, VARIANT.ACTIVE);
    has(items[0], styling, PARTS.LABEL, VARIANT.NEUTRAL);
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

    has(whole, dynObj.base, dynObj.active);
    has(combobox, dynObj.base, dynObj.active);
    has(listbox, dynObj.base, dynObj.active);
    has(items[0], dynObj.base, dynObj.active);
  });
});

describe("ARIA and accessibility", () => {
  const options = new Set(["accessible1", "accessible2"]);

  test("ARIA attributes are properly set", () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;
    const listbox = getByRole("listbox") as HTMLUListElement;
    const items = getAllByRole("option");

    attr(combobox, "aria-haspopup", "listbox");
    attr(combobox, "aria-autocomplete", "list");
    attr(combobox, "aria-expanded", "true");

    const controlsId = combobox.getAttribute("aria-controls");
    attr(listbox, "id", controlsId);

    items.forEach((item) => {
      attr(item, "role", "option");
      attr(item, "aria-selected", "false");
    });
  });

  test("selected item has proper ARIA state", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{ArrowDown}");

    const items = getAllByRole("option");
    attr(items[0], "aria-selected", "true");
    attr(items[1], "aria-selected", "false");
  });

  test("aria-activedescendant follows selection", async () => {
    const { getByRole, getAllByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    combobox.focus();
    await userEvent.keyboard("{ArrowDown}");

    let items = getAllByRole("option");
    const ids = items.map((item) => item.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(items.length);
    attr(combobox, "aria-activedescendant", items[0].id);

    await userEvent.keyboard("{ArrowDown}");
    items = getAllByRole("option");
    attr(combobox, "aria-activedescendant", items[1].id);
  });

  test("aria-activedescendant is absent when nothing is selected", () => {
    const { getByRole } = render(ComboBox, { options, expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    noattr(combobox, "aria-activedescendant");
  });
});

describe("Filtering", () => {
  const options = new Set(["HTML", "CSS", "JavaScript", "TypeScript"]);
  const optionTexts = (listbox: HTMLElement) =>
    within(listbox)
      .queryAllByRole("option")
      .map((item) => item.textContent);

  test("focus shows the full list before typing", async () => {
    const { getByRole } = render(ComboBox, { options, value: "C" });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML", "CSS", "JavaScript", "TypeScript"]);
  });

  test("typing narrows the list", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("Ty");

    expect(optionTexts(getByRole("listbox"))).toEqual(["TypeScript"]);
  });

  test("matching is case-insensitive", async () => {
    const { getByRole, rerender } = render(ComboBox, { options });
    let combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("ty");

    expect(optionTexts(getByRole("listbox"))).toEqual(["TypeScript"]);

    await fireEvent.blur(combobox);
    await rerender({ options, value: "", expanded: false });
    combobox = getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(combobox);
    await userEvent.keyboard("ht");

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML"]);
  });

  test("clearing input restores the full list", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("Ty");
    expect(optionTexts(getByRole("listbox"))).toEqual(["TypeScript"]);

    await userEvent.clear(combobox);

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML", "CSS", "JavaScript", "TypeScript"]);
  });

  test("zero matches stay open with an empty list", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("zzz");

    attr(combobox, "aria-expanded", "true");
    expect(within(getByRole("listbox")).queryAllByRole("option")).toHaveLength(0);
  });

  test("re-open resets the filter", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("Ty");
    expect(optionTexts(getByRole("listbox"))).toEqual(["TypeScript"]);

    await userEvent.keyboard("{Escape}");
    await fireEvent.blur(combobox);
    await fireEvent.focus(combobox);

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML", "CSS", "JavaScript", "TypeScript"]);
  });

  test("external close resets the filter", async () => {
    const props = $state({ options, value: "", expanded: true });
    const { getByRole, rerender } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("Ty");
    expect(optionTexts(getByRole("listbox"))).toEqual(["TypeScript"]);

    props.expanded = false;
    await rerender(props);
    props.expanded = true;
    await rerender(props);

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML", "CSS", "JavaScript", "TypeScript"]);
  });

  test("search false disables filtering but exact matches still highlight", async () => {
    const { getByRole } = render(ComboBox, { options, search: false });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("Ty");

    expect(optionTexts(getByRole("listbox"))).toEqual(["HTML", "CSS", "JavaScript", "TypeScript"]);

    await userEvent.clear(combobox);
    await userEvent.keyboard("CSS");

    const items = within(getByRole("listbox")).getAllByRole("option");
    expect(items.map((item) => item.getAttribute("aria-selected"))).toEqual(["false", "true", "false", "false"]);
  });

  test("exact matches highlight with search enabled", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("CSS");

    const items = within(getByRole("listbox")).getAllByRole("option");
    expect(items).toHaveLength(1);
    txt(items[0], "CSS");
    attr(items[0], "aria-selected", "true");
  });
});

describe("Edge cases and error handling", () => {
  test("single option", async () => {
    const singleOption = new Set(["only"]);
    const { getByRole, getAllByRole } = render(ComboBox, { options: singleOption });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{ArrowDown}");

    const items = getAllByRole("option");
    expect(items).toHaveLength(1);
    attr(items[0], "aria-selected", "true");

    // Try navigating beyond bounds
    await userEvent.keyboard("{ArrowDown}");
    attr(items[0], "aria-selected", "true");

    await userEvent.keyboard("{ArrowUp}");
    attr(items[0], "aria-selected", "true");
  });

  test("value not in options", () => {
    const options = new Set(["a", "b", "c"]);
    const { getByRole } = render(ComboBox, { options, value: "invalid" });
    const combobox = getByRole("combobox") as HTMLInputElement;

    val(combobox, "invalid");
  });

  test("selection cursor position after apply", async () => {
    const options = new Set(["short", "verylongtext"]);
    const props = $state({ options, value: "", element: undefined as HTMLInputElement | undefined });
    const { getByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}"); // Select "verylongtext"
    await userEvent.keyboard("{Enter}");

    expect(props.value).toBe("verylongtext");
    // Note: selectionStart check would require more complex setup in test environment
  });

  test("Enter with no selection does not corrupt value", async () => {
    const props = $state({ options: new Set(["a", "b", "c"]), value: "typed" });
    const { getByRole } = render(ComboBox, props);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{Enter}");

    expect(props.value).toBe("typed");
    inDoc(combobox);
  });

  test("pointerdown without hover does not produce an undefined value", async () => {
    const props = $state({ options: new Set(["red", "green", "blue"]), value: "", expanded: true });
    const { getByRole, getAllByRole } = render(ComboBox, props);
    const items = getAllByRole("option");

    await fireEvent.pointerDown(items[1]);

    expect(props.value).toBe("");
    val(getByRole("combobox") as HTMLInputElement, "");

    await userEvent.click(items[2]);

    expect(props.value).toBe("blue");
    expect(typeof props.value).toBe("string");
  });

  test("empty options do not render a combobox", () => {
    const { queryByRole } = render(ComboBox, { options: new Set<string>() });

    expect(queryByRole("combobox")).toBeNull();
  });

  test("user callbacks fire alongside internal handlers", async () => {
    const oninput = vi.fn();
    const onkeydown = vi.fn();
    const onfocus = vi.fn();
    const onblur = vi.fn();
    const onclick = vi.fn();
    const { getByRole } = render(ComboBox, {
      options: new Set(["apple", "banana"]),
      onclick,
      oninput,
      onkeydown,
      onfocus,
      onblur,
    });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("a");
    await fireEvent.blur(combobox);

    expect(onfocus).toHaveBeenCalled();
    expect(onclick).toHaveBeenCalled();
    expect(oninput).toHaveBeenCalled();
    expect(onkeydown).toHaveBeenCalled();
    expect(onblur).toHaveBeenCalled();
    attr(combobox, "aria-expanded", "false");
  });

  test("document scroll closes the listbox", async () => {
    const { getByRole } = render(ComboBox, { options: new Set(["a", "b"]), expanded: true });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await fireEvent.scroll(document);

    attr(combobox, "aria-expanded", "false");
  });
});

describe("Form behavior", () => {
  test("selecting with Enter does not submit a wrapping form", async () => {
    const props = $state({ options: new Set(["apple", "banana"]), value: "" });
    const form = document.createElement("form");
    const onsubmit = vi.fn((ev: SubmitEvent) => ev.preventDefault());
    const keydowns: KeyboardEvent[] = [];
    form.addEventListener("submit", onsubmit);
    form.addEventListener("keydown", (ev) => keydowns.push(ev as KeyboardEvent));
    document.body.append(form);
    const { container, getByRole, unmount } = render(ComboBox, props);
    form.append(container);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(props.value).toBe("apple");
    expect(onsubmit).not.toHaveBeenCalled();
    expect(keydowns.at(-1)?.defaultPrevented).toBe(true);

    unmount();
    form.remove();
  });

  test("Enter with no active selection is not prevented", async () => {
    const form = document.createElement("form");
    const keydowns: KeyboardEvent[] = [];
    form.addEventListener("submit", (ev) => ev.preventDefault());
    form.addEventListener("keydown", (ev) => keydowns.push(ev as KeyboardEvent));
    document.body.append(form);
    const { container, getByRole, unmount } = render(ComboBox, { options: new Set(["apple", "banana"]) });
    form.append(container);
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    await userEvent.keyboard("{Enter}");

    expect(keydowns.at(-1)?.defaultPrevented).toBe(false);

    unmount();
    form.remove();
  });
});

describe("Extra snippet", () => {
  test("renders and receives expanded and variant args", async () => {
    const extrafn = createRawSnippet((expanded: () => boolean, variant: () => string) => {
      return { render: () => `<span data-testid="combo-extra">${expanded()}:${variant()}</span>` };
    });
    const extra = vi.fn().mockImplementation(extrafn);
    const { getByRole, getByTestId } = render(ComboBox, {
      options: new Set(["apple", "banana"]),
      extra,
      variant: VARIANT.ACTIVE,
    });
    const combobox = getByRole("combobox") as HTMLInputElement;

    inDoc(combobox.parentElement?.querySelector(`.${PARTS.EXTRA}`));
    txt(getByTestId("combo-extra"), `false:${VARIANT.ACTIVE}`);

    await userEvent.click(combobox);

    const expanded = extra.mock.calls[0]?.[1] as (() => boolean) | undefined;
    const variant = extra.mock.calls[0]?.[2] as (() => string) | undefined;
    expect(expanded?.()).toBe(true);
    expect(variant?.()).toBe(VARIANT.ACTIVE);
  });
});

describe("Active option visibility", () => {
  const options = new Set(["apple", "banana", "cherry", "date"]);

  test("scrollIntoView is called for the active option on keyboard navigation", async () => {
    const scroll = mockScrollIntoView();
    try {
      const { getByRole } = render(ComboBox, { options });
      const combobox = getByRole("combobox") as HTMLInputElement;

      combobox.focus();
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");

      const items = within(getByRole("listbox")).getAllByRole("option");
      const active = items.find((item) => item.getAttribute("aria-selected") === "true");
      expect(scroll.spy).toHaveBeenCalled();
      expect(scroll.spy.mock.contexts.at(-1)).toBe(active);
    } finally {
      scroll.restore();
    }
  });

  test("scrollIntoView is not called while collapsed", () => {
    const scroll = mockScrollIntoView();
    try {
      render(ComboBox, { options });

      expect(scroll.spy).not.toHaveBeenCalled();
    } finally {
      scroll.restore();
    }
  });

  test("hover updates active option and keeps it visible", async () => {
    const scroll = mockScrollIntoView();
    try {
      const { getAllByRole } = render(ComboBox, { options, expanded: true });
      const items = getAllByRole("option");

      await userEvent.hover(items[2]);

      attr(items[2], "aria-selected", "true");
      expect(scroll.spy).toHaveBeenCalled();
    } finally {
      scroll.restore();
    }
  });

  test("opening with an existing value scrolls the active option into view", async () => {
    const scroll = mockScrollIntoView();
    try {
      const { getByRole, getAllByRole } = render(ComboBox, { options, value: "cherry" });
      const combobox = getByRole("combobox") as HTMLInputElement;

      await userEvent.click(combobox);

      const items = getAllByRole("option");
      attr(items[2], "aria-selected", "true");
      expect(scroll.spy).toHaveBeenCalledWith({ block: "nearest" });
      expect(scroll.spy.mock.contexts.at(-1)).toBe(items[2]);
    } finally {
      scroll.restore();
    }
  });
});

describe("Overflow detection on open", () => {
  const options = new Set(["apple", "banana", "cherry"]);

  test("opening still renders the listbox and does not throw with reset overflow", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);

    const listbox = getByRole("listbox") as HTMLUListElement;
    attr(combobox, "aria-expanded", "true");
    style(listbox, "visibility", "visible");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
  });

  test("re-open after close still opens cleanly", async () => {
    const { getByRole } = render(ComboBox, { options });
    const combobox = getByRole("combobox") as HTMLInputElement;

    await userEvent.click(combobox);
    attr(combobox, "aria-expanded", "true");
    expect(within(getByRole("listbox")).getAllByRole("option")).toHaveLength(3);

    await fireEvent.blur(combobox);
    await userEvent.click(combobox);

    attr(combobox, "aria-expanded", "true");
    expect(within(getByRole("listbox")).getAllByRole("option")).toHaveLength(3);
  });
});
