import "server-only";

export function getSiteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value) {
    throw new Error("Missing SITE_URL environment variable.");
  }

  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SITE_URL must use http or https.");
  }

  return url.origin;
}
