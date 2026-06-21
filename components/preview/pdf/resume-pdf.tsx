"use client";

/**
 * The fixed resume template rendered to PDF with `@react-pdf/renderer` (PRD FR-27, FR-29).
 *
 * It mirrors the HTML template (components/preview/resume-document.tsx) by consuming the
 * same shared layer — `resumeToSections`, `richTextToNodes`, and `lib/render/tokens` —
 * so the PDF and HTML outputs stay aligned (PRD §10). This module is imported only on the
 * client (behind a dynamic `ssr:false` boundary) because react-pdf relies on browser APIs.
 *
 * Pagination (FR-29):
 *   - each experience/education entry is an unbreakable unit (`wrap={false}`) so a normal
 *     entry is pushed whole to the next page rather than split or clipped;
 *   - an entry taller than (almost) a full page falls back to `wrap` enabled so it can
 *     split between bullets instead of overflowing — react-pdf exposes no measure API, so
 *     this uses a height estimate (tunable);
 *   - section headings carry `minPresenceAhead` so they never orphan at a page bottom.
 */

import { type ReactNode } from "react";
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  Block,
  EducationEntry,
  ExperienceEntry,
  ResumeDoc,
  RichText,
} from "@/lib/resume";
import {
  contactValues,
  formatDateRange,
  resumeToSections,
  type HeaderBlock,
} from "@/lib/render/document";
import {
  isLineEmpty,
  richTextToNodes,
  type RenderLine,
  type RenderList,
} from "@/lib/render/richtext";
import {
  COLOR,
  FONT,
  INLINE_SEPARATOR,
  LEADING,
  PAGE,
  RULE_WIDTH,
  SIZE,
  SPACE,
  TRACKING,
  USABLE_HEIGHT,
} from "@/lib/render/tokens";
import { registerResumeFonts } from "@/lib/render/pdf-fonts";

registerResumeFonts();

const styles = StyleSheet.create({
  page: {
    paddingVertical: PAGE.marginY,
    paddingHorizontal: PAGE.marginX,
    fontFamily: FONT.family,
    fontSize: SIZE.body,
    lineHeight: LEADING.body,
    color: COLOR.ink,
    backgroundColor: COLOR.paper,
  },
  header: { marginBottom: SPACE.afterHeader },
  name: { fontSize: SIZE.name, fontWeight: 700, lineHeight: LEADING.tight },
  headline: {
    fontSize: SIZE.headline,
    marginTop: SPACE.headerLineGap,
    lineHeight: LEADING.tight,
  },
  contact: {
    fontSize: SIZE.contact,
    color: COLOR.muted,
    marginTop: SPACE.headerLineGap,
  },
  section: { marginTop: SPACE.sectionGap },
  sectionTitle: {
    fontSize: SIZE.sectionTitle,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: TRACKING.sectionTitle,
    borderBottomWidth: RULE_WIDTH,
    borderBottomColor: COLOR.rule,
    paddingBottom: 2,
    marginBottom: SPACE.afterSectionTitle,
  },
  entry: { marginBottom: SPACE.entryGap },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLeftBold: { fontWeight: 700, flexShrink: 1 },
  rowLeftItalic: { fontStyle: "italic", flexShrink: 1 },
  meta: {
    color: COLOR.muted,
    fontSize: SIZE.entryMeta,
    flexShrink: 0,
    marginLeft: 12,
  },
  afterEntryHeader: { marginTop: SPACE.afterEntryHeader },
  paragraph: { marginBottom: SPACE.paragraphGap },
  category: { marginBottom: SPACE.bulletGap },
  listItemRow: { flexDirection: "row", marginBottom: SPACE.bulletGap },
  bulletGlyph: { width: SPACE.bulletIndent },
  listItemBody: { flex: 1 },
  link: { color: COLOR.link, textDecoration: "underline" },
});

export function ResumePdf({ doc }: { doc: ResumeDoc }) {
  const sections = resumeToSections(doc);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {sections.map((block) => (
          <PdfBlock key={block.id} block={block} />
        ))}
      </Page>
    </Document>
  );
}

function PdfBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "header":
      return <PdfHeader block={block} />;
    case "summary":
    case "richtext":
      return (
        <PdfSection title={block.title}>
          <PdfRichText body={block.body} />
        </PdfSection>
      );
    case "skills":
      return (
        <PdfSection title={block.title}>
          {block.categories.map((cat) => (
            <Text key={cat.id} style={styles.category}>
              {cat.label ? <Text style={{ fontWeight: 700 }}>{cat.label}: </Text> : null}
              {cat.items.join(", ")}
            </Text>
          ))}
        </PdfSection>
      );
    case "experience":
      return (
        <PdfSection title={block.title}>
          {block.entries.map((entry) => (
            <PdfExperienceEntry key={entry.id} entry={entry} />
          ))}
        </PdfSection>
      );
    case "education":
      return (
        <PdfSection title={block.title}>
          {block.entries.map((entry) => (
            <PdfEducationEntry key={entry.id} entry={entry} />
          ))}
        </PdfSection>
      );
  }
}

