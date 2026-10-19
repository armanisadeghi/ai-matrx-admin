-- 20261019052000_payments_no_form_or_portal_save_lets_the_payer_type_the_amount.sql
-- lane: PAYMENTS-FINAL
-- lock: billing
-- based-on: billing.payment_ask_set(uuid, text, uuid, jsonb) a209dedf8d3ac4272ae38ecb703994ed7cfd0a6b294e5c376a312e8c6aef472c
--
-- PAYMENTS-FINAL (coordinator ruling 2026-10-18: the payer never sets her own price):
--  1. payment_ask_set refuses a field-mode ask whose amount field ANY live form on the table asks (public,
--     booking or portal form; replaces the subject-form-only M3 check and the portal-form check of 20261019051000).
--  2. Form save/publish/undelete (custom.anon_form) and portal save (custom.portal_table) are refused when they
--     would let people type the amount field of a live, enabled field-mode ask on that table (trigger).
-- Charge time re-checks both (features/payments/server.ts readyToCharge).
-- Proof: pnpm check:payment-settle-rules (M3f, M3fs, M3fs-ok, M3ps, M3ps-ok).

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
  -- REVIEW-PAYMENTS M3 + PAYMENTS-FINAL: the payer never sets her own price. No live form that writes into
  -- this table (public, booking or carried by a portal) may ask the amount field.
  if v_mode = 'field' and exists (
    select 1 from custom.anon_form f
     where f.table_id = v_table and f.organization_id = p_organization_id and f.deleted_at is null
       and coalesce(f.exposed_field_keys, '[]'::jsonb) ? v_field
  ) then
    raise exception 'This form lets people type the amount this payment charges — make the field read-only on the form, or use a fixed amount.'
      using errcode = '22023';
  end if;

  -- PAYMENTS-FINAL: a portal client must never set her own price either. A field any open portal lets
  -- its client change cannot be the amount (the server re-checks at charge time, features/payments/server.ts).
  if v_mode = 'field' and exists (
    select 1 from custom.portal_table pt
      join custom.portal p on p.id = pt.portal_id
     where pt.table_id = v_table and p.archived_at is null
       and coalesce(pt.editable_field_keys, '[]'::jsonb) ? v_field
  ) then
    raise exception 'This portal lets people type the amount this payment charges — make the field read-only on the portal, or use a fixed amount.'
      using errcode = '22023';
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

-- THE OTHER SIDE OF THE SAME RULE: once a live, enabled field-mode ask takes its amount from a field, no
-- form on that table may start asking it and no portal may open it for editing — whatever door writes the
-- row (form save, publish, undelete, portal_declare). The charge-time check in features/payments/server.ts stays.
CREATE OR REPLACE FUNCTION billing.payment_amount_never_payer_typed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_keys jsonb;
  v_field text;
begin
  if TG_TABLE_NAME = 'anon_form' then
    if new.deleted_at is not null then return new; end if;
    v_keys := coalesce(new.exposed_field_keys, '[]'::jsonb);
  else
    v_keys := coalesce(new.editable_field_keys, '[]'::jsonb);
  end if;
  select a.amount_field into v_field
    from billing.payment_ask a
   where a.table_id = new.table_id and a.organization_id = new.organization_id
     and a.deleted_at is null and a.enabled and a.amount_mode = 'field'
     and v_keys ? a.amount_field
   limit 1;
  if v_field is not null then
    if TG_TABLE_NAME = 'anon_form' then
      raise exception 'This form lets people type the amount this payment charges — make the field read-only on the form, or use a fixed amount.'
        using errcode = '22023', hint = format('The payment on this table takes its amount from "%s".', v_field);
    end if;
    raise exception 'This portal lets people type the amount this payment charges — make the field read-only on the portal, or use a fixed amount.'
      using errcode = '22023', hint = format('The payment on this table takes its amount from "%s".', v_field);
  end if;
  return new;
end; $function$;

CREATE TRIGGER payment_amount_never_payer_typed BEFORE INSERT OR UPDATE OF exposed_field_keys, table_id, deleted_at
  ON custom.anon_form FOR EACH ROW EXECUTE FUNCTION billing.payment_amount_never_payer_typed();
CREATE TRIGGER payment_amount_never_payer_typed BEFORE INSERT OR UPDATE OF editable_field_keys, table_id
  ON custom.portal_table FOR EACH ROW EXECUTE FUNCTION billing.payment_amount_never_payer_typed();
