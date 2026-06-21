import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Mirror the tsconfig `@/*` path alias so tests can import like app code does.
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws on import outside a React Server build; map it to the
      // package's own empty module so server-marked units (e.g. lib/ai) are testable.
      "server-only": path.resolve(root, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    // Pure-logic units plus renderer snapshot tests. The HTML renderer is snapshotted via
    // react-dom/server and the PDF via react-pdf's node `renderToBuffer` — both run without
    // a DOM, so the node environment is kept.
    include: ["lib/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
  },
});
