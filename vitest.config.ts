import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Pure-logic unit tests only (no React/Next runtime). Co-located *.test.ts.
    include: ["lib/**/*.test.ts"],
  },
});
