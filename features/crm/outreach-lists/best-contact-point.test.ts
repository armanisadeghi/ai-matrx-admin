/**
 * Parity: the best-address rule runs the SAME cases the server door runs. This
 * repo carries its own copy (`best-contact-point.cases.json`), so the cases
 * always run — in CI too. Wherever the aidream checkout sits beside this one,
 * the copy must be byte-identical to aidream's
 * `aidream/services/crm/tests/best_contact_point_cases.json` (aidream checks
 * the same from its side).
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

const LOCAL_PATH = path.resolve(__dirname, "best-contact-point.cases.json");
const AIDREAM_PATH = path.resolve(
  __dirname,
  "../../../../aidream/aidream/services/crm/tests/best_contact_point_cases.json",
);
const shared: { today: string; cases: SharedCase[] } = JSON.parse(
  fs.readFileSync(LOCAL_PATH, "utf8"),
);

const toObject = (m: Map<string, string>) => Object.fromEntries(m);

describe("pickBestContactPoints — shared cases with the server door", () => {
  it("has cases to run", () => {
    expect(shared.cases.length).toBeGreaterThan(0);
  });
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

describe("best-contact-point.cases.json — byte-identical to aidream's", () => {
  if (!fs.existsSync(AIDREAM_PATH)) {
    it.skip(`PARITY NOT CHECKED: aidream checkout not beside this one (${AIDREAM_PATH})`, () => {});
    return;
  }
  it("matches aidream byte for byte", () => {
    expect(fs.readFileSync(LOCAL_PATH)).toEqual(fs.readFileSync(AIDREAM_PATH));
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
