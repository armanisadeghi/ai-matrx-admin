-- LIST-RPC HELPERS INLINE (2026-10-16), sibling of 20261016210000_cvx_list_reads_fit_the_statement_ceiling.
-- A SQL function carrying a SET clause is never inlined: the planner calls it once per row with a
-- configuration save/restore around each call. These two are pure expressions (no table read, only
-- pg_catalog operators), evaluated per row by public.shx_list_scoped, so the setting protected nothing
-- and cost a real call per row. Guard: pnpm check:list-rpc-helpers-inline.
alter function public.shx_search_score(text, text, text, text, text, text) reset search_path;
alter function public.shx_since_bucket(text) reset search_path;
