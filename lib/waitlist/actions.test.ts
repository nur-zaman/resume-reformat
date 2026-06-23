import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, upsert } = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  return { from, upsert };
});
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({ enforceWaitlistRateLimit: enforce }));

const { ip } = vi.hoisted(() => ({ ip: vi.fn() }));
vi.mock("@/lib/http/client-ip", () => ({ clientIp: ip }));

import { joinWaitlist, type WaitlistState } from "./actions";

const idle: WaitlistState = { status: "idle" };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  from.mockClear();
  upsert.mockReset().mockResolvedValue({ error: null });
  enforce.mockReset().mockResolvedValue({ allowed: true });
  ip.mockReset().mockResolvedValue("1.2.3.4");
});

describe("joinWaitlist", () => {
  it("inserts a normalized email and reports success", async () => {
    const result = await joinWaitlist(idle, form({ email: "  Person@Example.COM " }));

    expect(result).toEqual({ status: "success" });
    expect(upsert).toHaveBeenCalledWith(
      { email: "person@example.com", source: "landing" },
      { onConflict: "email", ignoreDuplicates: true },
    );
  });

  it("rejects an invalid email before touching the limiter or database", async () => {
    const result = await joinWaitlist(idle, form({ email: "not-an-email" }));

    expect(result).toEqual({ status: "error", message: "Enter a valid email address." });
    expect(enforce).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("silently drops a honeypot hit as success without inserting", async () => {
    const result = await joinWaitlist(
      idle,
      form({ email: "real@example.com", company_website: "spam" }),
    );

    expect(result).toEqual({ status: "success" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns an error when the per-IP limit is exceeded", async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await joinWaitlist(idle, form({ email: "real@example.com" }));

    expect(result.status).toBe("error");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns a generic error when the insert fails", async () => {
    upsert.mockResolvedValue({ error: { code: "XX000", message: "boom" } });
    const result = await joinWaitlist(idle, form({ email: "real@example.com" }));

    expect(result).toEqual({ status: "error", message: "Something went wrong. Please try again." });
  });
});
