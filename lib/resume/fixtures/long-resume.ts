import { newId } from "../ids";
import { CURRENT_SCHEMA_VERSION } from "../version";
import type { RichText } from "../richtext";
import type { ResumeDoc } from "../schema";

/**
 * A long, multi-page resume fixture for the M3 page-break work (PRD FR-29). It has many
 * experience entries with several bullets each so the document spans more than one US
 * Letter page, exercising "keep each entry together; break between entries" pagination.
 * Built with minted ids so it always reflects the live schema and validates against
 * ResumeDocSchema.
 */

function para(text: string): RichText["content"][number] {
  return { type: "paragraph", content: [{ type: "text", text }] };
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

function experienceEntry(init: {
  organization: string;
  location: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}) {
  return {
    id: newId(),
    organization: init.organization,
    location: init.location,
    role: init.role,
    startDate: init.startDate,
    endDate: init.endDate,
    bullets: bulletDoc(init.bullets),
  };
}

export const longResume: ResumeDoc = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  blocks: [
    {
      id: newId(),
      type: "header",
      name: "Jordan Rivera",
      headline: "Staff Software Engineer · Platform & Infrastructure",
      contact: [
        { id: newId(), kind: "email", value: "jordan.rivera@example.com", label: "" },
        { id: newId(), kind: "phone", value: "+1 206 555 0147", label: "" },
        { id: newId(), kind: "location", value: "Seattle, WA", label: "" },
      ],
      links: [
        { id: newId(), label: "GitHub", href: "https://github.com/jordanrivera" },
        { id: newId(), label: "Website", href: "https://jordanrivera.dev" },
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
            "Staff engineer with twelve years building and operating large-scale distributed systems, developer platforms, and the teams that own them. Equally comfortable in incident response and long-horizon architecture.",
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
        { id: newId(), label: "Languages", items: ["Go", "Rust", "TypeScript", "Python", "SQL"] },
        { id: newId(), label: "Infrastructure", items: ["Kubernetes", "Terraform", "AWS", "GCP"] },
        { id: newId(), label: "Data", items: ["PostgreSQL", "Kafka", "ClickHouse", "Redis"] },
        { id: newId(), label: "Observability", items: ["Prometheus", "Grafana", "OpenTelemetry"] },
      ],
    },
    {
      id: newId(),
      type: "experience",
      title: "Experience",
      visible: true,
      entries: [
        experienceEntry({
          organization: "Helios Cloud",
          location: "Seattle, WA",
          role: "Staff Software Engineer",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Architected a multi-region control plane serving 40k internal deployments per day with a 99.99% success SLO.",
            "Led a five-engineer team migrating the orchestration layer from a monolith to event-driven services.",
            "Cut median deploy time from 14 minutes to under 3 by redesigning the build and artifact pipeline.",
            "Authored the platform's capacity-planning model, avoiding an estimated $2.1M in over-provisioning.",
          ],
        }),
        experienceEntry({
          organization: "Northwind Labs",
          location: "San Francisco, CA",
          role: "Senior Software Engineer",
          startDate: "2019",
          endDate: "2022",
          bullets: [
            "Owned the checkout reliability program, reducing p99 latency by 38% across the core flow.",
            "Built a self-serve feature-flag service adopted by 30+ teams within two quarters.",
            "Introduced a lightweight design-review process now standard across engineering.",
            "Mentored four engineers, two of whom were promoted to senior during the period.",
          ],
        }),
        experienceEntry({
          organization: "Cobalt Systems",
          location: "Remote",
          role: "Software Engineer",
          startDate: "2016",
          endDate: "2019",
          bullets: [
            "Built the billing reconciliation pipeline processing 2M events per day with exactly-once semantics.",
            "Cut nightly batch runtime from 6 hours to 45 minutes via incremental processing.",
            "Implemented the first end-to-end tracing across the payments stack.",
          ],
        }),
        experienceEntry({
          organization: "Beacon Analytics",
          location: "Austin, TX",
          role: "Software Engineer",
          startDate: "2014",
          endDate: "2016",
          bullets: [
            "Developed the ingestion service handling 500GB of event data daily.",
            "Reduced query costs 45% by introducing columnar storage and partition pruning.",
            "Shipped the customer-facing dashboards used by the company's 200 largest accounts.",
          ],
        }),
        experienceEntry({
          organization: "Quill Software",
          location: "Portland, OR",
          role: "Junior Software Engineer",
          startDate: "2012",
          endDate: "2014",
          bullets: [
            "Built REST APIs and background workers for a document-collaboration product.",
            "Added automated test coverage that caught a class of recurring data-loss bugs.",
            "Contributed the initial CI configuration adopted across the engineering org.",
          ],
        }),
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
          institution: "University of Washington",
          location: "Seattle, WA",
          credential: "M.S. in Computer Science",
          startDate: "2010",
          endDate: "2012",
          details: { type: "doc", content: [] },
        },
        {
          id: newId(),
          institution: "Oregon State University",
          location: "Corvallis, OR",
          credential: "B.S. in Computer Science",
          startDate: "2006",
          endDate: "2010",
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
          para("Maintainer of a widely-used Go rate-limiting library (4k+ stars)."),
          para("Regular contributor to the OpenTelemetry Collector."),
        ],
      },
    },
  ],
};
