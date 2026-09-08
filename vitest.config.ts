import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Starts one shared in-memory MongoDB for the whole run (see
    // tests/global-setup.ts) so repository tests can exercise real Mongoose
    // queries instead of fakes — this is what actually proves escapeRegex(),
    // duplicate-key handling, sorting, etc. work against real MongoDB
    // semantics, not just our assumptions about them.
    globalSetup: "./tests/global-setup.ts",
    // Without this, a vi.fn()'s call history/queued mockResolvedValueOnce
    // values survive between `it()` blocks in the same file, so an
    // assertion like `expect(fn).not.toHaveBeenCalled()` can pass or fail
    // depending on what an earlier, unrelated test happened to do to that
    // same mock — a footgun for every future test file, not just this one.
    clearMocks: true,
  },
});
