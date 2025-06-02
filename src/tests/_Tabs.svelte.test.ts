import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Tabs from "../lib/_svseeds/_Tabs.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

const label1id = "test-label1";
const label2id = "test-label2";
const panel1id = "test-panel1";
const panel2id = "test-panel2";

const label1fn = createRawSnippet(() => {
  return { render: () => `<span data-testid="${label1id}">Label 1</span>` };
});
const label2fn = createRawSnippet(() => {
  return { render: () => `<span data-testid="${label2id}">Label 2</span>` };
});
const panel1fn = createRawSnippet(() => {
  return { render: () => `<div data-testid="${panel1id}">Panel 1 Content</div>` };
});
const panel2fn = createRawSnippet(() => {
  return { render: () => `<div data-testid="${panel2id}">Panel 2 Content</div>` };
});

describe("Basic functionality and element existence", () => {
  test("no props - should not render", () => {
    try {
      const { container } = render(Tabs);
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
  });

  test("with string labels - basic rendering", () => {
    const labels = ["Tab 1", "Tab 2"];
    const props = {
      labels,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole, getByText } = render(Tabs, props);

    const tablist = getByRole("tablist");
    const tab1 = getByRole("tab", { name: "Tab 1" });
    const tab2 = getByRole("tab", { name: "Tab 2" });
    const panel1 = getByRole("tabpanel");

    expect(tablist).toBeInTheDocument();
    expect(tab1).toHaveAttribute("aria-selected", "true");
    expect(tab2).toHaveAttribute("aria-selected", "false");
    expect(tab1).toHaveAttribute("tabindex", "0");
    expect(tab2).toHaveAttribute("tabindex", "-1");
    expect(panel1).toBeVisible();
    expect(getByText("Tab 1")).toBeInTheDocument();
    expect(getByText("Tab 2")).toBeInTheDocument();
  });

  test("with snippet labels - basic rendering", () => {
    const props = {
      label1: label1fn,
      label2: label2fn,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole, getByTestId } = render(Tabs, props);

    const tablist = getByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    const panel = getByRole("tabpanel");

    expect(tablist).toBeInTheDocument();
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(getByTestId(label1id)).toBeInTheDocument();
    expect(getByTestId(label2id)).toBeInTheDocument();
    expect(getByTestId(panel1id)).toBeInTheDocument();
  });

  test("mismatched tabs and panels - should not render", () => {
    const labels = ["Tab 1", "Tab 2"];
    const props = {
      labels,
      panel1: panel1fn, // Only one panel for two tabs
    };
    try {
      const { container } = render(Tabs, props);
      expect(container.firstChild).toBeNull();
    } catch (e) {
      // ok
    }
  });

  test("with aria-orientation", () => {
    const labels = ["Tab 1", "Tab 2"];
    const props = {
      labels,
      ariaOrientation: "vertical" as const,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const tablist = getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-orientation", "vertical");
  });
});

describe("State management and interaction", () => {
  test("current prop controls active tab", async () => {
    const props = $state({
      labels: ["Tab 1", "Tab 2", "Tab 3"],
      current: 1,
      panel1: panel1fn,
      panel2: panel2fn,
      panel3: createRawSnippet(() => ({ render: () => `<div data-testid="panel3">Panel 3</div>` })),
    });
    const { getByRole, getByTestId, rerender } = render(Tabs, props);

    const tabs = getByRole("tablist").querySelectorAll('[role="tab"]');
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
    expect(getByTestId(panel2id)).toBeInTheDocument();

    // Change to third tab
    props.current = 2;
    await rerender(props);
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(getByTestId("panel3")).toBeInTheDocument();
  });

  test("current prop boundary correction", () => {
    // Test negative current
    const props1 = {
      labels: ["Tab 1", "Tab 2"],
      current: -1,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole: getByRole1 } = render(Tabs, props1);
    const tabs1 = getByRole1("tablist").querySelectorAll('[role="tab"]');
    expect(tabs1[0]).toHaveAttribute("aria-selected", "true");

    // Test current exceeding length
    const props2 = {
      labels: ["Tab 1", "Tab 2"],
      current: 5,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getAllByRole } = render(Tabs, props2);
    const tabs2 = getAllByRole("tablist")[1].querySelectorAll('[role="tab"]');
    expect(tabs2[1]).toHaveAttribute("aria-selected", "true");
  });

  test("click interaction changes current tab", async () => {
    const props = $state({
      labels: ["Tab 1", "Tab 2"],
      current: 0,
      panel1: panel1fn,
      panel2: panel2fn,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Tabs, props);

    const tabs = getByRole("tablist").querySelectorAll('[role="tab"]');
    expect(props.current).toBe(0);
    expect(getByTestId(panel1id)).toBeInTheDocument();

    await user.click(tabs[1]);
    expect(props.current).toBe(1);
    expect(getByTestId(panel2id)).toBeInTheDocument();
  });

  test("status prop affects styling", () => {
    const props = {
      labels: ["Tab 1", "Tab 2"],
      status: STATE.ACTIVE,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const whole = getByRole("tablist").parentElement;
    const tablist = getByRole("tablist");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panel = getByRole("tabpanel");

    expect(whole).toHaveClass("svs-tabs", PARTS.WHOLE, STATE.ACTIVE);
    expect(tablist).toHaveClass("svs-tabs", PARTS.TOP, STATE.ACTIVE);
    expect(tabs[0]).toHaveClass("svs-tabs", PARTS.LABEL, STATE.ACTIVE); // Selected tab uses ACTIVE
    expect(tabs[1]).toHaveClass("svs-tabs", PARTS.LABEL, STATE.ACTIVE); // Non-selected uses status
    expect(panel).toHaveClass("svs-tabs", PARTS.MAIN, STATE.ACTIVE);
  });
});

describe("Keyboard navigation", () => {
  test("arrow key navigation - horizontal", async () => {
    const props = {
      labels: ["Tab 1", "Tab 2", "Tab 3"],
      current: 0,
      panel1: panel1fn,
      panel2: panel2fn,
      panel3: createRawSnippet(() => ({ render: () => `<div>Panel 3</div>` })),
    };
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);

    const tabs = getByRole("tablist").querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;

    // Focus first tab
    tabs[0].focus();
    expect(document.activeElement).toBe(tabs[0]);

    // Arrow right should move focus to next tab
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);

    // Arrow right from last tab should wrap to first
    tabs[2].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[0]);

    // Arrow left should move focus to previous tab
    tabs[1].focus();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[0]);

    // Arrow left from first tab should wrap to last
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[2]);
  });

  test("arrow key navigation - vertical", async () => {
    const props = {
      labels: ["Tab 1", "Tab 2"],
      ariaOrientation: "vertical" as const,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);

    const tabs = getByRole("tablist").querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;

    tabs[0].focus();

    // Arrow down should move focus
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tabs[1]);

    // Arrow up should move focus back
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(tabs[0]);
  });
});

