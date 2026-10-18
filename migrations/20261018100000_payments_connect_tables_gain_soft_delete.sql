-- 20261018100000_payments_connect_tables_gain_soft_delete.sql
-- lane: PAYMENTS-CONNECT-2
-- lock: billing
-- chair-step: drops and re-creates the three business-payments tables so they carry soft delete (iam.canonical_certify_ok was false on soft_delete); only test rows existed, the lane re-creates the ones it still needs.
--
-- Same approach as 20261017230300_custom_domains_org_domain_soft_delete.sql. The doors and server
-- functions from 20261017210000 / 20261017213000 survive (plpgsql binds tables at call time).
-- One table per transaction (ops.auth_lock_watchdog cancels a holder of the iam.users FK lock that
-- keeps sign-in waiting > 3 s): this file drops all three and re-creates billing.org_payment_account;
-- 20261018100100 re-creates billing.payment_ask, 20261018100200 billing.payment.
-- Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md

do $$
begin
  if exists (select 1 from billing.payment where livemode) or exists (select 1 from billing.org_payment_account where livemode) then
    raise exception 'billing payments hold live-mode rows; this re-create is only for test rows.';
  end if;
end $$;
drop table if exists billing.payment;
drop table if exists billing.payment_ask;
drop table if exists billing.org_payment_account;
delete from platform.entity_relationships
 where parent_type in ('billing_org_payment_account', 'billing_payment_ask', 'billing_payment')
    or child_type in ('billing_org_payment_account', 'billing_payment_ask', 'billing_payment');
delete from platform.entity_types where token in ('billing_org_payment_account', 'billing_payment_ask', 'billing_payment');

do $$
begin
  if to_regclass('billing.org_payment_account') is null then
    perform platform.create_entity_table(
      p_schema => 'billing', p_table => 'org_payment_account',
      p_token => 'billing_org_payment_account', p_label => 'Payment Account',
      p_fields => array[
        'stripe_account_id text NOT NULL UNIQUE',
        'livemode boolean NOT NULL DEFAULT false',
        'charges_enabled boolean NOT NULL DEFAULT false',
        'payouts_enabled boolean NOT NULL DEFAULT false',
        'details_submitted boolean NOT NULL DEFAULT false',
        'country text',
        'default_currency text',
        'display_name text',
        'connected_by uuid REFERENCES iam.users(id) ON DELETE SET NULL',
        'disconnected_at timestamptz'
      ],
      p_variant => 'entity', p_versioned => false, p_soft_delete => true,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    alter table billing.org_payment_account add constraint org_payment_account_org_key unique (organization_id);
    create index if not exists org_payment_account_connected_by_idx on billing.org_payment_account (connected_by);
  end if;
end $$;
