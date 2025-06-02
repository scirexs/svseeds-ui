import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
// import userEvent from "@testing-library/user-event"; // userEvent can also be used
import { createRawSnippet } from "svelte";
import Tooltip, { tooltip, tooltipAction, type TooltipProps } from "../lib/_svseeds/_Tooltip.svelte"; // Adjust path if needed
import { PARTS, STATE } from "../lib/_svseeds/core.ts"; // Adjust path if needed

// Helper to create a trigger element host for tooltip action
function setupTriggerHost() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host;
}

// Mock for the main slot
const mainSlotTestId = "main-slot-content";
const createMainSlotSnippet = (
  dynamicStatus: () => string,
  dynamicText: () => string,
  dynamicIsFlipped: () => boolean,
) =>
  createRawSnippet(
    () => {
      return {
        render: () =>
          `<div data-testid="${mainSlotTestId}">Status: ${dynamicStatus()}, Text: ${dynamicText()}, Flipped: ${dynamicIsFlipped()}</div>`,
      };
    },
  );

describe("Tooltip Basic Rendering and Props", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = setupTriggerHost();
    vi.useFakeTimers();
    // Mock getBoundingClientRect for predictable positioning for these basic tests if needed
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 50,
      y: 50,
      width: 100,
      height: 30,
      top: 50,
      left: 50,
      right: 150,
      bottom: 80,
      toJSON: () => ({ x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 }),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    host.remove();
    // Attempt to reset core state by ensuring any visible tooltip is hidden
    // This is an indirect way; a direct reset method on core would be cleaner.
    const triggerForCleanup = document.createElement("button"); // Dummy trigger
    host.appendChild(triggerForCleanup);
    fireEvent.pointerEnter(triggerForCleanup); // Make something potentially active
    vi.advanceTimersByTime(1000); // Let it show
    fireEvent.pointerLeave(triggerForCleanup); // Then hide it
    vi.advanceTimersByTime(100); // Let hide complete
    triggerForCleanup.remove();
    document.body.innerHTML = ""; // Final cleanup of DOM
  });

  test("no props - tooltip is not initially rendered", () => {
    render(Tooltip, { target: host });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // test("w/ name - tooltip uses name for id when rendered via an action", async () => {
  //   const tooltipName = "my-named-tooltip";
  //   const { container, getByRole } = render(Tooltip, { target: host, props: { name: tooltipName } });

  //   const tooltipElement = container.firstChild;
  //   const trigger = document.createElement("button");
  //   host.appendChild(trigger);
  //   const action = tooltip(trigger, { text: "Tooltip Text", delay: 0, name: tooltipName });

  //   await fireEvent.pointerEnter(trigger);
  //   vi.advanceTimersByTime(0); // Advance by delay

  //   // const tooltipElement = getByRole("tooltip");
  //   expect(tooltipElement).toHaveAttribute("id", tooltipName);

  //   action?.destroy?.();
  //   trigger.remove();
  // });

  // test("w/ main slot - renders content from slot when visible", async () => {
  //   const tooltipName = "slot-tooltip";
  //   const expectedText = "Slot Text Content";
  //   const currentStatus = STATE.NEUTRAL;
  //   const currentFlipped = false;

  //   const props: TooltipProps = {
  //     name: tooltipName,
  //     main: createMainSlotSnippet(
  //       () => currentStatus,
  //       () => expectedText, // core.text will be this due to action
  //       () => currentFlipped,
  //     ),
  //   };
  //   render(Tooltip, { target: host, props });

  //   const trigger = document.createElement("button");
  //   host.appendChild(trigger);
  //   const action = tooltip(trigger, { text: expectedText, delay: 0, name: tooltipName });

  //   await fireEvent.pointerEnter(trigger);
  //   vi.advanceTimersByTime(0);

  //   const tooltipElement = await screen.findByRole("tooltip");
  //   expect(tooltipElement).toBeInTheDocument();
  //   const slotContent = within(tooltipElement).getByTestId(mainSlotTestId);
  //   expect(slotContent).toHaveTextContent(`Status: ${currentStatus}, Text: ${expectedText}, Flipped: ${currentFlipped}`);

  //   action?.destroy?.();
  //   trigger.remove();
  // });

  // test("default status and style classes are applied", async () => {
  //   const tooltipName = "default-style-tooltip";
  //   const presetClass = "svs-tooltip"; // from component's module script
  //   render(Tooltip, { target: host, props: { name: tooltipName, status: STATE.NEUTRAL } });

  //   const trigger = document.createElement("button");
  //   host.appendChild(trigger);
  //   const action = tooltip(trigger, { text: "Default Style", delay: 0, name: tooltipName });

  //   await fireEvent.pointerEnter(trigger);
  //   vi.advanceTimersByTime(0);

  //   const tooltipElement = await screen.findByRole("tooltip");
  //   // Expected: "svs-tooltip whole neutral" (if fnClass behaves like example)
  //   expect(tooltipElement).toHaveClass(presetClass);
  //   expect(tooltipElement).toHaveClass(PARTS.WHOLE);
  //   expect(tooltipElement).toHaveClass(STATE.NEUTRAL); // status is part of the class list
  //   // More precise check for combined class if fnClass output is strictly `${rule} ${part} ${status}`
  //   expect(tooltipElement.className).toContain(`${presetClass} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);

  //   action?.destroy?.();
  //   trigger.remove();
  // });
});