function PdfHeader({ block }: { block: HeaderBlock }) {
  const nodes: ReactNode[] = [];
  contactValues(block).forEach((value) => {
    if (nodes.length > 0) nodes.push(INLINE_SEPARATOR);
    nodes.push(value);
  });
  block.links.forEach((link) => {
    if (nodes.length > 0) nodes.push(INLINE_SEPARATOR);
    nodes.push(
      <Link key={link.id} src={link.href} style={styles.link}>
        {link.label || link.href}
      </Link>,
    );
  });

  return (
    <View style={styles.header}>
      {block.name ? <Text style={styles.name}>{block.name}</Text> : null}
      {block.headline ? <Text style={styles.headline}>{block.headline}</Text> : null}
      {nodes.length > 0 ? <Text style={styles.contact}>{nodes}</Text> : null}
    </View>
  );
}

function PdfSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} minPresenceAhead={36}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function PdfEntryRows({
  primary,
  secondary,
  right1,
  right2,
}: {
  primary: string;
  secondary: string;
  right1: string;
  right2: string;
}) {
  return (
    <>
      {(primary || right1) && (
        <View style={styles.row}>
          <Text style={styles.rowLeftBold}>{primary}</Text>
          {right1 ? <Text style={styles.meta}>{right1}</Text> : null}
        </View>
      )}
      {(secondary || right2) && (
        <View style={styles.row}>
          <Text style={styles.rowLeftItalic}>{secondary}</Text>
          {right2 ? <Text style={styles.meta}>{right2}</Text> : null}
        </View>
      )}
    </>
  );
}

/** Estimate an entry's rendered height (pt) to decide whether it must be splittable. */
function estimateEntryHeight(body: RichText): number {
  const nodes = richTextToNodes(body);
  let lines = 0;
  for (const node of nodes) {
    if (node.kind === "list") lines += node.items.length;
    else lines += node.lines.filter((l) => !isLineEmpty(l)).length;
  }
  const headerRows = 2 * SIZE.entryTitle * LEADING.tight;
  // 1.25 fudge: long bullets wrap to ~1+ extra lines we can't measure ahead of render.
  const bodyHeight = lines * SIZE.body * LEADING.body * 1.25;
  return headerRows + SPACE.afterEntryHeader + bodyHeight + SPACE.entryGap;
}

/** Keep an entry whole unless it is nearly a full page tall, in which case allow a split. */
function allowSplit(body: RichText): boolean {
  return estimateEntryHeight(body) > USABLE_HEIGHT * 0.92;
}

function PdfExperienceEntry({ entry }: { entry: ExperienceEntry }) {
  return (
    <View style={styles.entry} wrap={allowSplit(entry.bullets)}>
      <PdfEntryRows
        primary={entry.organization}
        secondary={entry.role}
        right1={formatDateRange(entry.startDate, entry.endDate)}
        right2={entry.location}
      />
      <View style={styles.afterEntryHeader}>
        <PdfRichText body={entry.bullets} />
      </View>
    </View>
  );
}

function PdfEducationEntry({ entry }: { entry: EducationEntry }) {
  return (
    <View style={styles.entry} wrap={allowSplit(entry.details)}>
      <PdfEntryRows
        primary={entry.institution}
        secondary={entry.credential}
        right1={formatDateRange(entry.startDate, entry.endDate)}
        right2={entry.location}
      />
      <View style={styles.afterEntryHeader}>
        <PdfRichText body={entry.details} />
      </View>
    </View>
  );
}

function PdfRichText({ body }: { body: RichText }) {
  const nodes = richTextToNodes(body);
  return (
    <>
      {nodes.map((node, i) =>
        node.kind === "paragraph" ? (
          <PdfParagraph key={i} lines={node.lines} />
        ) : (
          <PdfList key={i} node={node} />
        ),
      )}
    </>
  );
}

function PdfParagraph({ lines }: { lines: RenderLine[] }) {
  if (lines.every(isLineEmpty)) return null;
  return (
    <Text style={styles.paragraph}>
      <PdfLines lines={lines} />
    </Text>
  );
}

function PdfList({ node }: { node: RenderList }) {
  return (
    <View>
      {node.items.map((item, i) => (
        <View key={i} style={styles.listItemRow}>
          <Text style={styles.bulletGlyph}>
            {node.ordered ? `${node.start + i}.` : "•"}
          </Text>
          <Text style={styles.listItemBody}>
            <PdfLines lines={item.lines} />
          </Text>
        </View>
      ))}
    </View>
  );
}

function PdfLines({ lines }: { lines: RenderLine[] }) {
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push("\n");
    out.push(<PdfRuns key={i} runs={line} />);
  });
  return <>{out}</>;
}

function PdfRuns({ runs }: { runs: RenderLine }) {
  return (
    <>
      {runs.map((run, i) => {
        const style: { fontWeight?: number; fontStyle?: "italic" } = {};
        if (run.bold) style.fontWeight = 700;
        if (run.italic) style.fontStyle = "italic";
        if (run.href) {
          return (
            <Link key={i} src={run.href} style={[style, styles.link]}>
              {run.text}
            </Link>
          );
        }
        return (
          <Text key={i} style={style}>
            {run.text}
          </Text>
        );
      })}
    </>
  );
}
