-- 20261018153000_payments_minors_refunds_soft_delete_amount_knob.sql
-- lane: PAYMENTS-FIX
-- lock: billing
-- chair-step: REVIEW-PAYMENTS minors — the new service-only door billing.payment_refund must not keep PUBLIC's default EXECUTE.
-- based-on: billing.org_payments_status(uuid) f6a5475ae0f993c8ae0972e24f344335d7cf6bfaedb58a8e5e21f8fb5be0852f
-- based-on: billing.payment_ask_set(uuid, text, uuid, jsonb) cf3aeba4c06423e50c475acaa02ddce4cf4f146bcc18fc019e83bbb69b8a6cd3
-- based-on: billing.payment_asks(uuid) c98e9ad357800b4c4fae8c974353dd4d3f57e0706b6d8e8be37f4e61024621f9
--
-- REVIEW-PAYMENTS minors:
--  M1  partial refunds: billing.payment.refunded_cents, and billing.payment_refund(intent, amount_refunded)
--      — a partial refund keeps the payment paid and writes "Partially refunded 5.00 USD" into the
--      record; a full refund settles 'refunded' as before. Called by the Connect webhook (charge.refunded).
--  M3  upper amount bound: knob billing.payments / max_charge_cents (agent default 1,000,000 = 10,000.00),
--      read by the server before a checkout opens.
--  M4  soft-deleted rows: org_payments_status, payment_asks skip deleted rows; payment_ask_set revives a
--      deleted ask instead of leaving an enabled-but-invisible one.

alter table billing.payment add column if not exists refunded_cents integer not null default 0 check (refunded_cents >= 0);

insert into platform.feature_knob
 (feature, key, value, default_value, value_type, unit, min_value, max_value,
  allowed_values, label, description, set_by, basis, review_due,
  overridable_by, override_direction)
values
 ('billing.payments', 'max_charge_cents', '1000000', '1000000', 'integer', 'cents', 50, 99999999,
  null, 'Largest single payment a form, booking or portal asks for',
  'A payment above this is refused before Stripe is asked, with a sentence to the payer.',
  'agent', 'REVIEW-PAYMENTS M3: unbounded amounts left orphan pending rows and leaked Stripe/int4 errors. 10,000.00 covers invoices and bookings; Stripe''s own card ceiling is 999,999.99.',
  current_date + 45, '{organization}', 'any')
on conflict (feature, key) do nothing;

create or replace function billing.payment_refund(p_payment_intent_id text, p_amount_refunded_cents integer)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  p billing.payment;
  v_key text;
  v_actor uuid;
  v_held text;
  v_word text;
begin
  select * into p from billing.payment
   where stripe_payment_intent_id = p_payment_intent_id and deleted_at is null for update;
  if p.id is null then
    return jsonb_build_object('settled', false, 'reason', 'unknown_payment_intent');
  end if;
  if p_amount_refunded_cents is null or p_amount_refunded_cents <= 0 then
    return jsonb_build_object('settled', false, 'reason', 'nothing_refunded');
  end if;
  update billing.payment set refunded_cents = greatest(refunded_cents, least(p_amount_refunded_cents, amount_cents)), updated_at = now()
   where id = p.id;
  if p_amount_refunded_cents >= p.amount_cents then
    return billing.payment_settle(p.stripe_checkout_session_id, 'refunded', p_payment_intent_id);
  end if;
  if p.status <> 'paid' or p_amount_refunded_cents <= p.refunded_cents then
    return jsonb_build_object('settled', false, 'status', p.status, 'reason', 'no_forward_move');
  end if;

  v_word := 'Partially refunded ' || to_char(p_amount_refunded_cents / 100.0, 'FM999999990.00') || ' ' || upper(p.currency);
  select coalesce(a.status_field_key, 'payment'), a.created_by into v_key, v_actor from billing.payment_ask a where a.id = p.ask_id;
  v_held := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), v_word)
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null;
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
  return jsonb_build_object('settled', true, 'status', 'partially_refunded', 'refunded_cents', p_amount_refunded_cents, 'record_id', p.record_id);
end; $$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('billing', 'payment_refund', 'p_payment_intent_id text, p_amount_refunded_cents integer', array['text'::regtype, 'integer'::regtype]::oid[],
  'No entity-id argument: the payment is found by its Stripe payment intent id, which only a verified Stripe event carries.',
  '20261018153000_payments_minors_refunds_soft_delete_amount_knob.sql',
  'server_only: the Connect webhook (/api/payments/webhook) calls it with the service role after verifying the Stripe signature; no client ever does.',
  false, false)
on conflict do nothing;
revoke all on function billing.payment_refund(text, integer) from public, anon, authenticated;
grant execute on function billing.payment_refund(text, integer) to service_role;

