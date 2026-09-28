"use client";

import { useId, useState } from "react";
import {
  collectContentIdsFromRichText,
  isAllowedUrl,
  type Block,
  type EducationEntry,
  type ExperienceEntry,
  type RichText,
  type ReviewItem,
} from "@/lib/resume";
import { cn } from "@/lib/utils/cn";
import { nowIso, useEditorStore } from "./editor-context";
import { ConfirmDeleteButton, MoveButtons } from "./controls";
import { LabeledField, StringListField } from "./fields/structured-fields";
import { RichTextField } from "./fields/rich-text-field";
import { ProposalBanner } from "./review/proposal";

type HeaderBlock = Extract<Block, { type: "header" }>;
type SummaryBlock = Extract<Block, { type: "summary" }>;
type SkillsBlock = Extract<Block, { type: "skills" }>;
type ExperienceBlock = Extract<Block, { type: "experience" }>;
type EducationBlock = Extract<Block, { type: "education" }>;
type RichTextBlock = Extract<Block, { type: "richtext" }>;

function pendingForBody(reviewItems: ReviewItem[], body: RichText): ReviewItem[] {
  const ids = new Set(collectContentIdsFromRichText(body));
  return reviewItems.filter((r) => r.status === "pending" && ids.has(r.targetContentId));
}

const CARD = "rounded-md border border-hairline bg-surface-soft p-3";
const SUBHEAD = "text-xs font-semibold uppercase tracking-wider text-muted";

const CONTACT_KINDS: HeaderBlock["contact"][number]["kind"][] = [
  "email",
  "phone",
  "location",
  "custom",
];

export function HeaderEditor({ block }: { block: HeaderBlock }) {
  const { dispatch } = useEditorStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledField
          label="Name"
          value={block.name}
          placeholder="Your full name"
          onChange={(value) => dispatch({ type: "header/setField", field: "name", value })}
        />
        <LabeledField
          label="Headline"
          value={block.headline}
          placeholder="e.g. Senior Software Engineer"
          onChange={(value) => dispatch({ type: "header/setField", field: "headline", value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={SUBHEAD}>Contact</span>
        {block.contact.map((item, index) => (
          <div key={item.id} className="flex flex-wrap items-end gap-1.5">
            <ContactKindSelect
              value={item.kind}
              onChange={(kind) =>
                dispatch({ type: "header/contact/update", contactId: item.id, patch: { kind } })
              }
            />
            {item.kind === "custom" ? (
              <LabeledField
                label="Label"
                value={item.label}
                onChange={(value) =>
                  dispatch({ type: "header/contact/update", contactId: item.id, patch: { label: value } })
                }
              />
            ) : null}
            <LabeledField
              label="Value"
              className="flex-1"
              value={item.value}
              onChange={(value) =>
                dispatch({ type: "header/contact/update", contactId: item.id, patch: { value } })
              }
            />
            <MoveButtons
              itemLabel="contact"
              canMoveUp={index > 0}
              canMoveDown={index < block.contact.length - 1}
              onMove={(direction) => dispatch({ type: "header/contact/move", contactId: item.id, direction })}
            />
            <ConfirmDeleteButton
              label="Remove contact"
              onDelete={() => dispatch({ type: "header/contact/remove", contactId: item.id })}
            />
          </div>
        ))}
        <AddContactMenu onAdd={(kind) => dispatch({ type: "header/contact/add", kind })} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={SUBHEAD}>Links</span>
        {block.links.map((link, index) => (
          <div key={link.id} className="flex flex-wrap items-end gap-1.5">
            <LabeledField
              label="Label"
              value={link.label}
              placeholder="GitHub"
              onChange={(value) =>
                dispatch({ type: "header/link/update", linkId: link.id, patch: { label: value } })
              }
            />
            <LabeledField
              label="URL"
              className="flex-1"
              value={link.href}
              onChange={(value) =>
                dispatch({ type: "header/link/update", linkId: link.id, patch: { href: value } })
              }
            />
            <MoveButtons
              itemLabel="link"
              canMoveUp={index > 0}
              canMoveDown={index < block.links.length - 1}
              onMove={(direction) => dispatch({ type: "header/link/move", linkId: link.id, direction })}
            />
            <ConfirmDeleteButton
              label="Remove link"
              onDelete={() => dispatch({ type: "header/link/remove", linkId: link.id })}
            />
          </div>
        ))}
        <AddLinkForm onAdd={(label, href) => dispatch({ type: "header/link/add", label, href })} />
      </div>
    </div>
  );
}

function ContactKindSelect({
  value,
  onChange,
}: {
  value: HeaderBlock["contact"][number]["kind"];
  onChange: (kind: HeaderBlock["contact"][number]["kind"]) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        Type
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as HeaderBlock["contact"][number]["kind"])}
        className="h-10 rounded-md border border-hairline bg-surface-card px-2.5 text-sm text-ink focus:border-primary"
      >
        {CONTACT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddContactMenu({
  onAdd,
}: {
  onAdd: (kind: HeaderBlock["contact"][number]["kind"]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONTACT_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onAdd(kind)}
          className="rounded-md border border-hairline px-2.5 py-1 text-xs text-body hover:text-ink"
        >
          + {kind}
        </button>
      ))}
    </div>
  );
}

