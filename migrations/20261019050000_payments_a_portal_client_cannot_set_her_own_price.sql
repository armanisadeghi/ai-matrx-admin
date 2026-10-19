-- 20261019050000_payments_a_portal_client_cannot_set_her_own_price.sql
-- lane: PAYMENTS-FINAL
-- lock: billing
-- based-on: billing.payment_ask_set(uuid, text, uuid, jsonb) 25c519a7a8b6c6e6b5c1e2f7207b1ac33a4d8141957c65724eb8e98400e78b23
--
-- PAYMENTS-FINAL (the M3 rule, portal half): a table payment ask whose amount comes from a field a portal
-- client may edit would let the payer type her own price. payment_ask_set refuses amount_mode 'field' when
-- any open (not archived) portal on the ask's table lists that field in editable_field_keys; the server
-- refuses the same at charge time (readyToCharge), so a portal opened after the ask was saved cannot charge.
-- Proof: pnpm check:payment-settle-rules (M3p, M3p-ok).

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
  -- REVIEW-PAYMENTS M3: on a public form the payer must never type their own price.
  if v_mode = 'field' and p_subject_kind = 'form' and exists (
    select 1 from custom.anon_form f
     where f.id = p_subject_id and coalesce(f.exposed_field_keys, '[]'::jsonb) ? v_field
  ) then
    raise exception 'The amount cannot come from a question the payer answers. Pick a field the form does not ask, or use a fixed amount.'
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
    raise exception 'The amount cannot come from a field a portal client can change. Make that field read-only on the portal, or use a fixed amount.'
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
