-- 20261022140000_org_spend_cap_presets_knob.sql
-- lane: FIX-SURFACES. The org-admin roster's bulk "Set spend cap" offers these monthly caps (points; 20,000 points = $1).
-- It was a list in code; a limit is a knob. A missing row raises (no code fallback).
insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value,
   allowed_values, label, description, set_by, basis, review_due,
   overridable_by, override_direction)
values
  ('organizations', 'spend_cap_presets_points', '["100000", "500000", "1000000", "5000000"]', '["100000", "500000", "1000000", "5000000"]',
   'json', null, null, null, null,
   'Roster spend-cap choices',
   'The monthly spend caps (in points) an organization admin can set on many members at once. "No limit" is always offered.',
   'agent',
   'FIX-SURFACES 2026-10-22: moved from a list in code (100k / 500k / 1M / 5M points) so an organization can pick its own steps.',
   current_date + 45, '{organization}', 'any')
on conflict (feature, key) do nothing;
