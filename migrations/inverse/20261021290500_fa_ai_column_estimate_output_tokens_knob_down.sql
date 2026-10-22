-- inverse of 20261021290500_fa_ai_column_estimate_output_tokens_knob.sql
-- lane: FIX-AI4 (FA-)
-- chair-step: drops the custom.enrichment_estimate_output_tokens knob.
delete from platform.feature_knob where feature = 'custom' and key = 'enrichment_estimate_output_tokens';
