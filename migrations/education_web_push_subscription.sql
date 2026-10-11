-- draft: education-push lane — new table; apply to production only with Arman watching (owner ruling 2026-10-11)
-- Web push for study reminders (owner, 2026-10-11: "Yes but gentle.").
--
-- communication.push_subscription: one row per (person, browser) that said yes to
-- push. The browser writes its own row directly (personal visibility, RLS from
-- iam.apply_rls through create_entity_table); the aidream sender reads it with the
-- service pool, stamps last_success_at, and disables a row the push service says is
-- gone (404/410). Turning push off on a device soft-deletes that device's row.
--
-- Knobs (feature `education.reminders`): every gentle limit is a row, never a constant.

do $$
begin
  if to_regclass('communication.push_subscription') is null then
    perform platform.create_entity_table(
      p_schema => 'communication', p_table => 'push_subscription',
      p_token => 'push_subscription', p_label => 'Push Subscription',
      p_fields => array[
        'endpoint text NOT NULL',
        'p256dh text NOT NULL',
        'auth_secret text NOT NULL',
        'user_agent text',
        'device_label text',
        'last_success_at timestamptz',
        'last_failure_at timestamptz',
        'failure_count integer NOT NULL DEFAULT 0',
        'disabled_at timestamptz',
        'disabled_reason text'
      ],
      p_variant => 'entity', p_versioned => false, p_soft_delete => true,
      p_visibility => 'personal', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
  end if;
end $$;

-- One live row per person per browser; a person re-subscribing the same browser
-- updates their row instead of adding a twin.
create unique index if not exists push_subscription_owner_endpoint_uidx
  on communication.push_subscription (created_by, endpoint)
  where deleted_at is null;

create index if not exists push_subscription_active_owner_idx
  on communication.push_subscription (created_by)
  where deleted_at is null and disabled_at is null;

insert into platform.feature_knob
  (feature, key, value, default_value, value_type, label, description, set_by, basis, review_due,
   overridable_by, override_direction, min_value, max_value)
values
  ('education.reminders', 'push_max_per_day', '1', '1', 'integer', 'Study pushes per day',
   'Most study reminder pushes one person gets in a day.', 'agent',
   'Owner 2026-10-11 "Yes but gentle": one nudge a day, Duolingo minus the guilt', '2026-12-01',
   '{organization}', 'lower_only', 0, 3),
  ('education.reminders', 'push_quiet_start_hour', '21', '21', 'integer', 'Quiet hours start',
   'Local hour study pushes stop when a person set none.', 'agent',
   'Gentle default: no study pushes in the evening', '2026-12-01',
   '{organization}', 'any', 0, 23),
  ('education.reminders', 'push_quiet_end_hour', '8', '8', 'integer', 'Quiet hours end',
   'Local hour study pushes may resume when a person set none.', 'agent',
   'Gentle default: nothing before the morning', '2026-12-01',
   '{organization}', 'any', 0, 23),
  ('education.reminders', 'streak_risk_after_hour', '19', '19', 'integer', 'Streak nudge after',
   'Local hour after which an unstudied day may get a streak nudge.', 'agent',
   'Late in the day only, so it reads as help, not pressure', '2026-12-01',
   '{organization}', 'any', 12, 22)
on conflict (feature, key) do nothing;
