import { Fragment, type CSSProperties, type ReactNode } from "react";
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
} from "@/lib/render/tokens";

const pt = (n: number) => `${n}pt`;

const paperStyle: CSSProperties = {
  boxSizing: "border-box",
  width: pt(PAGE.width),
  minHeight: pt(PAGE.height),
  padding: `${pt(PAGE.marginY)} ${pt(PAGE.marginX)}`,
  background: COLOR.paper,
  color: COLOR.ink,
  fontFamily: FONT.cssStack,
  fontSize: pt(SIZE.body),
  lineHeight: LEADING.body,
};

export function ResumeDocument({ doc }: { doc: ResumeDoc }) {
  const sections = resumeToSections(doc);
  return (
    <div className="resume-paper" style={paperStyle}>
      {sections.map((block) => (
        <BlockSection key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockSection({ block }: { block: Block }) {
  switch (block.type) {
    case "header":
      return <Header block={block} />;
    case "summary":
    case "richtext":
      return (
        <Section title={block.title}>
          <RichTextView body={block.body} />
        </Section>
      );
    case "skills":
      return (
        <Section title={block.title}>
          {block.categories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: pt(SPACE.bulletGap) }}>
              {cat.label ? <span style={{ fontWeight: 700 }}>{cat.label}: </span> : null}
              {cat.items.join(", ")}
            </div>
          ))}
        </Section>
      );
    case "experience":
      return (
        <Section title={block.title}>
          {block.entries.map((entry) => (
            <ExperienceEntryView key={entry.id} entry={entry} />
          ))}
        </Section>
      );
    case "education":
      return (
        <Section title={block.title}>
          {block.entries.map((entry) => (
            <EducationEntryView key={entry.id} entry={entry} />
          ))}
        </Section>
      );
  }
}

function Header({ block }: { block: HeaderBlock }) {
  const parts: ReactNode[] = [];
  contactValues(block).forEach((value) => parts.push(value));
  block.links.forEach((link) =>
    parts.push(
      <a key={link.id} href={link.href} style={{ color: COLOR.link }}>
        {link.label || link.href}
      </a>,
    ),
  );

  return (
    <header style={{ marginBottom: pt(SPACE.afterHeader) }}>
      {block.name ? (
        <div style={{ fontSize: pt(SIZE.name), fontWeight: 700, lineHeight: LEADING.tight }}>
          {block.name}
        </div>
      ) : null}
      {block.headline ? (
        <div
          style={{
            fontSize: pt(SIZE.headline),
            marginTop: pt(SPACE.headerLineGap),
            lineHeight: LEADING.tight,
          }}
        >
          {block.headline}
        </div>
      ) : null}
      {parts.length > 0 ? (
        <div
          style={{
            fontSize: pt(SIZE.contact),
            color: COLOR.muted,
            marginTop: pt(SPACE.headerLineGap),
          }}
        >
          {parts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 ? INLINE_SEPARATOR : null}
              {part}
            </Fragment>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: pt(SPACE.sectionGap) }}>
      <h2
        style={{
          fontSize: pt(SIZE.sectionTitle),
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: pt(TRACKING.sectionTitle),
          borderBottom: `${pt(RULE_WIDTH)} solid ${COLOR.rule}`,
          paddingBottom: pt(2),
          margin: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: pt(SPACE.afterSectionTitle) }}>{children}</div>
    </section>
  );
}

function EntryRows({
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
        <TwoColumnRow
          left={primary ? <span style={{ fontWeight: 700 }}>{primary}</span> : null}
          right={right1}
        />
      )}
      {(secondary || right2) && (
        <TwoColumnRow
          left={secondary ? <span style={{ fontStyle: "italic" }}>{secondary}</span> : null}
          right={right2}
        />
      )}
    </>
  );
}

function TwoColumnRow({ left, right }: { left: ReactNode; right: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: pt(12) }}>
      <span>{left}</span>
      {right ? (
        <span
          style={{ color: COLOR.muted, fontSize: pt(SIZE.entryMeta), whiteSpace: "nowrap" }}
        >
          {right}
        </span>
      ) : null}
    </div>
  );
}

function ExperienceEntryView({ entry }: { entry: ExperienceEntry }) {
  return (
    <div style={{ marginBottom: pt(SPACE.entryGap) }}>
      <EntryRows
        primary={entry.organization}
        secondary={entry.role}
        right1={formatDateRange(entry.startDate, entry.endDate)}
        right2={entry.location}
      />
      <div style={{ marginTop: pt(SPACE.afterEntryHeader) }}>
        <RichTextView body={entry.bullets} />
      </div>
    </div>
  );
}

function EducationEntryView({ entry }: { entry: EducationEntry }) {
  return (
    <div style={{ marginBottom: pt(SPACE.entryGap) }}>
      <EntryRows
        primary={entry.institution}
        secondary={entry.credential}
        right1={formatDateRange(entry.startDate, entry.endDate)}
        right2={entry.location}
      />
      <div style={{ marginTop: pt(SPACE.afterEntryHeader) }}>
        <RichTextView body={entry.details} />
      </div>
    </div>
  );
}

function RichTextView({ body }: { body: RichText }) {
  const nodes = richTextToNodes(body);
  return (
    <>
      {nodes.map((node, i) =>
        node.kind === "paragraph" ? (
          <Paragraph key={i} lines={node.lines} />
        ) : (
          <ListView key={i} node={node} />
        ),
      )}
    </>
  );
}

function Paragraph({ lines }: { lines: RenderLine[] }) {
  if (lines.every(isLineEmpty)) return null;
  return (
    <p style={{ margin: 0, marginBottom: pt(SPACE.paragraphGap) }}>
      <Lines lines={lines} />
    </p>
  );
}

function ListView({ node }: { node: RenderList }) {
  const Tag = node.ordered ? "ol" : "ul";
  return (
    <Tag
      start={node.ordered ? node.start : undefined}
      style={{
        margin: 0,
        paddingLeft: pt(SPACE.bulletIndent),
        listStyleType: node.ordered ? "decimal" : "disc",
        listStylePosition: "outside",
      }}
    >
      {node.items.map((item, i) => (
        <li key={i} style={{ marginBottom: pt(SPACE.bulletGap) }}>
          <Lines lines={item.lines} />
        </li>
      ))}
    </Tag>
  );
}

function Lines({ lines }: { lines: RenderLine[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          <Runs runs={line} />
        </Fragment>
      ))}
    </>
  );
}

function Runs({ runs }: { runs: RenderLine }) {
  return (
    <>
      {runs.map((run, i) => {
        const style: CSSProperties = {};
        if (run.bold) style.fontWeight = 700;
        if (run.italic) style.fontStyle = "italic";
        if (run.href) {
          return (
            <a key={i} href={run.href} style={{ ...style, color: COLOR.link }}>
              {run.text}
            </a>
          );
        }
        return (
          <span key={i} style={style}>
            {run.text}
          </span>
        );
      })}
    </>
  );
}
