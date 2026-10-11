// Guard: Education lists ONLY notes marked for Education.
//
// Regression (Arman, 2026-09-25): every platform note — drafts, chat saves,
// quick notes — was showing up in Education. The Notes app owns all notes;
// Education owns the Study Notes tag. This file fails when:
//   1. the one selector returns a plain note (behavioral, over an in-memory table
//      that honours the filters the query actually applies), or
//   2. any Education source file lists notes around the one selector, or


import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const mockReadAllRows = jest.fn();
const mockDefaultListFilter = jest.fn();
const schema = jest.fn();

jest.mock("@ai-matrx/data/db", () => ({ readAllRows: mockReadAllRows }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "learner-1" }));
jest.mock("@/lib/list-scope", () => ({ defaultListFilter: mockDefaultListFilter }));
jest.mock("@/features/notes/service/noteContextAssociations", () => ({
  hydrateNoteContextLinks: async (rows: unknown[]) => rows,
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema } }));

import {
  EDUCATION_NOTES_TAG,
  isEducationNote,
  listEducationNotes,
} from "../education-notes";

interface Row {
  id: string;
  created_by: string;
  tags: string[] | null;
  deleted_at: string | null;
  updated_at: string;
}

const TABLE: Row[] = [
  { id: "plain-draft", created_by: "learner-1", tags: ["Draft"], deleted_at: null, updated_at: "2026-09-25" },
  { id: "plain-unfiled", created_by: "learner-1", tags: null, deleted_at: null, updated_at: "2026-09-25" },
  { id: "plain-personal", created_by: "learner-1", tags: ["Personal"], deleted_at: null, updated_at: "2026-09-25" },
  { id: "lookalike-case", created_by: "learner-1", tags: ["study notes"], deleted_at: null, updated_at: "2026-09-25" },
  { id: "edu-mine", created_by: "learner-1", tags: ["Quiz", EDUCATION_NOTES_TAG], deleted_at: null, updated_at: "2026-09-24" },
  { id: "edu-teammate", created_by: "teammate", tags: ["Quiz", EDUCATION_NOTES_TAG], deleted_at: null, updated_at: "2026-09-23" },
  { id: "edu-deleted", created_by: "learner-1", tags: ["Quiz", EDUCATION_NOTES_TAG], deleted_at: "2026-09-20", updated_at: "2026-09-20" },
];

/** A PostgREST-shaped builder that really filters the table by what was asked. */
function tableQuery(rows: Row[]) {
  const preds: Array<(r: Row) => boolean> = [];
  const q = {
    select: () => q,
    eq: (col: keyof Row, val: unknown) => { preds.push((r) => r[col] === val); return q; },
    is: (col: keyof Row, val: null) => { preds.push((r) => r[col] === val); return q; },
    contains: (col: "tags", val: string[]) => { preds.push((r) => val.every((v) => r[col]?.includes(v))); return q; },
    order: () => q,
    range: async () => ({ data: rows.filter((r) => preds.every((p) => p(r))), error: null }),
  };
  return q;
}

beforeEach(() => {
  jest.clearAllMocks();
  schema.mockReturnValue({ from: () => tableQuery(TABLE) });
  mockReadAllRows.mockImplementation(async (loadPage) => {
    const result = await loadPage({ from: 0, to: 999 });
    return result.data ?? [];
  });
});

describe("the one Education note selector", () => {
  it("never returns a plain note — only notes marked for Education", async () => {
    mockDefaultListFilter.mockResolvedValue({ ownerOnly: false, apply: (q: unknown) => q });
    const ids = (await listEducationNotes()).map((n) => n.id);
    expect(ids.sort()).toEqual(["edu-mine", "edu-teammate"]);
  });

  it("the personal library narrows to my own Education notes", async () => {
    mockDefaultListFilter.mockResolvedValue({
      ownerOnly: true,
      apply: (q: any) => q.eq("created_by", "learner-1"),
    });
    const ids = (await listEducationNotes({ owner: "mine" })).map((n) => n.id);
    expect(ids).toEqual(["edu-mine"]);
    expect(mockDefaultListFilter).toHaveBeenCalledWith(
      "note",
      expect.objectContaining({ requested: "mine" }),
    );
  });

  it("the predicate is exact — a lookalike folder is not Education", () => {
    expect(isEducationNote({ tags: ["Quiz", EDUCATION_NOTES_TAG] })).toBe(true);
    for (const folder_name of ["Draft", null, undefined, "study notes", "Study Notes "]) {
      expect(isEducationNote({ folder_name })).toBe(false);
    }
  });
});

const REPO = path.resolve(__dirname, "../../../..");
const EDUCATION_ROOTS = ["features/education", "app/(core)/education", "app/api/education"];
const SELECTOR_FILE = "features/education/notes/education-notes.ts";
// Every way the codebase lists notes. A single-record read (getById) or a
// create is not a list and is allowed.
const NOTE_LIST_READS = [
  /NotesAPI\.(listItems|getAll)\b/,
  /\bfetchNote(ListItems|s)\s*\(/,
  /from\(\s*["']notes["']\s*\)/,
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !full.includes("__tests__")) out.push(full);
  }
  return out;
}

describe("every Education surface lists notes through the one selector", () => {
  it("no Education file reads a note list around education-notes.ts", () => {
    const offenders: string[] = [];
    for (const root of EDUCATION_ROOTS) {
      for (const file of walk(path.join(REPO, root))) {
        const rel = path.relative(REPO, file);
        if (rel === SELECTOR_FILE) continue;
        const src = readFileSync(file, "utf8");
        if (NOTE_LIST_READS.some((re) => re.test(src))) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

});
