import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { ScopeCellEmpty } from "../ScopeCellEmpty";

const hubSource = readFileSync(join(__dirname, "..", "ScopesHub.tsx"), "utf8");

describe("a /scopes hub cell waits without dimming the table", () => {
  it("never marks the hub tables as re-reading while only the cells load", () => {
    // isFetching draws the table's refresh bar under the section toolbar and dims every row.
    expect(hubSource).not.toMatch(/isFetching=/);
  });

  it("draws its placeholder through ScopeCellEmpty in full muted ink", () => {
    expect(hubSource).toMatch(/<ScopeCellEmpty loading=/);
    expect(renderToStaticMarkup(<ScopeCellEmpty loading />)).toBe(
      '<span class="text-muted-foreground" aria-busy="true">…</span>',
    );
  });

  it("says empty with a dash once the read answered", () => {
    expect(renderToStaticMarkup(<ScopeCellEmpty loading={false} />)).toBe(
      '<span class="text-muted-foreground">—</span>',
    );
  });
});
