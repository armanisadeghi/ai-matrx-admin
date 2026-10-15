-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: AT-AUTO3
-- lock: platform
--
-- AT-AUTO3: a table automation's script run is metered as matrx_sandbox:automation_script, units = whole seconds of the
-- person's own sandbox box (aidream services/automations/script_runner.py). The spend rails price units from the knob
-- platform.external_api_prices.<provider>_<operation>_usd, and this one had no row, so a live run (2026-10-15 18:26Z)
-- landed on the ledger at cost 0 — free. This seeds it. The value is an agent-chosen starting point with a dated review:
-- a small always-on box is about $0.11/hour = $0.00003/second, charged per second the script holds the box.
-- Inverse: migrations/inverse/atauto3_b_a_script_run_has_a_price_down.sql.
insert into platform.feature_knob (feature, key, value, default_value, value_type, unit, min_value, max_value, label, description, set_by, basis, review_due)
values ('platform.external_api_prices', 'matrx_sandbox_automation_script_usd', '0.00003'::jsonb, '0.00003'::jsonb, 'number', 'USD per sandbox second', 0, 1,
        'What one second of an automation script costs us',
        'Every second a table automation script holds the person''s sandbox is charged like any other hard cost.',
        'agent', 'A small always-on sandbox box is about $0.11/hour = $0.00003/second (AT-AUTO3, 2026-10-15). Verify against the sandbox tier price.', date '2026-10-29')
on conflict (feature, key) do nothing;
