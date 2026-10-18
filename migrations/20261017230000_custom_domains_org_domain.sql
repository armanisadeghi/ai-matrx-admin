-- 20261017230000_custom_domains_org_domain.sql
-- lane: DOMAINS-BUILD
-- lock: iam
--
-- A business serves its public pages on its own domain: iam.org_domain, one host per row (unique while not removed).
-- Split from one file: each create_entity_table holds a lock on iam.users (created_by FK) until commit,
-- and ops.auth_lock_watchdog cancels a holder that keeps sign-in waiting > 3 s. One table per transaction.
-- Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md

do $$
begin
  if to_regclass('iam.org_domain') is null then
    perform platform.create_entity_table(
      p_schema => 'iam', p_table => 'org_domain',
      p_token => 'iam_org_domain', p_label => 'Custom Domain',
      p_fields => array[
        $f$host text NOT NULL CHECK (host = lower(host) AND host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')$f$,
        $f$status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'live', 'failed', 'removed'))$f$,
        $f$verification jsonb NOT NULL DEFAULT '{}'::jsonb$f$,
        'last_check_at timestamptz',
        'last_error text'
      ],
      p_variant => 'entity', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    create unique index if not exists org_domain_host_live_key on iam.org_domain (host) where status <> 'removed';
  end if;
end $$;

