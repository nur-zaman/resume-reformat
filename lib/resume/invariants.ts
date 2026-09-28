import type { z } from "zod";
import { findDuplicates } from "./ids";
import { collectContentIdsFromRichText } from "./richtext";
import type { ResumeDoc, ReviewItem } from "./schema";

export type Issue = { path: (string | number)[]; message: string };

export function collectAllIds(doc: ResumeDoc): string[] {
  const ids: string[] = [];
  for (const block of doc.blocks) {
    ids.push(block.id);
    switch (block.type) {
      case "header":
        for (const c of block.contact) ids.push(c.id);
        for (const l of block.links) ids.push(l.id);
        break;
      case "skills":
        for (const cat of block.categories) ids.push(cat.id);
        break;
      case "experience":
        for (const e of block.entries) ids.push(e.id);
        break;
      case "education":
        for (const e of block.entries) ids.push(e.id);
        break;
      case "summary":
      case "richtext":
        break;
    }
  }
  return ids;
}

export function collectContentIds(doc: ResumeDoc): string[] {
  const ids: string[] = [];
  for (const block of doc.blocks) {
    switch (block.type) {
      case "summary":
      case "richtext":
        ids.push(...collectContentIdsFromRichText(block.body));
        break;
      case "experience":
        for (const e of block.entries) {
          ids.push(...collectContentIdsFromRichText(e.bullets));
        }
        break;
      case "education":
        for (const e of block.entries) {
          ids.push(...collectContentIdsFromRichText(e.details));
        }
        break;
      case "header":
      case "skills":
        break;
    }
  }
  return ids;
}

export function exactlyOneHeaderFirst(doc: ResumeDoc): Issue[] {
  const issues: Issue[] = [];
  const headerCount = doc.blocks.filter((b) => b.type === "header").length;
  if (headerCount !== 1) {
    issues.push({
      path: ["blocks"],
      message: `Document must contain exactly one header block (found ${headerCount})`,
    });
  }
  if (doc.blocks.length > 0 && doc.blocks[0].type !== "header") {
    issues.push({
      path: ["blocks", 0],
      message: "The first block must be the header",
    });
  }
  return issues;
}

export function uniqueIds(doc: ResumeDoc): Issue[] {
  const issues: Issue[] = [];
  for (const dup of findDuplicates(collectAllIds(doc))) {
    issues.push({ path: ["blocks"], message: `Duplicate id: ${dup}` });
  }
  for (const dup of findDuplicates(collectContentIds(doc))) {
    issues.push({ path: ["blocks"], message: `Duplicate content id: ${dup}` });
  }
  return issues;
}

export function noOrphanedPendingReviewItems(
  resume: ResumeDoc,
  reviewItems: ReviewItem[],
): Issue[] {
  const known = new Set(collectContentIds(resume));
  const issues: Issue[] = [];
  reviewItems.forEach((item, i) => {
    if (item.status === "pending" && !known.has(item.targetContentId)) {
      issues.push({
        path: ["reviewItems", i, "targetContentId"],
        message: `Pending review item targets missing content id: ${item.targetContentId}`,
      });
    }
  });
  return issues;
}

export function reviewItemStatusCoherent(reviewItems: ReviewItem[]): Issue[] {
  const issues: Issue[] = [];
  reviewItems.forEach((item, i) => {
    const resolved = item.status === "accepted" || item.status === "dismissed";
    if (resolved && !item.resolvedAt) {
      issues.push({
        path: ["reviewItems", i, "resolvedAt"],
        message: `A ${item.status} review item must have a resolvedAt timestamp`,
      });
    }
    if (!resolved && item.resolvedAt) {
      issues.push({
        path: ["reviewItems", i, "resolvedAt"],
        message: "A pending review item must not have a resolvedAt timestamp",
      });
    }
  });
  return issues;
}

export function validateReviewState(
  resume: ResumeDoc,
  reviewItems: ReviewItem[],
): Issue[] {
  return [
    ...noOrphanedPendingReviewItems(resume, reviewItems),
    ...reviewItemStatusCoherent(reviewItems),
  ];
}

function report(ctx: z.RefinementCtx, issues: Issue[]): void {
  for (const issue of issues) {
    ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
  }
}

export function resumeDocCrossChecks(doc: ResumeDoc, ctx: z.RefinementCtx): void {
  report(ctx, [...exactlyOneHeaderFirst(doc), ...uniqueIds(doc)]);
}

export function reviewStateCrossChecks(
  resume: ResumeDoc,
  reviewItems: ReviewItem[],
  ctx: z.RefinementCtx,
): void {
  report(ctx, validateReviewState(resume, reviewItems));
}
