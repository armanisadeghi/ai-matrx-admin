-- 20261017213000_payments_connect_settle_writes_as_the_ask_owner.sql
-- lane: PAYMENTS-CONNECT
-- lock: billing
-- based-on: billing.payment_settle(text, text, text) 3b45f2571640a852e0a5320e980d68b759f9299f909e8501d099dbae1395cd13
-- based-on: billing.payment_mark_unpaid(uuid) c55490c4cc5f6b5c45e5dce946003781e9fa109725b3799b76beba1b31253c87
--
-- The record store's triggers refuse a write with no member behind it ("You are not a member of
-- that organization"). The settle and mark-unpaid writes now act as the admin who turned the
-- payment ask on, for that one statement, and restore the caller after — the store's own
-- pattern (custom.form_submit acts as the form's publisher the same way).

create or replace function billing.payment_settle(
  p_checkout_session_id text, p_status text, p_payment_intent_id text default null
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  p billing.payment;
  v_word text;
  v_key text;
  v_actor uuid;
  v_held text;
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

  v_word := case p_status when 'paid' then 'Paid' when 'failed' then 'Failed'
                          when 'expired' then 'Unpaid' when 'refunded' then 'Refunded' end;
  select coalesce(a.status_field_key, 'payment'), a.created_by into v_key, v_actor from billing.payment_ask a where a.id = p.ask_id;
  v_held := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), v_word)
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null;
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);

  return jsonb_build_object('settled', true, 'status', p_status, 'record_id', p.record_id);
end; $$;

create or replace function billing.payment_mark_unpaid(p_payment_id uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare p billing.payment; v_key text; v_actor uuid; v_held text;
begin
  select * into p from billing.payment where id = p_payment_id;
  if p.id is null or p.status <> 'pending' then return; end if;
  select coalesce(a.status_field_key, 'payment'), a.created_by into v_key, v_actor from billing.payment_ask a where a.id = p.ask_id;
  v_held := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), 'Unpaid')
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null
     and coalesce(r.data->>coalesce(v_key, 'payment'), '') not in ('Paid', 'Refunded');
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
end; $$;
