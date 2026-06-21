import { newId } from "../ids";
import { CURRENT_SCHEMA_VERSION } from "../version";
import type { RichText } from "../richtext";
import type { ResumeDoc } from "../schema";

/**
 * A realistic single-column resume that mirrors the reference layout in image.png.
 * Doubles as the base fixture for the M3 visual-regression suite. Built with minted
 * ids so it always reflects the live schema; it validates against ResumeDocSchema.
 *
 * One summary paragraph carries `proposedContentId` so a sample pending ReviewItem
 * (see generation-result.ts) can target real content and exercise the review flow.
 */

export const proposedContentId = newId();

function para(text: string, contentId?: string): RichText["content"][number] {
  return {
    type: "paragraph",
    ...(contentId ? { attrs: { contentId } } : {}),
    content: [{ type: "text", text }],
  };
}

function bulletDoc(items: string[]): RichText {
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: items.map((text) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        })),
      },
    ],
  };
}

export const realisticResume: ResumeDoc = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  blocks: [
    {
      id: newId(),
      type: "header",
      name: "Avery Nguyen",
      headline: "Senior Software Engineer",
      contact: [
        { id: newId(), kind: "email", value: "avery.nguyen@example.com", label: "" },
        { id: newId(), kind: "phone", value: "+1 415 555 0199", label: "" },
        { id: newId(), kind: "location", value: "San Francisco, CA", label: "" },
      ],
      links: [
        { id: newId(), label: "GitHub", href: "https://github.com/averynguyen" },
        { id: newId(), label: "LinkedIn", href: "https://linkedin.com/in/averynguyen" },
      ],
    },
    {
      id: newId(),
      type: "summary",
      title: "Summary",
      visible: true,
      body: {
        type: "doc",
        content: [
          para(
            "Backend-leaning full-stack engineer with eight years building reliable, high-traffic web services.",
          ),
          para(
            "Drove a 40% reduction in p99 API latency across the core checkout platform.",
            proposedContentId,
          ),
        ],
      },
    },
    {
      id: newId(),
      type: "skills",
      title: "Skills",
      visible: true,
      categories: [
        { id: newId(), label: "Languages", items: ["TypeScript", "Go", "Python", "SQL"] },
        { id: newId(), label: "Platforms", items: ["AWS", "PostgreSQL", "Kubernetes", "Redis"] },
      ],
    },
    {
      id: newId(),
      type: "experience",
      title: "Experience",
      visible: true,
      entries: [
        {
          id: newId(),
          organization: "Northwind Labs",
          location: "San Francisco, CA",
          role: "Senior Software Engineer",
          startDate: "2021",
          endDate: "Present",
          bullets: bulletDoc([
            "Led the migration of the monolith checkout service to a set of Go microservices.",
            "Mentored four engineers and introduced a lightweight design-review process.",
          ]),
        },
        {
          id: newId(),
          organization: "Cobalt Systems",
          location: "Remote",
          role: "Software Engineer",
          startDate: "2017",
          endDate: "2021",
          bullets: bulletDoc([
            "Built the billing reconciliation pipeline processing 2M events per day.",
            "Cut nightly batch runtime from 6 hours to 45 minutes.",
          ]),
        },
      ],
    },
    {
      id: newId(),
      type: "education",
      title: "Education",
      visible: true,
      entries: [
        {
          id: newId(),
          institution: "University of Waterloo",
          location: "Waterloo, ON",
          credential: "B.A.Sc. in Computer Engineering",
          startDate: "2013",
          endDate: "2017",
          details: { type: "doc", content: [] },
        },
      ],
    },
    {
      id: newId(),
      type: "richtext",
      title: "Open Source",
      visible: true,
      body: {
        type: "doc",
        content: [
          para("Maintainer of a popular open-source rate-limiting library (3k+ stars)."),
        ],
      },
    },
  ],
};
