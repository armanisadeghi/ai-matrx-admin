-- mandate.run_history 500 on first load (2026-10-22).
--
-- The Runs tab said "Couldn't load runs" on first open and loaded on retry: the RPC took 8-16 s
-- (platform view, key realtests.pb07_canary) against the API's statement timeout, so the cold call
-- was cancelled (PostgREST 500) and the warm retry squeaked under it. Cause: the two lanes that find
-- a mandate's runs by key had no index on the key expression —
--   * chat.user_request: `coalesce(metadata->>'mandate_key', substring(source_feature from '^mandate:(.+)$'))`
--     was a sequential scan that detoasts every row's metadata (8.3 s of the 15.8 s);
--   * workflow.run: `metadata->'_mandate'->'chain'->>-1` (0.7 s, and growing with every run).
-- (runtime.global_execution already had global_execution_ctx_mandate_idx.)
-- Measured after: 15.8 s -> 78 ms for the same call. Idempotent; applied to the live database.

create index if not exists user_request_mandate_key_idx
  on chat.user_request ((coalesce(metadata ->> 'mandate_key', substring(source_feature from '^mandate:(.+)$'))))
  where coalesce(metadata ->> 'mandate_key', substring(source_feature from '^mandate:(.+)$')) is not null
    and deleted_at is null;

create index if not exists run_mandate_chain_last_idx
  on workflow.run (((metadata -> '_mandate' -> 'chain' ->> -1)))
  where metadata ? '_mandate' and deleted_at is null;
