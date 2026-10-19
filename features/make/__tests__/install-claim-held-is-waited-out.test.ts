// features/make/__tests__/install-claim-held-is-waited-out.test.ts
//
// THE USE CASE (ADVERSARIAL-4 N5, 2026-10-19). The first Nonprofit Fundraising Desk install said "The template's
// assistant was not made: '… Nonprofit Fundraising Desk 2' is being made in another tab or window" with no other
// tab open; Try again finished it. The store's claim (custom.template_install_claim) is per install and per title,
// and answers `held` while an earlier claim on that title is inside its lease. Two runs of the host steps for the
// SAME install were in flight in ONE tab (a remount re-ran the install while the first run's steps went on), so the
// second met the first's fresh claim and refused.
//
// BREAKS THIS CATCHES: a second run in the same tab claiming beside the first (false "another tab") · a hold that
// is refused at once instead of waited out (the holder finishes a few seconds later) · a hold past its lease
// taken as success.

jest.mock("@/features/templates/agentCopyHost", () => ({ templateAgentCopier: jest.fn(), templateAgentArchiver: jest.fn() }));

import { addInstalledAgent, type Claim, type InstallAnswer } from "../gallery/installAgent";

const answerFor = (installId: string): InstallAnswer => ({
  install_id: installId,
  state: "installed",
  done: true,
  made: [{ kind: "table", id: "tbl-1", ref: "tables.donors", title: "Donors", table_id: null }],
  agent: { platform_agent: { id: "plat-1", name: "Fundraising Desk" }, name: "Desk assistant · Nonprofit 2", copied: false, bindings: [] },
});

/** The store's claim, as custom.template_install_claim answers it: the first claim wins, a second inside the lease is held. */
function storeClaim(leaseMs = 180_000) {
  const claims = new Map<string, { at: number; id: string | null }>();
  const claim = jest.fn(async (_install: string, kind: string, label: string): Promise<Claim> => {
    const k = `${kind}:${label}`;
    const c = claims.get(k);
    if (c?.id) return { state: "made", id: c.id };
    if (c && Date.now() - c.at < leaseMs) return { state: "held", retryAt: new Date(c.at + leaseMs).toISOString() };
    claims.set(k, { at: Date.now(), id: null });
    return { state: "claimed", orphans: [] };
  });
  const record = (kind: string, label: string, id: string) => claims.set(`${kind}:${label}`, { at: Date.now(), id });
  return { claim, record };
}

describe("an install's claim is never refused for a run of its own, and a hold is waited out", () => {
  it("two runs of one install in the same tab: one copy, both succeed, no 'another tab'", async () => {
    const s = storeClaim();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const copier = jest.fn(async () => {
      await gate;
      return { agentId: "agent-1" };
    });
    const note = jest.fn(async (installId: string, id: string, label: string) => {
      s.record("agent", label, id);
      return { ...answerFor(installId), made: [...(answerFor(installId).made ?? []), { kind: "agent", id, ref: "agent", title: label, table_id: null }] } as InstallAnswer;
    });
    const ports = { copier, note, claim: s.claim, wait: jest.fn(async () => undefined) };
    const first = addInstalledAgent(answerFor("inst-race"), "org-1", ports);
    const second = addInstalledAgent(answerFor("inst-race"), "org-1", ports);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toMatchObject({ ok: true });
    expect(b).toMatchObject({ ok: true });
    expect(copier).toHaveBeenCalledTimes(1);
  });

  it("a claim held by a run elsewhere is waited out and the copy it made is used", async () => {
    let asks = 0;
    const claim = jest.fn(async (): Promise<Claim> => {
      asks += 1;
      return asks < 3 ? { state: "held", retryAt: new Date(Date.now() + 180_000).toISOString() } : { state: "made", id: "agent-elsewhere" };
    });
    const copier = jest.fn();
    const note = jest.fn(async (installId: string) => answerFor(installId));
    const wait = jest.fn(async () => undefined);
    const r = await addInstalledAgent(answerFor("inst-held"), "org-1", { copier, note, claim, wait });
    expect(r).toMatchObject({ ok: true });
    expect(copier).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith("inst-held", "agent-elsewhere", "Desk assistant · Nonprofit 2");
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("a hold that outlives its lease still refuses by name", async () => {
    const claim = jest.fn(async (): Promise<Claim> => ({ state: "held", retryAt: new Date(Date.now() - 60_000).toISOString() }));
    const r = await addInstalledAgent(answerFor("inst-stuck"), "org-1", { copier: jest.fn(), note: jest.fn(), claim, wait: jest.fn(async () => undefined) });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toMatch(/being made in another tab or window/);
  });
});
