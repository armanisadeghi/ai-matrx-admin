-- ops_agent_walks_burst_cap_2026_10_17 — burst slots for the live-database walk
-- cap, opened only while the machine has spare memory, and the idle expiry of a
-- preview hold.
--
-- WHY (2026-10-17): Arman, verbatim: "Update it so that it's normally maxes at 4
-- but that when another session needs it, they are permitted to go up to 8, as
-- long as they watch the memory and close it if it raises. Even at 4, I have my
-- system crash at least 5 times per day because of poor management and stale
-- sessions."
--
-- Read by the development-only gate in `utils/supabase/walkCap.ts` with the two
-- 2026-09-26 knobs (one PostgREST read, 60 s cache). Memory is measured by the
-- preview watchdog (`scripts/agent-dev-server.sh monitor`, every 2 s) into the
-- preview state dir; the gate reads that file.
--
--   production_burst_cap      = 8   Arman's number. Hosts 5..8 are BURST slots.
--   burst_admit_available_gb  = 64  A burst slot opens only while free+inactive+
--                                   speculative+purgeable memory is at least this
--                                   (and macOS reports normal pressure).
--   burst_shed_available_gb   = 32  Below this, or at macOS pressure warn/critical,
--                                   burst hosts are shed (oldest-idle first, one
--                                   per 5 s); a base host is never shed.
--   burst_admit_preview_gb    = 32  ... and only while the preview's own real memory
--                                   is under this (it recycles at 40 GB idle).
--   burst_shed_preview_gb     = 40  Preview at or over this: burst hosts are shed.
--   hold_idle_expire_minutes  = 20  A preview hold whose host made no signed-in
--                                   request for this long is removed (a hold whose
--                                   runner process is gone is removed at once).
--
-- Additive and idempotent: ON CONFLICT DO NOTHING never overwrites a human's
-- value. Reversible: DELETE the rows; the gate then screams and runs at the base
-- cap with no burst and no idle expiry.
--
-- Ledger: public._schema_migrations (source 'matrx-frontend', written by the runner).

INSERT INTO platform.feature_knob (
  feature, key, value, default_value, value_type, unit,
  min_value, max_value, label, description, set_by, basis, review_due,
  overridable_by, override_direction, propagation, public_read, ui
) VALUES
(
  'ops.agent_walks', 'production_burst_cap',
  '8'::jsonb, '8'::jsonb, 'integer', 'sessions',
  0, 50,
  'Agent browser walks allowed at once while memory is spare',
  'Above the normal cap, up to this many preview hosts may be signed in against the live database at once, but only while the machine has spare memory. Extra hosts are paused first when memory rises. At or below the normal cap there is no burst.',
  'agent',
  'Arman, 2026-10-17: "normally maxes at 4 but that when another session needs it, they are permitted to go up to 8, as long as they watch the memory and close it if it raises."',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
),
(
  'ops.agent_walks', 'burst_admit_available_gb',
  '64'::jsonb, '64'::jsonb, 'integer', 'gigabytes',
  0, 1024,
  'Agent browser walks: free memory needed to open an extra slot',
  'An extra (burst) walk slot opens only while the machine has at least this much free plus reclaimable memory and macOS reports normal memory pressure.',
  'agent',
  'Measured 2026-10-17 on the 256 GB host: every jetsam event (10-10, 10-11, 10-14, 10-15, 10-17) fired with free pages near zero and swap exhausted; 64 GB keeps a quarter of the machine clear before any walk beyond the normal four is let in.',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
),
(
  'ops.agent_walks', 'burst_shed_available_gb',
  '32'::jsonb, '32'::jsonb, 'integer', 'gigabytes',
  0, 1024,
  'Agent browser walks: free memory below which extra slots close',
  'Below this much free plus reclaimable memory, or at macOS memory pressure warn or critical, walks in extra slots are paused one by one, longest idle first. A walk in a normal slot is never paused for memory.',
  'agent',
  'Half the admit threshold, so a slot is not opened and closed on every small swing; still well above the zero-free state every 2026-10 jetsam event recorded.',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
),
(
  'ops.agent_walks', 'burst_admit_preview_gb',
  '32'::jsonb, '32'::jsonb, 'integer', 'gigabytes',
  0, 1024,
  'Agent browser walks: preview size under which extra slots open',
  'An extra walk slot opens only while the shared preview server''s own real memory is under this.',
  'agent',
  'The preview recycles at 40 GB once idle and restarts at 48 GB; 32 GB leaves room for the extra walks'' compiles before either fires.',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
),
(
  'ops.agent_walks', 'burst_shed_preview_gb',
  '40'::jsonb, '40'::jsonb, 'integer', 'gigabytes',
  0, 1024,
  'Agent browser walks: preview size at which extra slots close',
  'When the shared preview server''s real memory reaches this, walks in extra slots are paused one by one.',
  'agent',
  'Equal to the preview''s idle recycle size (MATRX_PREVIEW_RECYCLE_GB 40): past it the server is headed for the 48 GB restart that drops every session at once.',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
),
(
  'ops.agent_walks', 'hold_idle_expire_minutes',
  '20'::jsonb, '20'::jsonb, 'integer', 'minutes',
  1, 180,
  'Preview holds: minutes without a signed-in request before a hold ends',
  'A test run''s hold on the shared preview ends once its host has made no signed-in request for this long. A hold whose runner process has ended is removed at once.',
  'agent',
  'Measured 2026-10-17 21:55: seven holds were live on the preview at once, two of them from agent sessions silent for 25 and 37 minutes (one with 98 minutes still on it); any one hold blocks every idle recycle, and that day the preview reached its 48 GB restart while held. Twenty minutes outlasts a slow cold compile plus a long read of the screen.',
  (current_date + 30),
  '{}'::text[], 'any', 'next_load', false, '{}'::jsonb
)
ON CONFLICT (feature, key) DO NOTHING;
