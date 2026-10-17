/**
 * fetchConsoleDevice returns the person's computer through a FAITHFUL Supabase builder double: like the real
 * PostgrestFilterBuilder it is thenable (awaiting it runs the query and yields `{ data, error }`, which has no
 * `.maybeSingle()`), filters chain, and `.maybeSingle()` runs a single-row read. The old form —
 * `onlyComputers(query, client).then((q) => q.maybeSingle())` — awaited the builder (running it) and then
 * called `.maybeSingle()` on the response; against this double that throws, so the test is red on it.
 */
import { __resetNonComputerPlatformsForTests } from "@/lib/app-instances/computers";

import { fetchConsoleDevice, fetchConsoleDevices, isTestDevice } from "./devices-query";

type Row = Record<string, unknown>;

/** A thenable builder over an in-memory table: eq / is / or(platform…) filter, then() runs, maybeSingle() runs one. */
class Builder implements PromiseLike<{ data: Row[]; error: null }> {
  constructor(private rows: Row[]) {}
  select(): this {
    return this;
  }
  eq(column: string, value: unknown): Builder {
    return new Builder(this.rows.filter((r) => r[column] === value));
  }
  is(column: string, value: null): Builder {
    return new Builder(this.rows.filter((r) => (r[column] ?? null) === value));
  }
  order(): this {
    return this;
  }
  /** Only the computer filter's shape: `platform.is.null,platform.not.in.("a","b")`. */
  or(filter: string): Builder {
    const m = /^platform\.is\.null,platform\.not\.in\.\((.*)\)$/.exec(filter);
    if (!m) throw new Error(`double: unsupported or() filter ${filter}`);
    const excluded = m[1].split(",").map((p) => p.replace(/"/g, ""));
    return new Builder(this.rows.filter((r) => r.platform == null || !excluded.includes(String(r.platform))));
  }
  maybeSingle(): Promise<{ data: Row | null; error: { message: string } | null }> {
    if (this.rows.length > 1) return Promise.resolve({ data: null, error: { message: "multiple rows" } });
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }
  then<A = { data: Row[]; error: null }, B = never>(
    onFulfilled?: ((value: { data: Row[]; error: null }) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    // The response object, exactly what the real builder resolves to: no builder methods on it.
    return Promise.resolve({ data: this.rows, error: null as null }).then(onFulfilled, onRejected);
  }
}

const ME = "user-1";
const ROWS: Row[] = [
  { id: "test-copy", user_id: ME, platform: "darwin", instance_id: "inst_automation_computer_f57e4101afd8b67e8a6f8a56665c323c", is_active: true, deleted_at: null },
  { id: "mac", user_id: ME, platform: "darwin", instance_id: "inst_aa12f3fb87a094fc61d8ad5fe49a4022", is_active: true, deleted_at: null },
  { id: "tab", user_id: ME, platform: "web", is_active: true, deleted_at: null },
  { id: "old", user_id: ME, platform: null, is_active: true, deleted_at: null },
  { id: "theirs", user_id: "user-2", platform: "darwin", is_active: true, deleted_at: null },
];

function client() {
  return {
    from: (table: string) => {
      if (table !== "app_instances") throw new Error(`double: unexpected table ${table}`);
      return new Builder(ROWS);
    },
    schema: (schema: string) => ({
      from: (table: string) => {
        if (schema !== "platform" || table !== "feature_knob") throw new Error(`double: unexpected ${schema}.${table}`);
        return new Builder([
          { feature: "platform.app_instances", key: "non_computer_platforms", value: ["web", "chrome-extension", "server"] },
        ]);
      },
    }),
  } as never;
}

beforeEach(() => __resetNonComputerPlatformsForTests());

describe("fetchConsoleDevice (one computer, through the computer filter)", () => {
  it("returns this person's computer row", async () => {
    await expect(fetchConsoleDevice(client(), ME, "mac")).resolves.toMatchObject({ id: "mac", platform: "darwin" });
  });

  it("a legacy row with no platform is a computer", async () => {
    await expect(fetchConsoleDevice(client(), ME, "old")).resolves.toMatchObject({ id: "old" });
  });

  it("a browser install is not a device here, and neither is someone else's computer", async () => {
    await expect(fetchConsoleDevice(client(), ME, "tab")).resolves.toBeNull();
    await expect(fetchConsoleDevice(client(), ME, "theirs")).resolves.toBeNull();
  });
});

describe("fetchConsoleDevices (the list, through onlyComputers)", () => {
  it("lists only this person's computers", async () => {
    const rows = (await fetchConsoleDevices(client(), ME)) as unknown as Row[];
    expect(rows.map((r) => r.id).sort()).toEqual(["mac", "old", "test-copy"]);
  });

  it("test copies sort after the person's own computers; a real installation's id is never a test mark", async () => {
    const rows = (await fetchConsoleDevices(client(), ME)) as unknown as Row[];
    expect(rows.map((r) => r.id)).toEqual(["mac", "old", "test-copy"]);
    expect(isTestDevice({ instance_id: "inst_aa12f3fb87a094fc61d8ad5fe49a4022" })).toBe(false);
    expect(isTestDevice({ instance_id: "server:aidream:host.local" })).toBe(false);
    expect(isTestDevice({ instance_id: null })).toBe(false);
  });
});
