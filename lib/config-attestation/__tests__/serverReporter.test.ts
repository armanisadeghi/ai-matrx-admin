/**
 * The server reporter must send server-side reads through the SERVER door
 * (platform.config_reads_report_server, one device row per app+region), never the person door,
 * and must batch: many reads, one report. The recorder is the real @ai-matrx/data recorder.
 */
const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
const afterQueue: Array<() => Promise<void>> = [];

jest.mock("server-only", () => ({}));
jest.mock("next/server", () => ({ after: (fn: () => Promise<void>) => afterQueue.push(fn) }));
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({
    schema: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: 1, error: null };
      },
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { value: 15 }, error: null }) };
        return q;
      },
    }),
  }),
}));
jest.mock("../buildIdentity.server", () => ({ localBuildSha: () => "b".repeat(40), serverAppVersion: () => "0.4.1" }));

import { noteServerConfigRead, serverConfigAttestationCounters, serverInstanceKey } from "../serverReporter.server";

describe("server config-read reporter", () => {
  it("keys the device by region in production and by host in development", () => {
    expect(serverInstanceKey({ VERCEL_REGION: "iad1" } as unknown as NodeJS.ProcessEnv)).toBe("vercel-iad1");
    expect(serverInstanceKey({} as unknown as NodeJS.ProcessEnv)).toMatch(/^local-/);
  });

  it("batches reads into one report through config_reads_report_server", async () => {
    for (let i = 0; i < 50; i++) noteServerConfigRead("knob", "billing", "points_per_usd", "db", 100);
    noteServerConfigRead("knob", "marketing", "smart_add_quiet_seconds", "db", 3);
    // The first read makes a flush due (interval unknown yet); later reads ride the same window.
    expect(afterQueue).toHaveLength(1);
    await afterQueue[0]!();
    const reports = calls.filter((c) => c.name.startsWith("config_reads_report"));
    expect(reports.map((c) => c.name)).toEqual(["config_reads_report_server"]);
    const { p_report, p_instance } = reports[0]!.args as {
      p_report: { app: string; build_sha: string; reads: Array<{ feature: string; key: string; count: number }> };
      p_instance: { instance_key: string };
    };
    expect(p_report.app).toBe("ai-matrx");
    expect(p_report.build_sha).toBe("b".repeat(40));
    expect(p_instance.instance_key).toBe(serverInstanceKey());
    expect(p_report.reads.find((r) => r.key === "points_per_usd")?.count).toBe(50);
    expect(serverConfigAttestationCounters.reads).toBe(51);
    // A read right after a flush is not due again until the knob's interval passes.
    noteServerConfigRead("knob", "billing", "points_per_usd", "db", 100);
    expect(afterQueue).toHaveLength(1);
  });
});
