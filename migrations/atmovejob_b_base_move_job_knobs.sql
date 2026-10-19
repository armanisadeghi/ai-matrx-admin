-- AT-MOVEJOB part 2: the two budgets of a base move (chair ruling 2026-10-19: big base moves run as a server job).
--   records.base_move_direct_max_rows — a base with more rows than this moves as a server job (POST /base-move/jobs);
--     at or under it the Move dialog calls custom.base_move directly, as before.
--   records.base_move_job_statement_seconds — the statement budget set on the JOB's own transaction (never on a client role).
INSERT INTO platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value, label, description,
   set_by, basis, review_due, overridable_by, override_direction, propagation, public_read)
VALUES
  ('records', 'base_move_direct_max_rows', '250'::jsonb, '250'::jsonb, 'integer', 'rows', 0, 100000,
   'Rows a base may hold and still move directly',
   'A base with more rows than this moves as a background job on the server, with a progress line; smaller bases move at once from the browser.',
   'agent', 'Agent-set limit, AT-MOVEJOB 2026-10-19: a 30-row linked base moves in about 1.1-1.5 s (after the validators-once fix); at ~15-20 ms a row 250 rows stays inside the 8 s client budget with room under load.',
   '2027-01-19', array[]::text[], 'any', 'next_load', true),
  ('records', 'base_move_job_statement_seconds', '600'::jsonb, '600'::jsonb, 'integer', 's', 30, 3600,
   'Longest a base-move job may run',
   'The statement budget the server sets on its own transaction for one base move. Past it the move is undone and the screen says to try again.',
   'agent', 'Agent-set limit, AT-MOVEJOB 2026-10-19: 2x1000 linked rows extrapolated ~23 s before the fix; 600 s covers bases ~25x larger without holding locks unbounded.',
   '2027-01-19', array[]::text[], 'any', 'next_load', false);
