/**
 * FT-1 (2026-10-21): /trash timed out at 9 s for a person with ~27,000 archived rows. The page must ask the
 * database for ONE bounded page, never for "everything". Red against the old code: `listTrash()` sent
 * p_limit 200 per kind and honoured any larger limit a caller passed.
 */
const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ supabase: { rpc, schema: () => ({ rpc }) } }));

import { listTrash, TRASH_DEFAULT_PAGE } from "../service";

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: [], error: null });
});

test("an unbounded listTrash() asks for one page per kind, not 200", async () => {
  await listTrash();
  expect(rpc).toHaveBeenCalledWith("trash_list", expect.objectContaining({ p_limit: TRASH_DEFAULT_PAGE, p_offset: 0 }));
  expect(TRASH_DEFAULT_PAGE).toBeLessThanOrEqual(50);
});

test("a caller cannot ask for more than one page", async () => {
  await listTrash({ limit: 5000 });
  const args = rpc.mock.calls[0][1] as { p_limit: number };
  expect(args.p_limit).toBe(TRASH_DEFAULT_PAGE);
});

test("a smaller overview page is kept as asked", async () => {
  await listTrash({ limit: 10, offset: 0 });
  expect(rpc.mock.calls[0][1]).toEqual(expect.objectContaining({ p_limit: 10, p_offset: 0 }));
});
