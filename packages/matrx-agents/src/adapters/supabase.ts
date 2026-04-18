/**
 * SupabaseLike — the narrow subset of the Supabase JS client the package uses.
 *
 * The real client (`@supabase/supabase-js` v2) has a much larger API. The
 * package only depends on the `rpc` + `from`-chain surface needed to read
 * cx_conversation bundles, call the CRUD RPCs, and do simple direct table
 * reads for fallback code paths.
 *
 * Consumers pass in a real `SupabaseClient` instance; TypeScript widens it
 * to this interface via structural typing.
 */

export interface SupabaseRpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseQueryBuilder<TRow> {
  select(columns?: string): SupabaseQueryBuilder<TRow>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<TRow>;
  is(column: string, value: unknown): SupabaseQueryBuilder<TRow>;
  neq(column: string, value: unknown): SupabaseQueryBuilder<TRow>;
  ilike(column: string, pattern: string): SupabaseQueryBuilder<TRow>;
  order(
    column: string,
    opts?: { ascending?: boolean },
  ): SupabaseQueryBuilder<TRow>;
  limit(count: number): SupabaseQueryBuilder<TRow>;
  range(from: number, to: number): SupabaseQueryBuilder<TRow>;
  single(): Promise<SupabaseRpcResult<TRow>>;
  update(patch: Partial<TRow>): SupabaseQueryBuilder<TRow>;
  then<R>(
    onFulfilled: (value: SupabaseRpcResult<TRow[]>) => R | PromiseLike<R>,
  ): Promise<R>;
}

export interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (name: string, params?: Record<string, unknown>) => Promise<SupabaseRpcResult<any>>;
  from: <TRow = unknown>(table: string) => SupabaseQueryBuilder<TRow>;
}
