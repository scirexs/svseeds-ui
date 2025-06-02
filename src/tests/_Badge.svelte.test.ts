import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Badge from "../lib/_svseeds/_Badge.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

const children = createRawSnippet(() => {
  return { render: () => `Badge Content` };
});

const leftid = "test-left";
const rightid = "test-right";

const leftfn = createRawSnippet((status: () => string) => {
  return { render: () => `<span data-testid="${leftid}">Left: ${status()}</span>` };
});

const rightfn = createRawSnippet((status: () => string) => {
  return { render: () => `<span data-testid="${rightid}">Right: ${status()}</span>` };
});

describe("Badge component rendering", () => {
  test("minimal props - plain type", () => {
    const { container } = render(Badge, { children });
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.tagName).toBe("SPAN");
    expect(badge.textContent).toContain("Badge Content");
  });

  test("type=link with href", () => {
    const href = "https://example.com";
    const { container } = render(Badge, { children, type: "link", href });
    const badge = container.firstElementChild as HTMLAnchorElement;
    expect(badge.tagName).toBe("A");
    expect(badge).toHaveAttribute("href", href);
    expect(badge.textContent).toContain("Badge Content");
  });

  test("with left snippet", () => {
    const { getByTestId, container } = render(Badge, {
      children,
      left: leftfn,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = getByTestId(leftid);
    expect(badge.textContent).toContain("Left:");
    expect(badge.textContent).toContain("Badge Content");
    expect(leftElement.textContent).toContain(STATE.NEUTRAL);
  });

  test("with right snippet", () => {
    const { getByTestId, container } = render(Badge, {
      children,
      right: rightfn,
    });
    const badge = container.firstElementChild as HTMLElement;
    const rightElement = getByTestId(rightid);
    expect(badge.textContent).toContain("Right:");
    expect(badge.textContent).toContain("Badge Content");
    expect(rightElement.textContent).toContain(STATE.NEUTRAL);
  });

  test("with both left and right snippets", () => {
    const { getByTestId, container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = getByTestId(leftid);
    const rightElement = getByTestId(rightid);
    expect(badge.textContent).toContain("Left:");
    expect(badge.textContent).toContain("Badge Content");
    expect(badge.textContent).toContain("Right:");
    expect(leftElement.textContent).toContain(STATE.NEUTRAL);
    expect(rightElement.textContent).toContain(STATE.NEUTRAL);
  });
});

describe("Badge interactive behavior", () => {
  test("type=left with left snippet as button", async () => {
    const onclick = vi.fn();
    const { getByTestId } = render(Badge, {
      children,
      left: leftfn,
      type: "left",
      onclick,
    });
    const leftButton = getByTestId(leftid).parentElement as HTMLButtonElement;
    expect(leftButton.tagName).toBe("BUTTON");

    const user = userEvent.setup();
    await user.click(leftButton);
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test("type=right with right snippet as button", async () => {
    const onclick = vi.fn();
    const { getByTestId } = render(Badge, {
      children,
      right: rightfn,
      type: "right",
      onclick,
    });
    const rightButton = getByTestId(rightid).parentElement as HTMLButtonElement;
    expect(rightButton.tagName).toBe("BUTTON");

    const user = userEvent.setup();
    await user.click(rightButton);
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test("type=left with right snippet as span (not button)", () => {
    const { getByTestId } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
      type: "left",
    });
    const leftElement = getByTestId(leftid).parentElement as HTMLElement;
    const rightElement = getByTestId(rightid).parentElement as HTMLElement;
    expect(leftElement.tagName).toBe("BUTTON");
    expect(rightElement.tagName).toBe("SPAN");
  });
});

describe("Badge status and styling", () => {
  const seed = "svs-badge";

  test("custom status binding", () => {
    const props = $state({
      children,
      status: STATE.ACTIVE,
    });
    const { container } = render(Badge, props);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass(seed, PARTS.WHOLE, STATE.ACTIVE);
  });

  test("status initialization", () => {
    const props = $state({
      children,
      status: "",
    });
    const { container } = render(Badge, props);
    const badge = container.firstElementChild as HTMLElement;
    expect(props.status).toBe(STATE.NEUTRAL);
    expect(badge).toHaveClass(seed, PARTS.WHOLE, STATE.NEUTRAL);
  });

  test("default class structure", () => {
    const { container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = badge.querySelector(`span[data-testid="${leftid}"]`)?.parentElement;
    const mainElement = badge.querySelector(`.${seed}.${PARTS.MAIN}`);
    const rightElement = badge.querySelector(`span[data-testid="${rightid}"]`)?.parentElement;

    expect(badge).toHaveClass(seed, PARTS.WHOLE, STATE.NEUTRAL);
    expect(leftElement).toHaveClass(seed, PARTS.LEFT, STATE.NEUTRAL);
    expect(mainElement).toHaveClass(seed, PARTS.MAIN, STATE.NEUTRAL);
    expect(rightElement).toHaveClass(seed, PARTS.RIGHT, STATE.NEUTRAL);
  });

  test("string style classes", () => {
    const customStyle = "custom-badge";
    const { container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
      style: customStyle,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = badge.querySelector(`span[data-testid="${leftid}"]`)?.parentElement;
    const mainElement = badge.querySelector(`.${customStyle}.${PARTS.MAIN}`);
    const rightElement = badge.querySelector(`span[data-testid="${rightid}"]`)?.parentElement;

    expect(badge).toHaveClass(customStyle, PARTS.WHOLE, STATE.NEUTRAL);
    expect(leftElement).toHaveClass(customStyle, PARTS.LEFT, STATE.NEUTRAL);
    expect(mainElement).toHaveClass(customStyle, PARTS.MAIN, STATE.NEUTRAL);
    expect(rightElement).toHaveClass(customStyle, PARTS.RIGHT, STATE.NEUTRAL);
  });

  const dynObj = {
    base: "base-class",
    neutral: "neutral-class",
    active: "active-class",
    inactive: "inactive-class",
  };
  const style = {
    whole: dynObj,
    main: dynObj,
    left: dynObj,
    right: dynObj,
  };
  // test("object style with each status", async () => {
  //   const props = $state({
  //     children,
  //     left: leftfn,
  //     right: rightfn,
  //     status: "",
  //     style,
  //   });

  //   const { container } = render(Badge, props);
  //   const badge = container.firstElementChild as HTMLElement;
  //   const leftElement = badge.querySelector(`span[data-testid="${leftid}"]`)?.parentElement;
  //   const mainElement = badge.querySelector(`.${dynObj.base}.${dynObj.neutral}`);
  //   const rightElement = badge.querySelector(`span[data-testid="${rightid}"]`)?.parentElement;

  //   expect(badge).toHaveClass(dynObj.base, dynObj.neutral);
  //   expect(leftElement).toHaveClass(dynObj.base, dynObj.neutral);
  //   expect(mainElement).toHaveClass(dynObj.base, dynObj.neutral);
  //   expect(rightElement).toHaveClass(dynObj.base, dynObj.neutral);

  //   props.status = STATE.ACTIVE;
  //   await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update
  //   expect(badge).toHaveClass(dynObj.base, dynObj.active);
  //   expect(leftElement).toHaveClass(dynObj.base, dynObj.active);
  //   expect(rightElement).toHaveClass(dynObj.base, dynObj.active);

  //   props.status = STATE.INACTIVE;
  //   await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update
  //   expect(badge).toHaveClass(dynObj.base, dynObj.inactive);
  // });
  test("object style with neutral status", () => {
    const { container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
      status: "",
      style,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = badge.querySelector(`span[data-testid="${leftid}"]`)?.parentElement;
    const mainElement = badge.querySelector(`.${dynObj.base}.${dynObj.neutral}`);
    const rightElement = badge.querySelector(`span[data-testid="${rightid}"]`)?.parentElement;

    expect(badge).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftElement).toHaveClass(dynObj.base, dynObj.neutral);
    expect(mainElement).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightElement).toHaveClass(dynObj.base, dynObj.neutral);
  });
  test("object style with active status", () => {
    const { container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
      status: STATE.ACTIVE,
      style,
    });
    const badge = container.firstElementChild as HTMLElement;
    const leftElement = badge.querySelector(`span[data-testid="${leftid}"]`)?.parentElement;
    const rightElement = badge.querySelector(`span[data-testid="${rightid}"]`)?.parentElement;

    expect(badge).toHaveClass(dynObj.base, dynObj.active);
    expect(leftElement).toHaveClass(dynObj.base, dynObj.active);
    expect(rightElement).toHaveClass(dynObj.base, dynObj.active);
  });
  test("object style with inactive status", () => {
    const props = $state();

    const { container } = render(Badge, {
      children,
      left: leftfn,
      right: rightfn,
      status: STATE.INACTIVE,
      style,
    });
    const badge = container.firstElementChild as HTMLElement;

    // Inactive state
    expect(badge).toHaveClass(dynObj.base, dynObj.inactive);
  });
});

describe("Badge edge cases", () => {
  test("empty href for link type", () => {
    const { container } = render(Badge, {
      children,
      type: "link",
    });
    const badge = container.firstElementChild as HTMLAnchorElement;
    expect(badge.tagName).toBe("A");
    expect(badge).toHaveAttribute("href", "");
  });

  test("onclick without button type", () => {
    const onclick = vi.fn();
    const { container } = render(Badge, {
      children,
      onclick,
    });
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.tagName).toBe("SPAN");
    // onclick only runs with button, not runs with span
  });

  test("left snippet without type=left renders as span", () => {
    const { getByTestId } = render(Badge, {
      children,
      left: leftfn,
    });
    const leftElement = getByTestId(leftid).parentElement as HTMLElement;
    expect(leftElement.tagName).toBe("SPAN");
  });

  test("right snippet without type=right renders as span", () => {
    const { getByTestId } = render(Badge, {
      children,
      right: rightfn,
    });
    const rightElement = getByTestId(rightid).parentElement as HTMLElement;
    expect(rightElement.tagName).toBe("SPAN");
  });
});
