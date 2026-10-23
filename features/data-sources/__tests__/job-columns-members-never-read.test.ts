// Members read scraper.data_fetch_job client-direct, so no select there may name the columns that carry money or
// vendor detail (cost_usd, metadata, the raw result which can hold billed-but-unstored records). They read
// member_result / row_key_field instead; admins get cost through the server's "Under the hood" route.
import { readFileSync } from "fs";
import { join } from "path";

const FILES = ["hooks.ts", "library/runHistory.ts", "library/runTiming.ts"];

test.each(FILES)("%s never selects cost_usd, metadata or the raw result of a job", (f) => {
  const src = readFileSync(join(__dirname, "..", f), "utf8");
  const selects = [...src.matchAll(/\.select\(\s*"([^"]*)"/g)].map((m) => m[1]).concat(src.match(/JOB_COLUMNS\s*=\s*\n?\s*"([^"]*)"/)?.[1] ?? []);
  for (const cols of selects) {
    const names = cols.split(",").map((c) => c.trim());
    expect(names).not.toContain("cost_usd");
    expect(names).not.toContain("metadata");
    expect(names).not.toContain("result");
    expect(cols).not.toMatch(/metadata->/);
  }
});
