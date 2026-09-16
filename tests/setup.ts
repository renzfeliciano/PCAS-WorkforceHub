import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement matchMedia at all — anything using useMediaQuery
// (src/hooks/use-media-query.ts) throws without this. Defined once here for
// every jsdom component test rather than per-file, same as `cleanup` below.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// Without this, each render() in a component test file leaves its DOM tree
// mounted for the next test in the same file (Vitest doesn't do this
// automatically the way some other runners' RTL integrations do) — so a
// later test's queries can match leftover elements from an earlier one.
afterEach(() => {
  cleanup();
});
