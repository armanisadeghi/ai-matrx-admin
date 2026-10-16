// MKT-182: Create with a brand name the person already has sat 3.5 minutes with no message. The duplicate check
// Create waits on had no bound, so a check that never answers held Create forever. It is bounded now: no answer in
// time = no match, and Create goes on (it offers, never blocks).
import { gateCreate } from "../createGate";

const probe = { domains: ["blue.example"], accounts: [], name: "The Blue Cake Company", place: null };

describe("gateCreate never holds Create on a hung duplicate check", () => {
  it("goes on when the check never answers", async () => {
    const asked: string[] = [];
    const out = await gateCreate({
      probe,
      find: () => new Promise(() => undefined),
      ask: async (q) => {
        asked.push(q.title);
        return true;
      },
      answered: new Set(),
      findTimeoutMs: 20,
    });
    expect(out.proceed).toBe(true);
    expect(asked).toEqual([]);
  });
});
