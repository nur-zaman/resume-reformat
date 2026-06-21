/**
 * Print/paper design tokens for the resume surface (PRD §10 — the shared renderer
 * contract). This module is the SINGLE source of truth for the printed resume's
 * geometry, colours, type sizes and spacing. Both the HTML preview and the
 * `@react-pdf/renderer` PDF read these same numbers so the two outputs cannot drift.
 *
 * All sizes are in PostScript points (pt; 1pt = 1/72in). react-pdf's `StyleSheet` uses
 * pt natively. The HTML renderer applies the identical numbers with a `pt` CSS unit, so
 * at 100% the HTML sheet is physically the same size as the PDF; the live preview simply
 * scales the whole sheet to fit its pane. Neither renderer hard-codes a size — they
 * import from here.
 *
 * These are deliberate starting values to be tuned against `image.png`.
 */

/** US Letter page geometry and margins. */
export const PAGE = {
  width: 612, // 8.5in
  height: 792, // 11in
  marginX: 52,
  marginY: 46,
} as const;

/** Usable text height between the top and bottom margins (for pagination heuristics). */
export const USABLE_HEIGHT = PAGE.height - PAGE.marginY * 2;

/** Paper-surface colours. Dark ink on white — distinct from the dark app chrome. */
export const COLOR = {
  paper: "#ffffff",
  ink: "#1a1a1a",
  muted: "#555555",
  rule: "#222222",
  /** Links stay ink-coloured on paper (ATS-friendly); the underline distinguishes them. */
  link: "#1a1a1a",
} as const;

/** The printed resume font. HTML resolves it via the next/font CSS var; the PDF
 *  registers static TTFs under the same family name (see pdf-fonts.ts). */
export const FONT = {
  family: "Source Serif 4",
  /** CSS family stack for the HTML renderer (next/font var first, then fallbacks). */
  cssStack: "var(--font-serif), Georgia, 'Times New Roman', serif",
} as const;

/** Type sizes (pt). */
export const SIZE = {
  name: 21,
  headline: 11,
  contact: 9,
  sectionTitle: 10,
  entryTitle: 10.5,
  entryMeta: 9.5,
  body: 10,
} as const;

/** Line-height multipliers. */
export const LEADING = {
  tight: 1.2,
  body: 1.34,
} as const;

/** Letter spacing (pt) for the uppercase section headings. */
export const TRACKING = {
  sectionTitle: 0.6,
} as const;

/** Vertical/horizontal spacing (pt). */
export const SPACE = {
  headerLineGap: 3, // between name / headline / contact lines
  afterHeader: 14, // below the header block
  sectionGap: 13, // above each section heading
  afterSectionTitle: 6, // below the heading rule, before content
  entryGap: 9, // between experience/education entries
  afterEntryHeader: 3, // below an entry's org/role/date rows, before bullets
  bulletGap: 2.5, // between bullets
  paragraphGap: 4, // between paragraphs
  bulletIndent: 12, // hanging indent / glyph column width
} as const;

/** Section-heading underline thickness (pt). */
export const RULE_WIDTH = 0.75;

/** Separator between inline header items (contact values, links). Shared so both
 *  renderers join identically. */
export const INLINE_SEPARATOR = "  ·  ";

/** En dash with surrounding spaces, for date ranges. Shared for identical output. */
export const DATE_SEPARATOR = " – ";
