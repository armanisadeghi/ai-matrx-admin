/**
 * DB lane A (2026-10-21): every Vercel lambda kept its own 30 s copy of the public catalog, so the
 * gallery, its category/job pages, the sitemap and OG images re-read all ~7 pages of
 * `public.templates_public` about once a minute (2,869 calls / 1,029 s of database time in 5.7 h).
 * Each catalog page now lives in Next's shared data cache, which every process of a deployment reads.
 * Model that cache here (one store shared by two freshly loaded copies of the module = two lambdas).
 */
jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ ...jest.requireActual("react"), cache: <T,>(fn: T) => fn }));

type Options = { revalidate?: number; tags?: string[] };
const shared = new Map<string, unknown>();
const seenOptions: Options[] = [];
jest.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: unknown[]) => Promise<unknown>, keyParts: string[], options: Options) => {
      seenOptions.push(options);
      return async (...args: unknown[]) => {
        const key = JSON.stringify([keyParts, args]);
        if (shared.has(key)) return shared.get(key);
        const value = await fn(...args); // a throw is never stored, as in Next
        shared.set(key, value);
        return value;
      };
    },
}));

const rpc = jest.fn();
jest.mock("@/utils/supabase/getScriptClient", () => ({
  getScriptSupabaseClient: () => ({ schema: () => ({ rpc }) }),
}));

function freshLambda(): typeof import("../gallery/publicCatalogue.server") {
  let mod!: typeof import("../gallery/publicCatalogue.server");
  jest.isolateModules(() => {
    mod = jest.requireActual("../gallery/publicCatalogue.server");
  });
  return mod;
}

beforeEach(() => {
  shared.clear();
  rpc.mockReset();
});

it("two server processes share one catalog read, kept for at least ten minutes under its tag", async () => {
  rpc.mockResolvedValue({ data: { cards: [], total: 0 }, error: null });
  await freshLambda().readPublicCatalogue();
  await freshLambda().readPublicCatalogue();
  expect(rpc).toHaveBeenCalledTimes(1);
  const options = seenOptions[seenOptions.length - 1];
  expect(options.revalidate).toBeGreaterThanOrEqual(600);
  expect(options.tags).toContain("templates-public");
});

it("a failed page is never kept: the next process asks again", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } });
  rpc.mockResolvedValue({ data: { cards: [], total: 0 }, error: null });
  expect((await freshLambda().readPublicCatalogue()).state).toBe("timed_out");
  expect((await freshLambda().readPublicCatalogue()).state).toBe("open");
  expect(rpc).toHaveBeenCalledTimes(2);
});
