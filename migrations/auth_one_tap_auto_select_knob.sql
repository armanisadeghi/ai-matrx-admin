-- Google One Tap: a returning Google account is signed in on arrival unless an organization says otherwise.
-- Read on the server for signed-out visitors (features/auth/one-tap/oneTapAutoSelect.server.ts).
-- First seeded live through the MCP on 2026-10-14; this file is the seed of record (a re-seed changes nothing).
insert into platform.feature_knob
  (feature, key, value, default_value, value_type, label, description,
   set_by, basis, review_due, overridable_by, override_direction)
values
  ('auth', 'one_tap_auto_select', 'true'::jsonb, 'true'::jsonb, 'boolean',
   'Sign returning visitors in with Google automatically',
   'A signed-out visitor who has used Google here before is signed back in on arrival, with a moment to cancel. Off: they see the Continue as prompt and click it.',
   'agent',
   'Airtable, Medium and Pinterest auto-select returning Google accounts through One Tap; Google limits it to one automatic sign-in per 10 minutes and the visitor can cancel. Arman, 2026-10-14: default on.',
   date '2026-12-14', '{organization}'::text[], 'any')
on conflict (feature, key) do nothing;
