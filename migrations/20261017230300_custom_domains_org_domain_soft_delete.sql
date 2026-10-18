-- 20261017230300_custom_domains_org_domain_soft_delete.sql
-- lane: DOMAINS-BUILD
-- lock: iam
-- chair-step: drops and re-creates the two empty custom-domain tables so iam.org_domain carries soft delete (canonical_certify_ok was false on soft_delete); re-applies the client write REVOKE.
--
-- Also: custom_domains.plan_exception becomes override_direction 'any' — the resolver enforces lower_only at
-- read time, so a lower_only grant row could never resolve to 1. Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md

do $$
begin
  if exists (select 1 from iam.org_domain) then
    raise exception 'iam.org_domain has rows; this re-create is only for the empty table.';
  end if;
end $$;
drop table iam.org_domain_route;
drop table iam.org_domain;
delete from platform.entity_relationships where child_type = 'iam_org_domain_route' or parent_type = 'iam_org_domain';
delete from platform.entity_types where token in ('iam_org_domain_route', 'iam_org_domain');

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
      p_variant => 'entity', p_versioned => false, p_soft_delete => true,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    create unique index if not exists org_domain_host_live_key on iam.org_domain (host) where status <> 'removed';
  end if;
end $$;


