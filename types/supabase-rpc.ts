/**
 * Utilities for consuming Supabase RPC return types with safe TypeScript checking.
 *
 * Problem: Supabase generates `Json` for any JSONB/JSON column. `Json` is a
 * wide recursive union (string | number | boolean | null | {...} | Json[]).
 * When your interface field says `settings: LLMParams`, TypeScript rejects the
 * assignment because `Json` is not assignable to `LLMParams` — even though at
 * runtime the data is exactly right.
 *
 * Solution: `DbRpcRow<F>` replaces every `Json` occurrence in the generated
 * return type with `unknown`. This produces a type you can structurally compare
 * against your own interface without fighting the Json union, while still
 * enforcing that every non-Json field (string, number, boolean, string[], etc.)
 * matches exactly.
 *
 * Usage — enforce that your interface matches the DB row at compile time:
 *
 *   import type { DbRpcRow } from "@/types/supabase-rpc";
 *
 *   // In thunks.ts or types.ts, next to the interface:
 *   export interface AgentVersionHistoryItem
 *     extends DbRpcRow<"get_agent_version_history"> {
 *     // No body needed — the extends IS the check.
 *     // Add fields here only when you need to narrow a type beyond what the DB returns.
 *   }
 *
 *   // OR use satisfies for interfaces that already exist:
 *   export interface AgentExecutionFull { ... }
 *   true satisfies AgentExecutionFull extends DbRpcRow<"get_agent_execution_full"> ? true : false;
 *
 * Casting in thunks — zero runtime code:
 *
 *   const row = (data as unknown[])[0] as DbRpcRow<"get_agent_execution_full">;
 *   // or directly as your interface since it extends DbRpcRow:
 *   const row = (data as unknown[])[0] as AgentExecutionFull;
 */

import type { Database, Json } from "./database.types";

/** Replace every `Json` occurrence in T with `unknown`. */
export type JsonToUnknown<T> = T extends Json
  ? unknown
  : T extends Array<infer U>
    ? Array<JsonToUnknown<U>>
    : T extends object
      ? { [K in keyof T]: JsonToUnknown<T[K]> }
      : T;

/**
 * The single row type returned by a Supabase RPC function,
 * with all `Json` fields replaced by `unknown`.
 *
 * For RPCs that return `Json` directly (not a typed row object),
 * this resolves to `unknown` — which is intentional.
 * Those RPCs have no DB-level schema to enforce.
 */
export type DbRpcRow<F extends keyof Database["public"]["Functions"]> =
  JsonToUnknown<
    Database["public"]["Functions"][F]["Returns"] extends Array<infer Row>
      ? Row
      : Database["public"]["Functions"][F]["Returns"]
  >;
