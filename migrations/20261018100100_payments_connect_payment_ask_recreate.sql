-- 20261018100100_payments_connect_payment_ask_recreate.sql
-- lane: PAYMENTS-CONNECT-2
-- lock: billing
-- chair-step: re-creates billing.payment_ask with soft delete (dropped by 20261018100000).

do $$
begin
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
      p_variant => 'entity', p_versioned => false, p_soft_delete => true,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    alter table billing.payment_ask add constraint payment_ask_subject_key unique (subject_kind, subject_id);
    alter table billing.payment_ask add constraint payment_ask_amount_shape check (
      (amount_mode = 'fixed' and amount_cents is not null) or (amount_mode = 'field' and amount_field is not null));
  end if;
end $$;
