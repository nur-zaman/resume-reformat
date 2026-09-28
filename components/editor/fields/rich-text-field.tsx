"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { type Content, type Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Link } from "@tiptap/extension-link";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { ListItem } from "@tiptap/extension-list-item";
import { HardBreak } from "@tiptap/extension-hard-break";
import { UndoRedo } from "@tiptap/extensions";
import { isAllowedUrl, type RichText } from "@/lib/resume";
import { normalizeRichTextJson } from "@/lib/editor";
import { cn } from "@/lib/utils/cn";
import { ContentId } from "./content-id-extension";

// Link narrowed to emit only `href` (no target/rel/class) so output matches the schema.
const ConstrainedLink = Link.extend({
  addAttributes() {
    return { href: { default: null } };
  },
}).configure({
  autolink: false,
  openOnClick: false,
  protocols: ["http", "https", "mailto", "tel"],
  validate: (href: string) => isAllowedUrl(href),
});

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  ConstrainedLink,
  BulletList,
  OrderedList,
  ListItem,
  HardBreak,
  UndoRedo,
  ContentId,
];

const EDITABLE_CLASS = cn(
  "min-h-16 w-full rounded-md border border-hairline bg-surface-card px-3 py-2",
  "text-sm text-body outline-none transition-colors focus-within:border-primary",
  "[&_.ProseMirror]:outline-none",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
  "[&_a]:text-accent-blue [&_a]:underline [&_p]:min-h-[1.25rem]",
);

type RichTextFieldProps = {
  value: RichText;
  onChange: (next: RichText) => void;
  ariaLabel: string;
  highlighted?: boolean;
};

export function RichTextField({ value, onChange, ariaLabel, highlighted }: RichTextFieldProps) {
  const lastEmitted = useRef<string>(JSON.stringify(value));

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value as Content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        class: "min-h-12",
      },
    },
    onUpdate: ({ editor }) => {
      const json = normalizeRichTextJson(editor.getJSON()) as RichText;
      lastEmitted.current = JSON.stringify(json);
      onChange(json);
    },
  });

  // Reflect external changes without clobbering the caret on the user's own keystrokes.
  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(value);
    if (incoming !== lastEmitted.current) {
      editor.commands.setContent(value as Content, { emitUpdate: false });
      lastEmitted.current = incoming;
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "rounded-md",
        highlighted && "border-l-2 border-primary pl-2",
      )}
    >
      {editor ? <RichTextToolbar editor={editor} /> : null}
      <EditorContent editor={editor} className={EDITABLE_CLASS} />
    </div>
  );
}

function RichTextToolbar({ editor }: { editor: Editor }) {
  // Re-render when the selection/marks change so toggle states stay accurate.
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const update = () => force();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  function openLink() {
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!isAllowedUrl(linkValue)) {
      setLinkError("Use an https:, http:, mailto:, or tel: URL.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkValue }).run();
    setLinkOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1" role="toolbar" aria-label="Text formatting">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={openLink}>
        ↗
      </ToolbarButton>

      {linkOpen ? (
        <div className="flex w-full flex-wrap items-center gap-1.5 pt-1.5">
          <input
            type="text"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://example.com"
            aria-label="Link URL"
            aria-invalid={linkError !== null}
            className="h-8 flex-1 rounded-md border border-hairline bg-surface-card px-2 text-sm text-ink placeholder:text-muted focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <button type="button" onClick={applyLink} className="h-8 rounded-md bg-primary px-2.5 text-xs font-semibold text-on-primary">
            Apply
          </button>
          <button type="button" onClick={removeLink} className="h-8 rounded-md border border-hairline px-2.5 text-xs text-body">
            Remove
          </button>
          {linkError ? (
            <p role="alert" className="w-full text-xs text-error">
              {linkError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-hairline bg-surface-elevated text-body hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
