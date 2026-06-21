import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Mirror the tsconfig `@/*` path alias so tests can import like app code does.
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    // Pure-logic unit tests only (no React/Next runtime). Co-located *.test.ts.
    include: ["lib/**/*.test.ts"],
  },
});
