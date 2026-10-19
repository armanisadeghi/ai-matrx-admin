-- inverse of 20261018154000_payments_refund_order_and_payer_cannot_set_price.sql
-- lane: PAYMENTS-FIX
CREATE OR REPLACE FUNCTION billing.payment_settle(p_checkout_session_id text, p_status text, p_payment_intent_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p billing.payment;
  v_word text;
  v_key text;
  v_actor uuid;
  v_held text;
  v_other_paid boolean;
  v_newer boolean;
  v_touch boolean;
begin
  select * into p from billing.payment where stripe_checkout_session_id = p_checkout_session_id for update;
  if p.id is null then
    return jsonb_build_object('settled', false, 'reason', 'unknown_session');
  end if;
  if p_status not in ('paid', 'failed', 'expired', 'refunded') then
    raise exception 'billing.payment_settle: % is not a settled status', p_status using errcode = '22023';
  end if;
  if p.status = p_status
     or (p.status = 'paid' and p_status in ('failed', 'expired'))
     or (p.status = 'refunded')
     or (p_status = 'refunded' and p.status <> 'paid') then
    return jsonb_build_object('settled', false, 'status', p.status, 'reason', 'no_forward_move');
  end if;

  update billing.payment set
    status = p_status,
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    paid_at = case when p_status = 'paid' then now() else paid_at end,
    updated_at = now()
  where id = p.id;

  select exists (select 1 from billing.payment o where o.organization_id = p.organization_id and o.record_id = p.record_id
                   and o.id <> p.id and o.status = 'paid' and o.deleted_at is null)
    into v_other_paid;
  select exists (select 1 from billing.payment o where o.organization_id = p.organization_id and o.record_id = p.record_id
                   and o.id <> p.id and o.created_at > p.created_at and o.deleted_at is null)
    into v_newer;
  v_touch := case p_status
    when 'paid' then true
    when 'refunded' then not v_other_paid
    else not v_other_paid and not v_newer
  end;
  if not v_touch then
    return jsonb_build_object('settled', true, 'status', p_status, 'record_id', p.record_id, 'record_word', 'unchanged');
  end if;

  v_word := case p_status when 'paid' then 'Paid' when 'failed' then 'Failed'
                          when 'expired' then 'Unpaid' when 'refunded' then 'Refunded' end;
  select coalesce(a.status_field_key, 'payment'), a.created_by into v_key, v_actor from billing.payment_ask a where a.id = p.ask_id;
  v_held := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), v_word)
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null;
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);

  return jsonb_build_object('settled', true, 'status', p_status, 'record_id', p.record_id);
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
