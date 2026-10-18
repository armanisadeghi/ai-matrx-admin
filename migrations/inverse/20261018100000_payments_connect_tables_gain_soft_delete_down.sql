-- inverse of 20261018100000_payments_connect_tables_gain_soft_delete.sql
-- lane: PAYMENTS-CONNECT-2
-- chair-step: restores the three business-payments tables WITHOUT soft delete (the 20261017210000 shape); drops every payment, ask and connected-account row.
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
      p_variant => 'entity', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    alter table billing.org_payment_account add constraint org_payment_account_org_key unique (organization_id);
    create index if not exists org_payment_account_connected_by_idx on billing.org_payment_account (connected_by);
  end if;
  if to_regclass('billing.payment_ask') is null then
    perform platform.create_entity_table(
      p_schema => 'billing', p_table => 'payment_ask',
      p_token => 'billing_payment_ask', p_label => 'Payment Ask',
      p_fields => array[
        $f$subject_kind text NOT NULL CHECK (subject_kind IN ('form', 'table'))$f$,
        'subject_id uuid NOT NULL',
        'table_id uuid NOT NULL',
        'enabled boolean NOT NULL DEFAULT true',
        $f$amount_mode text NOT NULL DEFAULT 'fixed' CHECK (amount_mode IN ('fixed', 'field'))$f$,
        'amount_cents integer CHECK (amount_cents IS NULL OR amount_cents >= 50)',
        'amount_field text',
        $f$currency text NOT NULL DEFAULT 'usd' CHECK (currency ~ '^[a-z]{3}$')$f$,
        'description text',
        $f$status_field_key text NOT NULL DEFAULT 'payment'$f$
      ],
      p_variant => 'entity', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    alter table billing.payment_ask add constraint payment_ask_subject_key unique (subject_kind, subject_id);
    alter table billing.payment_ask add constraint payment_ask_amount_shape check (
      (amount_mode = 'fixed' and amount_cents is not null) or (amount_mode = 'field' and amount_field is not null));
  end if;
  if to_regclass('billing.payment') is null then
    perform platform.create_entity_table(
      p_schema => 'billing', p_table => 'payment',
      p_token => 'billing_payment', p_label => 'Payment',
      p_fields => array[
        'ask_id uuid REFERENCES billing.payment_ask(id) ON DELETE SET NULL',
        'subject_kind text NOT NULL',
        'subject_id uuid NOT NULL',
        'record_id uuid NOT NULL',
        'amount_cents integer NOT NULL CHECK (amount_cents > 0)',
        'currency text NOT NULL',
        'description text',
        'stripe_account_id text NOT NULL',
        'livemode boolean NOT NULL DEFAULT false',
        'stripe_checkout_session_id text UNIQUE',
        'stripe_payment_intent_id text',
        $f$status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded'))$f$,
        'paid_at timestamptz'
      ],
      p_variant => 'entity', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    create index if not exists payment_record_idx on billing.payment (organization_id, record_id);
    create index if not exists payment_intent_idx on billing.payment (stripe_payment_intent_id);
    create index if not exists payment_ask_idx on billing.payment (ask_id);
    create trigger trg_same_org_billing_payment_ask_id before insert or update of ask_id on billing.payment
      for each row execute function platform.assert_same_org('ask_id', 'billing.payment_ask');
  end if;
end $$;