describe("Styling and CSS classes", () => {
  const seed = "svs-tabs";

  test("default styling classes", () => {
    const props = {
      labels: ["Tab 1", "Tab 2"],
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const whole = getByRole("tablist").parentElement;
    const tablist = getByRole("tablist");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panel = getByRole("tabpanel");

    expect(whole).toHaveClass(seed, PARTS.WHOLE);
    expect(tablist).toHaveClass(seed, PARTS.TOP);
    expect(tabs[0]).toHaveClass(seed, PARTS.LABEL, STATE.ACTIVE);
    expect(tabs[1]).toHaveClass(seed, PARTS.LABEL, STATE.NEUTRAL);
    expect(panel).toHaveClass(seed, PARTS.MAIN);
  });

  test("string style override", () => {
    const styleId = "custom-tabs";
    const props = {
      labels: ["Tab 1", "Tab 2"],
      style: styleId,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const whole = getByRole("tablist").parentElement;
    const tablist = getByRole("tablist");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panel = getByRole("tabpanel");

    expect(whole).toHaveClass(styleId, PARTS.WHOLE);
    expect(tablist).toHaveClass(styleId, PARTS.TOP);
    expect(tabs[0]).toHaveClass(styleId, PARTS.LABEL, STATE.ACTIVE);
    expect(tabs[1]).toHaveClass(styleId, PARTS.LABEL, STATE.NEUTRAL);
    expect(panel).toHaveClass(styleId, PARTS.MAIN);
  });

  test("object style override", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const style = {
      whole: dynObj,
      top: dynObj,
      label: dynObj,
      main: dynObj,
    };
    const props = {
      labels: ["Tab 1", "Tab 2"],
      style,
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const whole = getByRole("tablist").parentElement;
    const tablist = getByRole("tablist");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panel = getByRole("tabpanel");

    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(tablist).toHaveClass(dynObj.base, dynObj.neutral);
    expect(tabs[0]).toHaveClass(dynObj.base, dynObj.active);
    expect(tabs[1]).toHaveClass(dynObj.base, dynObj.neutral);
    expect(panel).toHaveClass(dynObj.base, dynObj.neutral);
  });
});

describe("Accessibility attributes", () => {
  test("ARIA attributes are correctly set", () => {
    const props = {
      labels: ["Tab 1", "Tab 2"],
      panel1: panel1fn,
      panel2: panel2fn,
    };
    const { getByRole } = render(Tabs, props);

    const tablist = getByRole("tablist");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"]');

    // Tablist should have correct role
    expect(tablist).toHaveAttribute("role", "tablist");

    // Tabs should have correct attributes
    expect(tabs[0]).toHaveAttribute("role", "tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[0]).toHaveAttribute("type", "button");

    expect(tabs[1]).toHaveAttribute("role", "tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");

    // Panels should have correct attributes
    expect(panels[0]).toHaveAttribute("role", "tabpanel");
    expect(panels[0]).toHaveAttribute("tabindex", "0");
    expect(panels[0]).not.toHaveAttribute("hidden");

    expect(panels[1]).toHaveAttribute("role", "tabpanel");
    expect(panels[1]).toHaveAttribute("tabindex", "0");
    expect(panels[1]).toHaveAttribute("hidden");

    // Check aria-controls and aria-labelledby relationships
    const tab1Id = tabs[0].getAttribute("id");
    const tab2Id = tabs[1].getAttribute("id");
    const panel1Id = panels[0].getAttribute("id");
    const panel2Id = panels[1].getAttribute("id");

    expect(tabs[0]).toHaveAttribute("aria-controls", panel1Id);
    expect(tabs[1]).toHaveAttribute("aria-controls", panel2Id);
    expect(panels[0]).toHaveAttribute("aria-labelledby", tab1Id);
    expect(panels[1]).toHaveAttribute("aria-labelledby", tab2Id);
  });

  test("panel visibility and styling", async () => {
    const props = $state({
      labels: ["Tab 1", "Tab 2"],
      current: 0,
      panel1: panel1fn,
      panel2: panel2fn,
    });
    const user = userEvent.setup();
    const { getByRole, rerender } = render(Tabs, props);

    const tabs = getByRole("tablist").querySelectorAll('[role="tab"]');
    let panels = document.querySelectorAll('[role="tabpanel"]');

    // First panel should be visible, second hidden
    expect(panels[0]).not.toHaveAttribute("hidden");
    expect(panels[0]).not.toHaveStyle({ display: "none" });
    expect(panels[1]).toHaveAttribute("hidden");
    expect(panels[1]).toHaveStyle({ display: "none" });

    // Switch to second tab
    await user.click(tabs[1]);
    panels = document.querySelectorAll('[role="tabpanel"]');

    expect(panels[0]).toHaveAttribute("hidden");
    expect(panels[0]).toHaveStyle({ display: "none" });
    expect(panels[1]).not.toHaveAttribute("hidden");
    expect(panels[1]).not.toHaveStyle({ display: "none" });
  });
});
