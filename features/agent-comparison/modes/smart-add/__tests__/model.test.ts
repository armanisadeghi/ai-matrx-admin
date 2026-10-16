import {
  buildSetup,
  cellsToRun,
  emptyBench,
  mergeResults,
  normalizeUrl,
  readBatchCell,
  readJevCell,
  readRuns,
  score,
  stanceOfKind,
  type BenchState,
} from "../model";
import type { MatrixCell } from "../../matrix/types";

const STANCES = { ours: "ours", review_site: "about_us", location: "associated", not_us: "not_us", namesake: "not_us", maybe: "about_us" };

function bench(): BenchState {
  const b = emptyBench();
  b.brand = { website: "https://www.owencyclery.com/", name: "Owen Cyclery", place: "Lancaster, PA", accounts: "" };
  b.results = mergeResults([
    { engine: "google", query: '"Owen Cyclery"', page: 1, pageSize: 10, result: { results: [
      { url: "https://www.owencyclery.com/", title: "Owen Cyclery", snippet: "Bike shop" },
      { url: "https://www.yelp.com/biz/owen-cyclery?utm_source=x", title: "Yelp", snippet: "Reviews" },
    ] } },
    { engine: "brave", query: '"Owen Cyclery"', page: 1, pageSize: 20, result: { results: [
      { url: "https://owencyclery.com", title: "Owen Cyclery", description: "Bikes" },
      { url: "https://owen-cycles.co.uk/", title: "Owen Cycles UK", description: "Another shop" },
    ] } },
  ]);
  b.stances = STANCES;
  b.systems = ["holder", "jev"];
  return b;
}

test("one address per result; every sighting kept", () => {
  const b = bench();
  expect(b.results.map((r) => r.key)).toEqual(["owencyclery.com", "yelp.com/biz/owen-cyclery", "owen-cycles.co.uk"]);
  expect(b.results[0].hits).toHaveLength(2);
  expect(normalizeUrl("https://www.yelp.com/biz/owen-cyclery?utm_source=x")).toBe("yelp.com/biz/owen-cyclery");
});

test("Jev runs per result, the holder per batch of 25, never crossed", () => {
  const b = bench();
  const setup = buildSetup(b, []);
  const cells = cellsToRun(setup, ["holder", "jev"]);
  expect(cells.filter((c) => c.column_id === "jev")).toHaveLength(3);
  expect(cells.filter((c) => c.column_id === "holder")).toEqual([{ row_id: "batch:0", column_id: "holder", repeat: 0 }]);
});

test("stances come from the vocabulary; undecided keys are can't tell", () => {
  expect(stanceOfKind("location", STANCES)).toBe("about_us");
  expect(stanceOfKind("maybe", STANCES)).toBe("cant_tell");
  expect(stanceOfKind("needs_person", STANCES)).toBe("cant_tell");
  expect(stanceOfKind(undefined, STANCES)).toBe("cant_tell");
});

test("answers are read from each system's own output", () => {
  const jev = readJevCell(JSON.stringify({ answers: { stance: { answer: "ours", probabilities: { ours: 0.9, not_us: 0.1 } }, kind: { answer: "ours" } } }));
  expect(jev).toEqual({ stance: "ours", label: "ours", probability: 0.9 });
  const batch = readBatchCell("```json\n" + JSON.stringify({ results: [{ url: "https://owencyclery.com/", kind: "ours", probability: 0.97 }] }) + "\n```", STANCES);
  expect(batch.get("owencyclery.com")?.stance).toBe("ours");
});

function cell(rowId: string, columnId: string, answer: string, ms: number, cost: number): MatrixCell {
  return { entryId: rowId + columnId, conversationId: `conv-${rowId}`, rowId, columnId, repeat: 0, status: "completed", stalled: false,
    attempt: 1, startedAt: null, finishedAt: null, error: null, request: null, history: [],
    result: { answer, duration_ms: ms, cost } };
}

test("the score counts only marked results, against the truth", () => {
  const b = bench();
  b.truth = { "owencyclery.com": "ours", "yelp.com/biz/owen-cyclery": "about_us", "owen-cycles.co.uk": "not_us" };
  const j = (stance: string) => JSON.stringify({ answers: { stance: { answer: stance, probabilities: { [stance]: 0.8 } } } });
  const runs = readRuns([
    cell("owencyclery.com", "jev", j("ours"), 700, 0.00005),
    cell("yelp.com/biz/owen-cyclery", "jev", j("about_us"), 800, 0.00005),
    cell("owen-cycles.co.uk", "jev", j("ours"), 900, 0.00005),
    cell("batch:0", "holder", JSON.stringify({ results: [
      { url: "https://www.owencyclery.com/", kind: "ours" },
      { url: "https://www.yelp.com/biz/owen-cyclery?utm_source=x", kind: "review_site" },
      { url: "https://owen-cycles.co.uk/", kind: "namesake" },
    ] }), 12000, 0.012),
  ], b);
  const jev = score(runs.jev, b.truth);
  expect([jev.right, jev.wrong, jev.falseOurs]).toEqual([2, 1, 1]);
  expect(jev.calls).toBe(3);
  const holder = score(runs.holder, b.truth);
  expect([holder.right, holder.wrong, holder.calls]).toEqual([3, 0, 1]);
  expect(runs.jev.conversations.get("owencyclery.com")).toBe("conv-owencyclery.com");
});
