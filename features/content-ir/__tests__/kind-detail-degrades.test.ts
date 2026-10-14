/**
 * SHAPES-BUGS 2.1: a per-kind page whose read does not answer degrades to an
 * honest "unavailable" result — it never throws (a thrown read was a 500 for
 * the whole page) — and it never reads the whole-catalog gather.
 */
jest.mock("server-only", () => ({}), { virtual: true });

const rpc = jest.fn();
let hang = true;

/** A PostgREST-like builder: every call chains; awaiting it hangs or answers empty. */
function builder(): unknown {
  const target = function () {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => {
          if (!hang) resolve({ data: [], error: null });
        };
      }
      return () => builder();
    },
  });
}

jest.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    rpc: (...args: unknown[]) => rpc(...args),
    schema: () => builder(),
  }),
}));

import { gatherKindDetail, setKindGatherDeadlineMsForTests } from "../admin/shape-doctor-server";

beforeEach(() => {
  rpc.mockClear();
  setKindGatherDeadlineMsForTests(30);
});

it("a read that never answers is 'unavailable', not a throw", async () => {
  hang = true;
  const result = await gatherKindDetail("brand_basics");
  expect(result.status).toBe("unavailable");
  expect(rpc).not.toHaveBeenCalled();
});

it("a kind that is not there is 'missing'", async () => {
  hang = false;
  const result = await gatherKindDetail("brand_basics");
  expect(result.status).toBe("missing");
  expect(rpc).not.toHaveBeenCalled();
});