// describe("Tooltip Action (`tooltip` and `tooltipAction`)", () => {
//   let host: HTMLElement;
//   let trigger: HTMLButtonElement;

//   beforeEach(() => {
//     host = setupTriggerHost();
//     trigger = document.createElement("button");
//     trigger.textContent = "Action Trigger";
//     host.appendChild(trigger);
//     vi.useFakeTimers();

//     HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
//       x: 50,
//       y: 50,
//       width: 100,
//       height: 30,
//       top: 50,
//       left: 50,
//       right: 150,
//       bottom: 80,
//       toJSON: () => ({ x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 }),
//     }));
//     vi.stubGlobal("innerWidth", 800);
//     vi.stubGlobal("innerHeight", 600);
//   });

//   afterEach(() => {
//     vi.clearAllTimers();
//     vi.restoreAllMocks();
//     host.remove();
//     document.body.innerHTML = "";
//   });

//   test("`tooltip` action shows tooltip on pointerenter and hides on pointerleave", async () => {
//     render(Tooltip, { target: host }); // Global tooltip renderer
//     const tooltipText = "Action Tooltip";
//     const delay = 100;
//     const action = tooltip(trigger, { text: tooltipText, delay });

//     expect(screen.queryByRole("tooltip")).toBeNull();

//     await fireEvent.pointerEnter(trigger);
//     vi.advanceTimersByTime(delay - 1);
//     expect(screen.queryByRole("tooltip")).toBeNull(); // Not yet visible

//     vi.advanceTimersByTime(1); // Meet the delay
//     const tooltipElement = await screen.findByRole("tooltip");
//     expect(tooltipElement).toBeInTheDocument();
//     expect(tooltipElement).toHaveTextContent(tooltipText);

//     await fireEvent.pointerLeave(trigger);
//     expect(screen.queryByRole("tooltip")).toBeNull(); // Should hide

//     action?.destroy?.();
//   });

//   test("`tooltip` action with `cursor: true` tracks pointermove", async () => {
//     render(Tooltip, { target: host });
//     const action = tooltip(trigger, { text: "Cursor Track", delay: 0, cursor: true });

//     await fireEvent.pointerEnter(trigger, { clientX: 100, clientY: 100 });
//     vi.advanceTimersByTime(0);
//     let tooltipElement = await screen.findByRole("tooltip");
//     const initialStyle = tooltipElement.getAttribute("style");

//     await fireEvent.pointerMove(trigger, { clientX: 150, clientY: 150 });
//     vi.advanceTimersByTime(20); // Throttle interval for pointermove in core

//     await waitFor(() => {
//       tooltipElement = screen.getByRole("tooltip"); // Re-query
//       expect(tooltipElement.getAttribute("style")).not.toBe(initialStyle);
//     });

//     action?.destroy?.();
//   });

