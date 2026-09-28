"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  editorReducer,
  initialEditorState,
  type EditorAction,
  type EditorState,
} from "@/lib/editor";
import type { ResumeDoc, ReviewItem } from "@/lib/resume";

type EditorStore = { state: EditorState; dispatch: Dispatch<EditorAction> };

const EditorContext = createContext<EditorStore | null>(null);

export function EditorProvider({
  initialDoc,
  initialReviewItems,
  children,
}: {
  initialDoc: ResumeDoc;
  initialReviewItems: ReviewItem[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    initialEditorState(initialDoc, initialReviewItems),
  );
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorStore(): EditorStore {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorStore must be used within an EditorProvider");
  }
  return ctx;
}

export function nowIso(): string {
  return new Date().toISOString();
}
