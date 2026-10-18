-- 20261017230400_custom_domains_org_domain_route_recreate.sql
-- lane: DOMAINS-BUILD
-- lock: iam
-- chair-step: re-creates iam.org_domain_route (dropped by 20261017230300 so the parent could gain soft delete) and re-applies the client write REVOKE.
-- One table per transaction: ops.auth_lock_watchdog cancels a holder of the iam.users FK lock that keeps sign-in waiting > 3 s.

do $$
begin
  if to_regclass('iam.org_domain_route') is null then
    perform platform.create_entity_table(
      p_schema => 'iam', p_table => 'org_domain_route',
      p_token => 'iam_org_domain_route', p_label => 'Custom Domain Route',
      p_fields => array[
        'domain_id uuid NOT NULL REFERENCES iam.org_domain(id) ON DELETE CASCADE',
        $f$path_prefix text NOT NULL DEFAULT '/' CHECK (path_prefix ~ '^/([a-z0-9][a-z0-9-]*)?$')$f$,
        $f$target_kind text NOT NULL CHECK (target_kind IN ('form', 'booking', 'portal'))$f$,
        'target_id uuid NOT NULL'
      ],
      p_variant => 'component', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false,
      p_parents => array['iam_org_domain:domain_id']);
    alter table iam.org_domain_route add constraint org_domain_route_prefix_key unique (domain_id, path_prefix);
    create index if not exists org_domain_route_domain_idx on iam.org_domain_route (domain_id);
  end if;
end $$;

revoke insert, update, delete on iam.org_domain, iam.org_domain_route from anon, authenticated;

update platform.feature_knob set override_direction = 'any',
  description = '1 grants custom domains to this organization whatever its plan.',
  basis = 'Pre-launch every organization is on complimentary Pro, so testing needs a per-organization grant without touching plans or plan limits (Arman 2026-10-17). The knob ladder has no platform-only organization rung, so this is org-overridable.'
 where feature = 'custom_domains' and key = 'plan_exception';
