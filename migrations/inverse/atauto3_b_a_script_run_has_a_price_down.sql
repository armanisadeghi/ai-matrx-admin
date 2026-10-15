-- chair-step: AT-AUTO3 inverse of atauto3_b — removes the price row that was seeded (a script run then records unpriced again).
delete from platform.feature_knob where feature = 'platform.external_api_prices' and key = 'matrx_sandbox_automation_script_usd';
