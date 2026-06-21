/**
 * Registers the printed-resume font (Source Serif 4) with `@react-pdf/renderer`.
 *
 * react-pdf cannot use next/font's variable woff2, so the PDF loads the static TTFs
 * served from `public/fonts/source-serif-4/` (same-origin URLs, fetched in the
 * browser). The family name matches the HTML side (`FONT.family`) so both renderers
 * resolve the same four faces. Hyphenation is disabled to avoid hyphens the HTML
 * preview would never insert — a guaranteed source of HTML↔PDF drift.
 *
 * Registration is idempotent and runs as a module side-effect on the client only.
 */

import { Font } from "@react-pdf/renderer";
import { FONT } from "./tokens";

const FONT_DIR = "/fonts/source-serif-4";

let registered = false;

export function registerResumeFonts(): void {
  if (registered) return;
  // The browser fetches these same-origin URLs at render time. In node (SSR / unit
  // tests) there is no origin to fetch from, and the PDF is only ever generated in the
  // browser — so skip here and let node callers register from the filesystem instead.
  if (typeof window === "undefined") return;
  registered = true;

  Font.register({
    family: FONT.family,
    fonts: [
      { src: `${FONT_DIR}/SourceSerif4-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_DIR}/SourceSerif4-Bold.ttf`, fontWeight: 700 },
      {
        src: `${FONT_DIR}/SourceSerif4-Italic.ttf`,
        fontWeight: 400,
        fontStyle: "italic",
      },
      {
        src: `${FONT_DIR}/SourceSerif4-BoldItalic.ttf`,
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });

  // Disable hyphenation: keep words whole so PDF line breaks match the HTML preview.
  Font.registerHyphenationCallback((word) => [word]);
}
