-- chair-step: withdraw W2-C: removes the custom.base_snapshot_keep knob.
-- lock: platform
-- Inverse of 20261017120000_w2c_base_snapshot_keep_knob.sql.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

delete from platform.feature_knob where feature = 'custom' and key = 'base_snapshot_keep';
