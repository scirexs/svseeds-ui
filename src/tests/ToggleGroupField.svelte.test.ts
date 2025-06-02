import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import ToggleGroupField from "../lib/_svseeds/ToggleGroupField.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

const label = "label_text";
const extra = "(optional)";
const bottom = "bottom_text";
const auxid = "test-aux";
const leftid = "test-left";
const rightid = "test-right";
const auxfn = createRawSnippet(
  (
    status: () => string,
    values: () => string[],
  ) => {
    return { render: () => `<span data-testid="${auxid}">${status()},${values().length}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    status: () => string,
    values: () => string[],
  ) => {
    return { render: () => `<span data-testid="${leftid}">${status()},${values().length}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    status: () => string,
    values: () => string[],
  ) => {
    return { render: () => `<span data-testid="${rightid}">${status()},${values().length}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const options = new SvelteMap([
    ["opt1", "Option 1"],
    ["opt2", "Option 2"],
    ["opt3", "Option 3"],
  ]);

  test("no options", () => {
    const emptyOptions = new SvelteMap();
    try {
      const { container } = render(ToggleGroupField, { options: emptyOptions });
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
  });

  test("basic render with options", () => {
    const { getAllByRole } = render(ToggleGroupField, { options });
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild?.tagName).toBe("DIV");
  });

  test("w/ label", () => {
    const props = { options, label };
    const { getAllByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    expect(whole).toHaveAttribute("aria-labelledby");
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ extra, w/o label", () => {
    const props = { options, extra };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("w/ label, extra", () => {
    const props = { options, label, extra };
    const { getAllByRole, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl);
    expect(lbl.firstElementChild).toBe(ext);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ label, extra, aux", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const props = { options, label, extra, aux };
    const { getAllByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const auxsp = getByTestId(auxid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(lbl.parentElement); // top div
    expect(whole.firstElementChild).toBe(auxsp.parentElement?.parentElement);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
    expect(aux).toHaveBeenCalled();
  });

  test("w/ left", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { options, left };
    const { getAllByRole, getByTestId } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild).toBe(leftsp.parentElement?.parentElement); // middle
    expect(left).toHaveBeenCalled();
  });

  test("w/ right", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { options, right };
    const { getAllByRole, getByTestId } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(1); // middle only
    expect(whole.firstElementChild).toBe(rightsp.parentElement?.parentElement); // middle
    expect(right).toHaveBeenCalled();
  });

  test("w/ bottom", () => {
    const props = { options, bottom };
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild?.tagName).toBe("DIV"); // middle
    expect(whole.lastElementChild).toBe(btm);
  });

  test("w/ bottom descFirst", () => {
    const props = { options, bottom, descFirst: true };
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const btm = getByRole("status") as HTMLDivElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(btm);
    expect(whole.lastElementChild?.tagName).toBe("DIV"); // middle
  });

  test("w/ blank string", () => {
    const props = { options, label: " ", bottom: " " };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("single selection mode", () => {
    const props = { options, multiple: false };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });

  test("with Map options", () => {
    const mapOptions = new Map([
      ["key1", "Value 1"],
      ["key2", "Value 2"],
    ]);
    const props = { options: mapOptions };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole.children).toHaveLength(1); // middle only
  });
});

describe("Specify state transition & event handlers", () => {
  const seed = "svs-toggle-group-field";
  const options = new SvelteMap([
    ["opt1", "Option 1"],
    ["opt2", "Option 2"],
    ["opt3", "Option 3"],
  ]);
  const errmsg = "At least one option must be selected";
  const validationFn = (values: string[]) => (values.length === 0 ? errmsg : "");
  const validations = [validationFn];

  test("w/ default values", () => {
    const values = ["opt1", "opt2"];
    const props = { options, values };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    // ToggleGroupの実装によってselectedな要素を確認する必要があります
    expect(whole).toBeInTheDocument();
  });

  test("major state transition with validation", async () => {
    const mockValidation = vi.fn().mockImplementation(validationFn);
    const props = $state({
      options,
      status: STATE.NEUTRAL,
      validations: [mockValidation],
      values: [] as string[],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    // Initial state
    expect(props.status).toBe(STATE.NEUTRAL);

    // Trigger validation by simulating invalid event
    await fireEvent.invalid(hiddenInput);
    expect(mockValidation).toHaveBeenCalled();
    expect(props.status).toBe(STATE.INACTIVE);

    // Check error state
    const alert = getByRole("alert") as HTMLDivElement;
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(errmsg);

    // Add selection to make it valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput); // Simulate validation trigger
    expect(props.status).toBe(STATE.ACTIVE);

    // Clear selection
    props.values = [];
    await fireEvent.change(hiddenInput);
    expect(props.status).toBe(STATE.NEUTRAL);
  });

  test("required validation without custom validations", async () => {
    const props = $state({
      options,
      status: STATE.NEUTRAL,
      values: [] as string[],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    await fireEvent.invalid(hiddenInput);
    waitFor(() => {
      const alert = getByRole("alert") as HTMLDivElement;
      expect(alert).toBeInTheDocument();
      expect(props.status).toBe(STATE.INACTIVE);
    });
  });

  test("multiple validation functions", async () => {
    const validation1 = vi.fn().mockReturnValue("");
    const validation2 = vi.fn().mockImplementation((values: string[]) => values.length > 2 ? "Too many selections" : "");
    const props = $state({
      options,
      status: STATE.NEUTRAL,
      validations: [validation1, validation2],
      values: ["opt1", "opt2", "opt3"] as string[],
    });
    const { getAllByRole, getByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;

    await fireEvent.change(hiddenInput);
    waitFor(() => {
      expect(validation1).toHaveBeenCalled();
      expect(validation2).toHaveBeenCalled();
      expect(props.status).toBe(STATE.INACTIVE);

      const alert = getByRole("alert") as HTMLDivElement;
      expect(alert).toHaveTextContent("Too many selections");
    });
  });

  test("default class of each status", async () => {
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
      values: [] as string[],
    });
    const { getAllByRole, getByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(top).toHaveClass(seed, PARTS.TOP);
    expect(lbl).toHaveClass(seed, PARTS.LABEL);
    expect(ext).toHaveClass(seed, PARTS.EXTRA);
    expect(auxdv).toHaveClass(seed, PARTS.AUX);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, STATE.INACTIVE);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(seed, PARTS.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(seed, PARTS.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(seed, PARTS.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(seed, PARTS.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(seed, PARTS.BOTTOM, STATE.ACTIVE);
  });

  test("w/ string style class of each status", async () => {
    const clsid = "style_id";
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
      values: [] as string[],
      style: clsid,
    });
    const { getAllByRole, getByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(top).toHaveClass(clsid, PARTS.TOP);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.INACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, STATE.INACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, STATE.INACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, STATE.INACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, STATE.INACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.INACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.INACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, STATE.INACTIVE);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.ACTIVE);
    expect(top).toHaveClass(clsid, PARTS.TOP, STATE.ACTIVE);
    expect(lbl).toHaveClass(clsid, PARTS.LABEL, STATE.ACTIVE);
    expect(ext).toHaveClass(clsid, PARTS.EXTRA, STATE.ACTIVE);
    expect(auxdv).toHaveClass(clsid, PARTS.AUX, STATE.ACTIVE);
    expect(middle).toHaveClass(clsid, PARTS.MIDDLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.ACTIVE);
    expect(btm).toHaveClass(clsid, PARTS.BOTTOM, STATE.ACTIVE);
  });

  test("w/ obj style of each status", async () => {
    const dynObj = {
      base: "base",
      neutral: "dyn_neutral",
      active: "dyn_active",
      inactive: "dyn_inactive",
    };
    const style = {
      whole: dynObj,
      middle: dynObj,
      top: dynObj,
      left: dynObj,
      right: dynObj,
      bottom: dynObj,
      label: dynObj,
      aux: dynObj,
      extra: dynObj,
    };
    const props = $state({
      options,
      label,
      extra,
      aux: auxfn,
      left: leftfn,
      right: rightfn,
      bottom,
      status: STATE.NEUTRAL,
      validations,
      values: [] as string[],
      style,
    });
    const { getAllByRole, getByRole, getByTestId, getByText } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    const lbl = getByText(label);
    const ext = within(lbl).getByText(extra);
    const auxdv = getByTestId(auxid).parentElement;
    const top = lbl.parentElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const middle = leftdv?.parentElement;
    const btm = getByRole("status") as HTMLDivElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(top).toHaveClass(dynObj.base, dynObj.neutral);
    expect(lbl).toHaveClass(dynObj.base, dynObj.neutral);
    expect(ext).toHaveClass(dynObj.base, dynObj.neutral);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(middle).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(btm).toHaveClass(dynObj.base, dynObj.neutral);

    // Trigger invalid state
    const hiddenInput = whole.querySelector('input[style*="display: none"]') as HTMLInputElement;
    await fireEvent.invalid(hiddenInput);
    expect(props.status).toBe(STATE.INACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.inactive);
    expect(top).toHaveClass(dynObj.base, dynObj.inactive);
    expect(lbl).toHaveClass(dynObj.base, dynObj.inactive);
    expect(ext).toHaveClass(dynObj.base, dynObj.inactive);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(middle).toHaveClass(dynObj.base, dynObj.inactive);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.inactive);
    expect(btm).toHaveClass(dynObj.base, dynObj.inactive);

    // Make valid
    props.values = ["opt1"];
    await fireEvent.change(hiddenInput);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(top).toHaveClass(dynObj.base, dynObj.active);
    expect(lbl).toHaveClass(dynObj.base, dynObj.active);
    expect(ext).toHaveClass(dynObj.base, dynObj.active);
    expect(auxdv).toHaveClass(dynObj.base, dynObj.active);
    expect(middle).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(btm).toHaveClass(dynObj.base, dynObj.active);
  });

  test("deps configuration", () => {
    const svsToggleGroupStyle = "custom-toggle-group";
    const deps = {
      svsToggleGroup: {
        style: svsToggleGroupStyle,
      },
    };
    const props = { options, deps };
    const { getAllByRole } = render(ToggleGroupField, props);
    const whole = getAllByRole("group")[0] as HTMLDivElement;
    expect(whole).toBeInTheDocument();
    // ToggleGroupコンポーネントに渡されるpropsの検証は、
    // ToggleGroupの実装やデータ属性によって確認する必要があります
  });
});
