import { describe, expect, it, vi, beforeEach } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import { enforceGenerationRateLimit } from "./index";

const allow = { data: true, error: null };
const deny = { data: false, error: null };

beforeEach(() => rpc.mockReset());

describe("enforceGenerationRateLimit", () => {
  it("allows when both the per-user and per-IP windows are under the limit", async () => {
    rpc.mockResolvedValue(allow);
    const result = await enforceGenerationRateLimit({ userId: "u1", ip: "1.2.3.4" });

    expect(result).toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][1].p_key).toBe("gen:user:u1");
    expect(rpc.mock.calls[1][1].p_key).toBe("gen:ip:1.2.3.4");
  });

  it("denies and short-circuits when the per-user limit is exceeded", async () => {
    rpc.mockResolvedValueOnce(deny);
    const result = await enforceGenerationRateLimit({ userId: "u1", ip: "1.2.3.4" });

    expect(result).toEqual({ allowed: false });
    expect(rpc).toHaveBeenCalledTimes(1); // never reaches the IP check
  });

  it("denies when the per-IP limit is exceeded", async () => {
    rpc.mockResolvedValueOnce(allow).mockResolvedValueOnce(deny);
    const result = await enforceGenerationRateLimit({ userId: "u1", ip: "1.2.3.4" });

    expect(result).toEqual({ allowed: false });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("fails open when the limiter errors (the provider 429 is the real backstop)", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    const result = await enforceGenerationRateLimit({ userId: "u1", ip: "1.2.3.4" });

    expect(result).toEqual({ allowed: true });
  });
});
