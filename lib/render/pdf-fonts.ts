// react-pdf can't use next/font's variable woff2, so this loads static TTFs from
// public/fonts/source-serif-4/ under the same family name as the HTML side.

import { Font } from "@react-pdf/renderer";
import { FONT } from "./tokens";

const FONT_DIR = "/fonts/source-serif-4";

let registered = false;

export function registerResumeFonts(): void {
  if (registered) return;
  // No origin to fetch from in node (SSR/tests); node callers register from the filesystem instead.
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

  // Keep words whole so PDF line breaks match the HTML preview.
  Font.registerHyphenationCallback((word) => [word]);
}
