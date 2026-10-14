const operations: Array<[string, ...unknown[]]> = [];

function query(table: string) {
  const result = table === "processed_documents"
    ? { data: [{ id: "document-1" }], error: null }
    : { data: [], error: null };
  const q = {
    select: (...args: unknown[]) => (operations.push([`${table}.select`, ...args]), q),
    eq: (...args: unknown[]) => (operations.push([`${table}.eq`, ...args]), q),
    is: (...args: unknown[]) => (operations.push([`${table}.is`, ...args]), q),
    order: (...args: unknown[]) => (operations.push([`${table}.order`, ...args]), q),
    limit: (...args: unknown[]) => (operations.push([`${table}.limit`, ...args]), q),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return q;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/docprocDb", () => ({
  docprocDb: () => ({ from: (table: string) => query(table) }),
}));
jest.mock("@/utils/supabase/ragDb", () => ({ ragDb: () => ({ from: (table: string) => query(table) }) }));

import { readRecordCitedFacts } from "./useCitedChunk";

describe("record citation lineage", () => {
  it("never follows a soft-deleted processed document while retaining archived lineage", async () => {
    operations.length = 0;
    await expect(readRecordCitedFacts("record-1", null)).resolves.toMatchObject({ error: null });
    expect(operations).toContainEqual(["processed_documents.is", "deleted_at", null]);
    expect(
      operations.some(
        ([operation, ...args]) => operation.startsWith("processed_documents.") && args.includes("archived_at"),
      ),
    ).toBe(false);
  });
});
