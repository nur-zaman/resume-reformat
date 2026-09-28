// Tiptap serializes every node with `attrs: { contentId: null }` (a global attribute),
// but the schema forbids null — strip null/undefined attr values and drop emptied attrs.
export function normalizeRichTextJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeRichTextJson);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === "attrs" && val && typeof val === "object" && !Array.isArray(val)) {
        const attrs: Record<string, unknown> = {};
        for (const [attrKey, attrVal] of Object.entries(val as Record<string, unknown>)) {
          if (attrVal !== null && attrVal !== undefined) attrs[attrKey] = attrVal;
        }
        if (Object.keys(attrs).length > 0) result.attrs = attrs;
      } else if (key === "content" || key === "marks") {
        result[key] = normalizeRichTextJson(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  return value;
}
