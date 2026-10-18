-- 20261018100200_payments_connect_payment_recreate.sql
-- lane: PAYMENTS-CONNECT-2
-- lock: billing
-- chair-step: re-creates billing.payment with soft delete (dropped by 20261018100000), with its indexes and same-org trigger.

do $$
begin
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
      p_variant => 'entity', p_versioned => false, p_soft_delete => true,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
    create index if not exists payment_record_idx on billing.payment (organization_id, record_id);
    create index if not exists payment_intent_idx on billing.payment (stripe_payment_intent_id);
    create index if not exists payment_ask_idx on billing.payment (ask_id);
    create trigger trg_same_org_billing_payment_ask_id before insert or update of ask_id on billing.payment
      for each row execute function platform.assert_same_org('ask_id', 'billing.payment_ask');
  end if;
end $$;
