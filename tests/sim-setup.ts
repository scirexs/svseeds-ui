import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  enumerable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// required for svelte5 + jsdom as jsdom does not implement the Web Animations API
// (Element.prototype.animate). Svelte 5 drives transitions/animations through it,
// so without this any component using transition:/animate: throws.
// The mock completes immediately (via microtask, after Svelte assigns `onfinish`)
// so transitions settle to their end state in tests.
if (!Element.prototype.animate) {
  class MockAnimation {
    currentTime = 0;
    startTime = 0;
    playbackRate = 1;
    playState = "running";
    effect: unknown = null;
    pending = false;
    finished: Promise<MockAnimation>;
    oncancel: ((ev?: unknown) => void) | null = null;
    #onfinish: ((ev?: unknown) => void) | null = null;
    #done = false;

    constructor() {
      this.finished = Promise.resolve(this);
      queueMicrotask(() => this.finish());
    }
    get onfinish() {
      return this.#onfinish;
    }
    set onfinish(fn) {
      this.#onfinish = fn;
    }
    finish() {
      if (this.#done) return;
      this.#done = true;
      this.playState = "finished";
      this.#onfinish?.();
    }
    cancel() {
      this.#done = true;
      this.playState = "idle";
      this.oncancel?.();
    }
    play() {}
    pause() {}
    reverse() {}
    persist() {}
    commitStyles() {}
    updatePlaybackRate() {}
    addEventListener() {}
    removeEventListener() {}
  }
  Object.defineProperty(Element.prototype, "animate", {
    writable: true,
    configurable: true,
    value() {
      return new MockAnimation();
    },
  });
  // Svelte's flip animation reads existing animations via getAnimations()
  if (!Element.prototype.getAnimations) {
    Object.defineProperty(Element.prototype, "getAnimations", {
      writable: true,
      configurable: true,
      value: () => [],
    });
  }
}

// add more mocks here if you need them
