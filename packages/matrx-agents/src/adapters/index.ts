/**
 * Adapter surface — every dependency the `@matrx/agents` package needs from
 * its host environment. Consumers satisfy these by passing concrete impls
 * into `configure()` at boot.
 *
 * Design rule: nothing in this package imports Next.js, RN, the app's
 * Supabase client, or the app's Redux store. Everything external funnels
 * through an interface here.
 */

export type {
  SupabaseLike,
  SupabaseQueryBuilder,
  SupabaseRpcResult,
} from "./supabase";
export type { FetchLike } from "./fetch";
export type { CallbackManagerLike } from "./callback-manager";
export type { LoggerLike } from "./logger";
export type { AuthLike, Credentials } from "./auth";
