const readAllRows = jest.fn();
const operations: Array<[string, ...unknown[]]> = [];

function chain() {
  const q = {
    select: (...args: unknown[]) => (operations.push(["select", ...args]), q),
    eq: (...args: unknown[]) => (operations.push(["eq", ...args]), q),
    is: (...args: unknown[]) => (operations.push(["is", ...args]), q),
    not: (...args: unknown[]) => (operations.push(["not", ...args]), q),
    order: (...args: unknown[]) => (operations.push(["order", ...args]), q),
    range: (...args: unknown[]) => (operations.push(["range", ...args]), Promise.resolve({ data: [], error: null, count: 0 })),
  };
  return q;
}

jest.mock("@ai-matrx/data/db", () => ({ readAllRows }));
jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ from: () => chain() }) },
}));

import { readArchivedKitOutlineRows, readKitOutlineRows } from "../outlineService";

beforeEach(() => {
  operations.length = 0;
  readAllRows.mockImplementation(async (page: (range: { from: number; to: number }) => Promise<unknown>) => {
    await page({ from: 0, to: 999 });
    return [];
  });
});

describe("kit outline archive reads", () => {
  it("keeps active sections as the generation projection", async () => {
    await readKitOutlineRows("kit-1");
    expect(operations).toContainEqual(["is", "archived_at", null]);
    expect(operations).not.toContainEqual(["not", "archived_at", "is", null]);
  });

  it("reads archived sections through the separate disclosure query", async () => {
    await readArchivedKitOutlineRows("kit-1");
    expect(operations).toContainEqual(["not", "archived_at", "is", null]);
    expect(operations).not.toContainEqual(["is", "archived_at", null]);
  });
});