function AddLinkForm({ onAdd }: { onAdd: (label: string, href: string) => void }) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!isAllowedUrl(href)) {
      setError("Use an https:, http:, mailto:, or tel: URL.");
      return;
    }
    onAdd(label || href, href);
    setLabel("");
    setHref("");
    setError(null);
  }

  return (
    <div className="flex flex-wrap items-end gap-1.5">
      <LabeledField label="New link label" value={label} placeholder="LinkedIn" onChange={setLabel} />
      <LabeledField
        label="New link URL"
        className="flex-1"
        value={href}
        placeholder="https://…"
        onChange={setHref}
      />
      <button
        type="button"
        onClick={submit}
        className="h-10 rounded-md border border-hairline px-3 text-xs font-semibold text-body hover:text-ink"
      >
        + Add link
      </button>
      {error ? (
        <p role="alert" className="w-full text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RichTextBody({
  body,
  ariaLabel,
  pending,
  onChange,
}: {
  body: RichText;
  ariaLabel: string;
  pending: ReviewItem[];
  onChange: (next: RichText) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ProposalBanner items={pending} />
      <RichTextField value={body} ariaLabel={ariaLabel} highlighted={pending.length > 0} onChange={onChange} />
    </div>
  );
}

export function SummaryEditor({ block }: { block: SummaryBlock }) {
  const { state, dispatch } = useEditorStore();
  return (
    <RichTextBody
      body={block.body}
      ariaLabel={`${block.title} body`}
      pending={pendingForBody(state.reviewItems, block.body)}
      onChange={(body) =>
        dispatch({ type: "richtext/set", target: { kind: "summaryBody", blockId: block.id }, body, now: nowIso() })
      }
    />
  );
}

export function RichTextSectionEditor({ block }: { block: RichTextBlock }) {
  const { state, dispatch } = useEditorStore();
  return (
    <RichTextBody
      body={block.body}
      ariaLabel={`${block.title} body`}
      pending={pendingForBody(state.reviewItems, block.body)}
      onChange={(body) =>
        dispatch({ type: "richtext/set", target: { kind: "richtextBody", blockId: block.id }, body, now: nowIso() })
      }
    />
  );
}

export function SkillsEditor({ block }: { block: SkillsBlock }) {
  const { dispatch } = useEditorStore();
  return (
    <div className="flex flex-col gap-3">
      {block.categories.map((category, index) => (
        <div key={category.id} className={CARD}>
          <div className="mb-2 flex items-end gap-1.5">
            <LabeledField
              label="Category"
              className="flex-1"
              value={category.label}
              placeholder="e.g. Languages"
              onChange={(value) =>
                dispatch({
                  type: "skills/category/update",
                  blockId: block.id,
                  categoryId: category.id,
                  patch: { label: value },
                })
              }
            />
            <MoveButtons
              itemLabel="category"
              canMoveUp={index > 0}
              canMoveDown={index < block.categories.length - 1}
              onMove={(direction) =>
                dispatch({ type: "skills/category/move", blockId: block.id, categoryId: category.id, direction })
              }
            />
            <ConfirmDeleteButton
              label="Remove category"
              onDelete={() =>
                dispatch({ type: "skills/category/remove", blockId: block.id, categoryId: category.id })
              }
            />
          </div>
          <StringListField
            label="Items"
            items={category.items}
            onChange={(items) =>
              dispatch({ type: "skills/items/set", blockId: block.id, categoryId: category.id, items })
            }
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: "skills/category/add", blockId: block.id })}
        className="self-start rounded-md border border-hairline px-2.5 py-1 text-xs text-body hover:text-ink"
      >
        + Add category
      </button>
    </div>
  );
}

export function ExperienceEditor({ block }: { block: ExperienceBlock }) {
  const { dispatch } = useEditorStore();
  return (
    <div className="flex flex-col gap-3">
      {block.entries.map((entry, index) => (
        <EntryEditor
          key={entry.id}
          variant="experience"
          blockId={block.id}
          entry={entry}
          index={index}
          total={block.entries.length}
        />
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: "entry/add", blockId: block.id })}
        className="self-start rounded-md border border-hairline px-2.5 py-1 text-xs text-body hover:text-ink"
      >
        + Add experience
      </button>
    </div>
  );
}

export function EducationEditor({ block }: { block: EducationBlock }) {
  const { dispatch } = useEditorStore();
  return (
    <div className="flex flex-col gap-3">
      {block.entries.map((entry, index) => (
        <EntryEditor
          key={entry.id}
          variant="education"
          blockId={block.id}
          entry={entry}
          index={index}
          total={block.entries.length}
        />
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: "entry/add", blockId: block.id })}
        className="self-start rounded-md border border-hairline px-2.5 py-1 text-xs text-body hover:text-ink"
      >
        + Add education
      </button>
    </div>
  );
}

type EntryEditorProps =
  | { variant: "experience"; blockId: string; entry: ExperienceEntry; index: number; total: number }
  | { variant: "education"; blockId: string; entry: EducationEntry; index: number; total: number };

function EntryEditor(props: EntryEditorProps) {
  const { state, dispatch } = useEditorStore();
  const { variant, blockId, entry, index, total } = props;

  const setField = (field: string, value: string) =>
    dispatch({ type: "entry/update", blockId, entryId: entry.id, patch: { [field]: value } });

  const richText = variant === "experience" ? props.entry.bullets : props.entry.details;
  const pending = pendingForBody(state.reviewItems, richText);

  return (
    <div className={cn(CARD, "flex flex-col gap-3")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">
          {variant === "experience" ? "Experience" : "Education"} entry {index + 1}
        </p>
        <div className="flex items-center gap-1.5">
          <MoveButtons
            itemLabel="entry"
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMove={(direction) => dispatch({ type: "entry/move", blockId, entryId: entry.id, direction })}
          />
          <ConfirmDeleteButton
            label="Remove entry"
            onDelete={() => dispatch({ type: "entry/remove", blockId, entryId: entry.id, now: nowIso() })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {variant === "experience" ? (
          <>
            <LabeledField label="Organization" value={props.entry.organization} onChange={(v) => setField("organization", v)} />
            <LabeledField label="Role" value={props.entry.role} onChange={(v) => setField("role", v)} />
          </>
        ) : (
          <>
            <LabeledField label="Institution" value={props.entry.institution} onChange={(v) => setField("institution", v)} />
            <LabeledField label="Credential" value={props.entry.credential} onChange={(v) => setField("credential", v)} />
          </>
        )}
        <LabeledField label="Location" value={entry.location} onChange={(v) => setField("location", v)} />
        <div className="grid grid-cols-2 gap-2">
          <LabeledField label="Start" value={entry.startDate} placeholder="2021" onChange={(v) => setField("startDate", v)} />
          <LabeledField label="End" value={entry.endDate} placeholder="Present" onChange={(v) => setField("endDate", v)} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">
          {variant === "experience" ? "Bullets" : "Details"}
        </span>
        <RichTextBody
          body={richText}
          ariaLabel={variant === "experience" ? "Experience bullets" : "Education details"}
          pending={pending}
          onChange={(body) =>
            dispatch({
              type: "richtext/set",
              target:
                variant === "experience"
                  ? { kind: "experienceBullets", blockId, entryId: entry.id }
                  : { kind: "educationDetails", blockId, entryId: entry.id },
              body,
              now: nowIso(),
            })
          }
        />
      </div>
    </div>
  );
}
