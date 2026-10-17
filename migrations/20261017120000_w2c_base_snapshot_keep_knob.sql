-- lane: W2-C
-- lock: platform
-- Seeds ONE knob, custom.base_snapshot_keep (how many scheduled snapshots of a base are kept). No schema change.
-- Inverse: migrations/inverse/20261017120000_w2c_base_snapshot_keep_knob_down.sql.
--
-- Scheduled base snapshots (aidream services/base_snapshots) keep this many of a base's scheduled snapshots; older ones are
-- moved to Trash (the snapshot retention policy purges them 90 days after). Manual snapshots are never counted or trashed.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

insert into platform.feature_knob (feature, key, value, default_value, value_type, unit, min_value, max_value,
                                   label, description, set_by, basis, review_due, overridable_by)
values
  ('custom', 'base_snapshot_keep', to_jsonb(30), to_jsonb(30), 'integer', 'snapshots', 1, 365,
   'Scheduled snapshots kept per base',
   'How many of a base''s scheduled snapshots are kept; each new one past this count moves the oldest scheduled one to Trash. Snapshots a person took by hand are never counted.',
   'agent', 'W2-C brief 2026-10-17: retention count is a knob, default 30 (a month of daily or half a year of weekly snapshots).', date '2027-01-17', '{organization}')
on conflict (feature, key) do nothing;
