/**
 * @jest-environment jsdom
 *
 * A SIGNED-OUT visitor must not hit app_config at all: anon has no grant on the table, so the
 * read was a certain 42501 (+ 401, + a client-error report) on every guest page view. With no
 * session the door asks nothing and says so (skipped), and never returns an error.
 */
import { invalidateWebAppConfig, readAppConfigKey, readAppFlag } from "../appConfig";

let session: unknown = null;
const from = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session } }) },
    from: (...a: unknown[]) => {
      from(...a);
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.is = () => q;
      q.maybeSingle = async () => ({ data: { config: { notice: null }, min_supported_app_version: "0.1.0" }, error: null });
      return q;
    },
  }),
}));

beforeEach(() => {
  from.mockClear();
  invalidateWebAppConfig();
});

test("guest: no query, no error, skipped", async () => {
  session = null;
  for (const key of ["notice", "min_supported_app_version"] as const) {
    const r = await readAppConfigKey(key);
    expect(r).toMatchObject({ value: undefined, found: false, error: null, skipped: true });
  }
  expect((await readAppFlag("x")).error).toBeNull();
  expect(from).not.toHaveBeenCalled();
});

test("signed in: reads the row as before, and a guest skip is not cached into it", async () => {
  session = null;
  await readAppConfigKey("notice");
  session = { user: {} };
  const r = await readAppConfigKey<string>("min_supported_app_version");
  expect(r).toMatchObject({ value: "0.1.0", found: true, error: null });
  expect(r.skipped).toBe(false);
  expect(from).toHaveBeenCalledTimes(1);
});
