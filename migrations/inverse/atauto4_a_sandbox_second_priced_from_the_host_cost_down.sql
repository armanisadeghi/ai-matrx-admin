-- chair-step: AT-AUTO4 inverse of atauto4_a — puts back atauto3_b's starting guess.
update platform.feature_knob
   set value = '0.00003'::jsonb, default_value = '0.00003'::jsonb,
       basis = 'A small always-on sandbox box is about $0.11/hour = $0.00003/second (AT-AUTO3, 2026-10-15). Verify against the sandbox tier price.',
       review_due = date '2026-10-29'
 where feature = 'platform.external_api_prices' and key = 'matrx_sandbox_automation_script_usd';
