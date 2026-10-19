/**
 * D-4 — the walk's labels are encoded ONCE, by summon's link grammar v2. The address module used to
 * percent-encode them itself on top of the grammar, so a label holding a literal `%41` came back
 * as `A`. Round-trips through the exact writer (formatLinkToken) and reader (parseLinkParam) the
 * link manager uses.
 */
import { formatLinkToken } from "@ai-matrx/summon/open";
import { parsePanels } from "@/features/overlays/definitions/__tests__/linkKit";
import { REVIEW_WALK_URL_KEY, reviewWalkLabelsFromUrlArgs, reviewWalkUrlArgs, reviewWalkUrlId } from "../address";

const UNIT = "3f9a1c2e-7b4d-4e8a-9c1f-0a2b3c4d5e6f";

function roundTrip(labels: Parameters<typeof reviewWalkUrlArgs>[0]) {
  const token = formatLinkToken({
    key: REVIEW_WALK_URL_KEY,
    id: reviewWalkUrlId({ unitKind: "agent_request", unitId: UNIT }),
    args: reviewWalkUrlArgs(labels),
  });
  // through the address bar, as a reload reads it
  const qs = new URLSearchParams();
  qs.set("panels", token);
  const [parsed] = parsePanels(new URLSearchParams(qs.toString()).get("panels")!);
  return { token, labels: reviewWalkLabelsFromUrlArgs(parsed!.args) };
}

describe("review walk labels ride the link encoded once", () => {
  it("keeps a literal %41, hyphens, underscores, commas and colons", () => {
    const labels = {
      agentName: "Price-cut %41 bot",
      roleLabel: "Live_run, pair: 2",
      detailLabel: "50%-off — a-b-c",
    };
    expect(roundTrip(labels).labels).toEqual(labels);
  });

  it("writes no %25 escapes of its own (one encoding layer)", () => {
    const { token } = roundTrip({ agentName: "A-B" });
    expect(token).toContain("n-A%2DB");
    expect(token).not.toContain("%25");
  });

  it("clamps and trims as before", () => {
    const long = "x".repeat(120);
    expect(roundTrip({ agentName: `  ${long}  ` }).labels.agentName).toBe("x".repeat(80));
    expect(reviewWalkUrlArgs({ agentName: "   " })).toBeUndefined();
  });
});
