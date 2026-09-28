// Single source of truth for the printed resume's geometry, colours, type sizes and
// spacing (all in pt) — both the HTML preview and the PDF renderer read these same
// numbers so the two outputs cannot drift.

export const PAGE = {
  width: 612,
  height: 792,
  marginX: 52,
  marginY: 46,
} as const;

export const USABLE_HEIGHT = PAGE.height - PAGE.marginY * 2;

export const COLOR = {
  paper: "#ffffff",
  ink: "#1a1a1a",
  muted: "#555555",
  rule: "#222222",
  link: "#1a1a1a",
} as const;

export const FONT = {
  family: "Source Serif 4",
  cssStack: "var(--font-serif), Georgia, 'Times New Roman', serif",
} as const;

export const SIZE = {
  name: 21,
  headline: 11,
  contact: 9,
  sectionTitle: 10,
  entryTitle: 10.5,
  entryMeta: 9.5,
  body: 10,
} as const;

export const LEADING = {
  tight: 1.2,
  body: 1.34,
} as const;

export const TRACKING = {
  sectionTitle: 0.6,
} as const;

export const SPACE = {
  headerLineGap: 3,
  afterHeader: 14,
  sectionGap: 13,
  afterSectionTitle: 6,
  entryGap: 9,
  afterEntryHeader: 3,
  bulletGap: 2.5,
  paragraphGap: 4,
  bulletIndent: 12,
} as const;

export const RULE_WIDTH = 0.75;

export const INLINE_SEPARATOR = "  ·  ";

export const DATE_SEPARATOR = " – ";
