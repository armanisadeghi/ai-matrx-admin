import { asStringList, normalizeRoomProfilePatch } from "../brand-room-write";

const HASHTAGS = ["hashtags"] as const;

describe("normalizeRoomProfilePatch — agent writes fail loudly, never reshape", () => {
  it("accepts well-formed hashtags", () => {
    const profile = normalizeRoomProfilePatch("messaging_hashtags", HASHTAGS, {}, {
      hashtags: [{ tag: "#shredding", use: "branded" }],
    });
    expect(profile.hashtags).toEqual([{ tag: "#shredding", use: "branded" }]);
  });

  it("rejects an unknown hashtag use instead of coercing it to branded", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_hashtags", HASHTAGS, {}, {
        hashtags: [{ tag: "#x", use: "bogus" }],
      }),
    ).toThrow(/use must be one of/);
  });

  it("rejects a hashtag with no use", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_hashtags", HASHTAGS, {}, { hashtags: [{ tag: "#x" }] }),
    ).toThrow(/use must be a non-empty string/);
  });

  it("rejects unknown pillar fields instead of dropping them", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_pillars", ["messaging_pillars"], {}, {
        messaging_pillars: [{ title: "Trust", proof_points: ["20 years"], extra: 1 }],
      }),
    ).toThrow(/unknown field\(s\) extra/);
  });

  it("rejects non-string proof points", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_pillars", ["messaging_pillars"], {}, {
        messaging_pillars: [{ title: "Trust", proof_points: [20] }],
      }),
    ).toThrow(/proof_points must be an array of strings/);
  });

  it("rejects a field outside the target's allowlist", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_hashtags", HASHTAGS, {}, { mission: "x" }),
    ).toThrow(/unknown field\(s\) mission/);
  });

  it("rejects an unknown elevator pitch length", () => {
    expect(() =>
      normalizeRoomProfilePatch("messaging_elevator_pitches", ["elevator_pitches"], {}, {
        elevator_pitches: { two_minute: "x" },
      }),
    ).toThrow(/unknown field two_minute/);
  });
});

describe("asStringList", () => {
  it("takes a string array and refuses anything else", () => {
    expect(asStringList("claims_approved", ["a", "b"])).toEqual(["a", "b"]);
    expect(() => asStringList("claims_approved", "a")).toThrow(/FULL list/);
    expect(() => asStringList("claims_approved", ["a", 1])).toThrow(/FULL list/);
  });
});