//   test("`tooltipAction` factory function creates a working action", async () => {
//     render(Tooltip, { target: host });
//     const tooltipText = "Factory Action";
//     const delay = 50;
//     const actionFn = tooltipAction(tooltipText, delay);
//     const action = actionFn(trigger); // Apply to node

//     await fireEvent.pointerEnter(trigger);
//     vi.advanceTimersByTime(delay);
//     const tooltipElement = await screen.findByRole("tooltip");
//     expect(tooltipElement).toBeInTheDocument();
//     expect(tooltipElement).toHaveTextContent(tooltipText);

//     action?.destroy?.();
//   });
// });

// describe("Tooltip Positioning and Flipping", () => {
//   let host: HTMLElement;
//   let trigger: HTMLButtonElement;
//   const tooltipName = "pos-tooltip";

//   beforeEach(() => {
//     host = setupTriggerHost();
//     trigger = document.createElement("button");
//     host.appendChild(trigger);
//     vi.useFakeTimers();
//     vi.stubGlobal("innerWidth", 1000);
//     vi.stubGlobal("innerHeight", 800);
//   });

//   afterEach(() => {
//     vi.clearAllTimers();
//     vi.restoreAllMocks();
//     host.remove();
//     document.body.innerHTML = "";
//   });

//   async function showTooltipWithMocks(
//     tooltipProps: TooltipProps,
//     triggerRect: Partial<DOMRect>,
//     tooltipSize: { width: number; height: number },
//   ) {
//     HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
//       x: 0,
//       y: 0,
//       width: 0,
//       height: 0,
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       ...triggerRect,
//       toJSON: () => ({
//         x: 0,
//         y: 0,
//         width: 0,
//         height: 0,
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         ...triggerRect,
//       }),
//     }));

//     // const { component } = render(Tooltip, {
//     //   target: host,
//     //   props: { name: tooltipName, ...tooltipProps },
//     // });
//     const props = { name: tooltipName, ...tooltipProps };
//     const { component, rerender } = render(Tooltip, props);

//     const action = tooltip(trigger, { text: "Position Test", delay: 0, name: tooltipName });
//     await fireEvent.pointerEnter(trigger);
//     vi.advanceTimersByTime(0);
//     const tooltipElement = await screen.findByRole("tooltip");

//     // Mock tooltip's own dimensions
//     Object.defineProperty(tooltipElement, "offsetWidth", { configurable: true, value: tooltipSize.width });
//     Object.defineProperty(tooltipElement, "offsetHeight", { configurable: true, value: tooltipSize.height });

//     // Force a tick for Svelte to re-evaluate derived properties based on new (mocked) dimensions
//     // This relies on an effect rerunning setPosition. A more direct trigger might be needed
//     // if the effect doesn't naturally pick up the mocked offsetWidth/Height change.
//     rerender(props);
//     // await component.$set({}); // Trigger a prop update to force effect re-run if necessary
//     vi.advanceTimersByTime(1); // Allow Svelte effects to run
//     await waitFor(() => {}); // Wait for DOM updates

//     return { tooltipElement, action, component };
//   }

//   test("default position (top, center) calculation", async () => {
//     const { tooltipElement, action } = await showTooltipWithMocks(
//       { position: "top", align: "center", offset: { x: 0, y: 0 } }, // Tooltip props
//       { top: 200, left: 200, width: 100, height: 40 }, // Trigger rect
//       { width: 60, height: 30 }, // Tooltip size
//     );
//     // Expected Y: anchor.top(200) - tooltip.height(30) - offset.y(0) = 170
//     // Expected X: anchor.left(200) + (anchor.width(100)/2) - (tooltip.width(60)/2) - offset.x(0) = 200 + 50 - 30 = 220
//     expect(tooltipElement.style.top).toBe("170px");
//     expect(tooltipElement.style.left).toBe("220px");
//     action?.destroy?.();
//   });

//   test("flips from top to bottom if not enough space above", async () => {
//     let capturedFlipped: boolean | undefined;
//     const flippingSlot = (status: () => string, text: () => string, isFlipped: () => boolean) =>
//       createRawSnippet(() => {
//         return {
//           render: () => {
//             capturedFlipped = isFlipped();
//             return `<div>Flipped: ${isFlipped()}</div>`;
//           },
//         };
//       });

