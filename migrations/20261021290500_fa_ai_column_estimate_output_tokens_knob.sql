-- 20261021290500_fa_ai_column_estimate_output_tokens_knob.sql
-- lane: FIX-AI4 (FA-)
-- CD-AI-04 — the confirm step before an AI column fill shows its points BEFORE any run. Until a column has
-- measured runs, the server prices one row from the bound agent's model × the input it would send (row values +
-- instruction) + this typical answer size. Real runs replace the estimate with their measured per-row cost.
insert into platform.feature_knob
 (feature, key, value, default_value, value_type, unit, min_value, max_value,
  allowed_values, label, description, set_by, basis, review_due,
  overridable_by, override_direction)
values
 ('custom', 'enrichment_estimate_output_tokens', '200', '200', 'integer', 'tokens', 1, 16000,
  null, 'AI column estimate: typical answer size per row',
  'Before an AI column has run, its fill estimate assumes each row''s answer is this many tokens.',
  'agent', 'FIX-AI4 2026-10-21: live runs of table.column_fill answered 50–330 output tokens a row (median ~150); 200 leans honest-high.',
  current_date + 45, '{organization}', 'any')
on conflict (feature, key) do nothing;
