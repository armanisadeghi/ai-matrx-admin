-- 20261017230100_custom_domains_org_domain_route.sql
-- lane: DOMAINS-BUILD
-- lock: iam
--
-- iam.org_domain_route: which published form, booking page or portal each path of a connected domain shows.
-- Split from one file: each create_entity_table holds a lock on iam.users (created_by FK) until commit,
-- and ops.auth_lock_watchdog cancels a holder that keeps sign-in waiting > 3 s. One table per transaction.
-- Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md

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