//     const { tooltipElement, action } = await showTooltipWithMocks(
//       { position: "top", align: "center", offset: { x: 0, y: 0 }, main: flippingSlot },
//       { top: 10, left: 200, width: 100, height: 40 }, // Trigger rect (near top of screen)
//       { width: 60, height: 30 }, // Tooltip size
//     );
//     // Initial Y without flip: anchor.top(10) - tooltip.height(30) = -20. Should flip.
//     // Flipped to "bottom".
//     // Expected Y (bottom): anchor.bottom(10+40=50) + offset.y(0) = 50
//     expect(capturedFlipped).toBe(true);
//     expect(tooltipElement.style.top).toBe("50px");
//     action?.destroy?.();
//   });
// });

// describe("Tooltip Styling with `style` prop", () => {
//   let host: HTMLElement;
//   let trigger: HTMLButtonElement;
//   const tooltipName = "styling-tooltip";

//   beforeEach(() => {
//     host = setupTriggerHost();
//     trigger = document.createElement("button");
//     host.appendChild(trigger);
//     vi.useFakeTimers();
//     HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
//       x: 50,
//       y: 50,
//       width: 100,
//       height: 30,
//       top: 50,
//       left: 50,
//       right: 150,
//       bottom: 80,
//       toJSON: () => ({ x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 }),
//     }));
//   });

//   afterEach(() => {
//     vi.clearAllTimers();
//     vi.restoreAllMocks();
//     host.remove();
//     document.body.innerHTML = "";
//   });

//   async function showStyledTooltip(props: TooltipProps) {
//     const { component, rerender } = render(Tooltip, { target: host, props: { name: tooltipName, ...props } });
//     const action = tooltip(trigger, { text: "Styled", delay: 0, name: tooltipName });
//     await fireEvent.pointerEnter(trigger);
//     vi.advanceTimersByTime(0);
//     const tooltipElement = await screen.findByRole("tooltip");
//     return { tooltipElement, action, component, rerender };
//   }

//   test("applies classes from string `style` prop", async () => {
//     const customClass = "my-custom-tooltip-style";
//     const { tooltipElement, action } = await showStyledTooltip({ style: customClass, status: STATE.ACTIVE });
//     // fnClass(preset, customClass)("whole", "active") -> "my-custom-tooltip-style whole active"
//     expect(tooltipElement.className).toContain(`${customClass} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
//     action?.destroy?.();
//   });

//   test("applies classes from object `style` prop for different statuses", async () => {
//     const styleObj: TooltipProps["style"] = {
//       [PARTS.WHOLE]: { // Assuming PARTS.WHOLE is "whole"
//         base: "base-class",
//         [STATE.NEUTRAL]: "neutral-class",
//         [STATE.ACTIVE]: "active-class",
//       },
//     };

//     // Test with NEUTRAL status
//     const { tooltipElement: elNeutral, action: actionNeutral, component, rerender } = await showStyledTooltip({
//       style: styleObj,
//       status: STATE.NEUTRAL,
//     });
//     expect(elNeutral).toHaveClass("base-class");
//     expect(elNeutral).toHaveClass("neutral-class");
//     expect(elNeutral).not.toHaveClass("active-class");
//     actionNeutral?.destroy?.(); // Clean up before potential re-trigger

//     // Ensure tooltip is hidden before next interaction if component instance is reused
//     await fireEvent.pointerLeave(trigger);
//     vi.advanceTimersByTime(10); // Allow hide to complete

//     // Test with ACTIVE status (re-using the component instance and updating props)
//     rerender({ status: STATE.ACTIVE });
//     // await component.$set({ status: STATE.ACTIVE });
//     const actionActive = tooltip(trigger, { text: "Styled Active", delay: 0, name: tooltipName }); // Re-apply or ensure action allows re-show
//     await fireEvent.pointerEnter(trigger); // Re-trigger to show
//     vi.advanceTimersByTime(0);
//     const elActive = await screen.findByRole("tooltip"); // Re-query

//     expect(elActive).toHaveClass("base-class");
//     expect(elActive).toHaveClass("active-class");
//     expect(elActive).not.toHaveClass("neutral-class");
//     actionActive?.destroy?.();
//   });
// });