CREATE OR REPLACE FUNCTION billing.org_payments_status(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r billing.org_payment_account;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see its payment connection.' using errcode = '42501';
  end if;
  select * into r from billing.org_payment_account a
   where a.organization_id = p_organization_id and a.disconnected_at is null and a.deleted_at is null;
  if r.organization_id is null then
    return jsonb_build_object('connected', false, 'can_manage', public.is_org_admin(p_organization_id));
  end if;
  return jsonb_build_object(
    'connected', true,
    'can_manage', public.is_org_admin(p_organization_id),
    'stripe_account_id', r.stripe_account_id,
    'livemode', r.livemode,
    'charges_enabled', r.charges_enabled,
    'payouts_enabled', r.payouts_enabled,
    'details_submitted', r.details_submitted,
    'country', r.country,
    'default_currency', r.default_currency,
    'display_name', r.display_name,
    'updated_at', r.updated_at
  );
end; $function$;

CREATE OR REPLACE FUNCTION billing.payment_ask_set(p_organization_id uuid, p_subject_kind text, p_subject_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_table uuid;
  v_mode text := coalesce(p_spec->>'amount_mode', 'fixed');
  v_cents integer := nullif(p_spec->>'amount_cents', '')::integer;
  v_field text := nullif(p_spec->>'amount_field', '');
  v_currency text := lower(coalesce(nullif(p_spec->>'currency', ''), 'usd'));
  v_id uuid;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Only an admin of this organization can ask for payment.' using errcode = '42501';
  end if;
  if p_subject_kind = 'form' then
    select f.table_id into v_table from custom.anon_form f
     where f.id = p_subject_id and f.organization_id = p_organization_id and f.deleted_at is null;
  elsif p_subject_kind = 'table' then
    v_table := p_subject_id;
  else
    raise exception 'A payment is asked on a form or a table, and this is a %.', coalesce(p_subject_kind, 'nothing')
      using errcode = '22023';
  end if;
  if v_table is null then
    raise exception 'That form is not in this organization.' using errcode = '02000';
  end if;
  if v_mode = 'fixed' and (v_cents is null or v_cents < 50) then
    raise exception 'A fixed amount must be at least 0.50.' using errcode = '22023';
  end if;
  if v_mode = 'field' and v_field is null then
    raise exception 'Pick the field the amount comes from.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from custom.field fd
     where fd.organization_id = p_organization_id and fd.key = 'payment'
       and fd.entity_definition_id = v_table
  ) then
    perform custom.field_declare(p_organization_id, v_table,
      jsonb_build_object('label', 'Payment', 'key', 'payment', 'plain', 'text'));
  end if;

  insert into billing.payment_ask as a (
    organization_id, subject_kind, subject_id, table_id, enabled, amount_mode, amount_cents,
    amount_field, currency, description, created_by
  ) values (
    p_organization_id, p_subject_kind, p_subject_id, v_table, coalesce((p_spec->>'enabled')::boolean, true),
    v_mode, case when v_mode = 'fixed' then v_cents end, case when v_mode = 'field' then v_field end,
    v_currency, nullif(p_spec->>'description', ''), auth.uid()
  )
  on conflict (subject_kind, subject_id) do update set
    enabled = excluded.enabled, amount_mode = excluded.amount_mode, amount_cents = excluded.amount_cents,
    amount_field = excluded.amount_field, currency = excluded.currency, description = excluded.description,
    deleted_at = null, updated_at = now()
  where a.organization_id = p_organization_id
  returning a.id into v_id;
  if v_id is null then
    raise exception 'That form already asks for payment in another organization.' using errcode = '42501';
  end if;
  return jsonb_build_object('id', v_id, 'table_id', v_table);
end; $function$;

CREATE OR REPLACE FUNCTION billing.payment_asks(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see where it asks for payment.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'subject_kind', a.subject_kind, 'subject_id', a.subject_id, 'table_id', a.table_id,
      'enabled', a.enabled, 'amount_mode', a.amount_mode, 'amount_cents', a.amount_cents,
      'amount_field', a.amount_field, 'currency', a.currency, 'description', a.description,
      'status_field_key', a.status_field_key,
      'paid_count', (select count(*) from billing.payment p where p.ask_id = a.id and p.status = 'paid' and p.deleted_at is null),
      'paid_cents', (select coalesce(sum(p.amount_cents - p.refunded_cents), 0) from billing.payment p where p.ask_id = a.id and p.status = 'paid' and p.deleted_at is null)
    ) order by a.created_at)
    from billing.payment_ask a where a.organization_id = p_organization_id and a.deleted_at is null
  ), '[]'::jsonb);
end; $function$;
