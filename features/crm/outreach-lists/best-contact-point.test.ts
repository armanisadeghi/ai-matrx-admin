/**
 * Parity: the best-address rule runs the SAME fixture the server door runs
 * (aidream `aidream/services/crm/tests/best_contact_point_cases.json`). The
 * inline cases below always run; the shared fixture runs whenever the aidream
 * checkout sits beside this one (the workspace layout), and says so when not.
 */
import fs from "fs";
import path from "path";

import { pickBestContactPoints } from "./best-contact-point";

interface SharedCase {
  name: string;
  list_kind: string;
  points: Parameters<typeof pickBestContactPoints>[0];
  expected: Record<string, string>;
}

const SHARED_PATH = path.resolve(
  __dirname,
  "../../../../aidream/aidream/services/crm/tests/best_contact_point_cases.json",
);
const shared: { today: string; cases: SharedCase[] } | null = fs.existsSync(
  SHARED_PATH,
)
  ? JSON.parse(fs.readFileSync(SHARED_PATH, "utf8"))
  : null;

const toObject = (m: Map<string, string>) => Object.fromEntries(m);

describe("pickBestContactPoints — shared fixture with the server door", () => {
  if (!shared) {
    it.skip(`SHARED FIXTURE MISSING at ${SHARED_PATH} — parity not checked`, () => {});
    // eslint-disable-next-line no-console
    console.warn(
      `[parity] best_contact_point_cases.json not found at ${SHARED_PATH}`,
    );
    return;
  }
  it.each(shared.cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    expect(
      toObject(pickBestContactPoints(c.points, c.list_kind, shared.today)),
    ).toEqual(c.expected);
    expect(
      toObject(
        pickBestContactPoints(
          [...c.points].reverse(),
          c.list_kind,
          shared.today,
        ),
      ),
    ).toEqual(c.expected);
  });
});

describe("pickBestContactPoints — inline", () => {
  const today = "2026-10-22";
  it("skips opted-out and expired addresses", () => {
    const got = pickBestContactPoints(
      [
        {
          id: "x",
          party_id: "a",
          channel: "email",
          is_primary: true,
          opt_out_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "y",
          party_id: "a",
          channel: "email",
          is_primary: true,
          valid_to: "2026-10-21",
        },
        { id: "z", party_id: "a", channel: "phone", is_primary: false },
      ],
      "email",
      today,
    );
    expect(toObject(got)).toEqual({ a: "z" });
  });
  it("breaks ties by confidence then sort_order, not row order", () => {
    const rows = [
      {
        id: "b",
        party_id: "a",
        channel: "email",
        is_primary: true,
        confidence: 50,
        sort_order: 2,
      },
      {
        id: "a",
        party_id: "a",
        channel: "email",
        is_primary: true,
        confidence: 50,
        sort_order: 1,
      },
      {
        id: "c",
        party_id: "a",
        channel: "email",
        is_primary: true,
        confidence: 10,
        sort_order: 0,
      },
    ];
    expect(toObject(pickBestContactPoints(rows, "email", today))).toEqual({
      a: "a",
    });
    expect(
      toObject(pickBestContactPoints([...rows].reverse(), "email", today)),
    ).toEqual({ a: "a" });
  });
});
