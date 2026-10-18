-- 20261017210000_payments_connect_business_collects_into_its_own_stripe.sql
-- lane: PAYMENTS-CONNECT
-- lock: billing
-- chair-step: new money tables; the REVOKEs keep anon/authenticated off the server-only settle functions and off PUBLIC execute on the new doors.
--
-- A business collects payment on its own forms, booking pages and portals into its OWN Stripe
-- account (Stripe Connect, Standard-style accounts, direct charges). Arman 2026-10-17: NO platform
-- fee, ever. Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md
--
-- Three new tables (all new objects — nothing replaced, so no based-on lines):
--   billing.org_payment_account  one connected Stripe account per organization
--   billing.payment_ask          WHERE money is asked: a form / booking page (anon_form) or a table (portal pay)
--   billing.payment              one row per Checkout Session, settled by the server
-- Deny-by-default RLS on all three. Members read through the public RPCs below; the server
-- (service_role) is the only writer of accounts and payments.

create table if not exists billing.org_payment_account (
  organization_id    uuid primary key references iam.organizations(id) on delete cascade,
  stripe_account_id  text not null unique,
  livemode           boolean not null default false,
  charges_enabled    boolean not null default false,
  payouts_enabled    boolean not null default false,
  details_submitted  boolean not null default false,
  country            text,
  default_currency   text,
  display_name       text,
  connected_by       uuid references iam.users(id) on delete set null,
  disconnected_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table billing.org_payment_account enable row level security;

create table if not exists billing.payment_ask (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references iam.organizations(id) on delete cascade,
  subject_kind      text not null check (subject_kind in ('form', 'table')),
  subject_id        uuid not null,
  table_id          uuid not null,
  enabled           boolean not null default true,
  amount_mode       text not null default 'fixed' check (amount_mode in ('fixed', 'field')),
  amount_cents      integer check (amount_cents is null or amount_cents >= 50),
  amount_field      text,
  currency          text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  description       text,
  status_field_key  text not null default 'payment',
  created_by        uuid references iam.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (subject_kind, subject_id),
  check ((amount_mode = 'fixed' and amount_cents is not null) or (amount_mode = 'field' and amount_field is not null))
);
alter table billing.payment_ask enable row level security;
create index if not exists payment_ask_org_idx on billing.payment_ask (organization_id);

create table if not exists billing.payment (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references iam.organizations(id) on delete cascade,
  ask_id                      uuid references billing.payment_ask(id) on delete set null,
  subject_kind                text not null,
  subject_id                  uuid not null,
  record_id                   uuid not null,
  amount_cents                integer not null check (amount_cents > 0),
  currency                    text not null,
  description                 text,
  stripe_account_id           text not null,
  livemode                    boolean not null default false,
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text,
  status                      text not null default 'pending'
                                check (status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
alter table billing.payment enable row level security;
create index if not exists payment_record_idx on billing.payment (organization_id, record_id);
create index if not exists payment_intent_idx on billing.payment (stripe_payment_intent_id);

-- ─── Reads for members ──────────────────────────────────────────────────────────────
create or replace function public.org_payments_status(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare r billing.org_payment_account;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'Only members of this organization can see its payment connection.' using errcode = '42501';
  end if;
  select * into r from billing.org_payment_account a
   where a.organization_id = p_organization_id and a.disconnected_at is null;
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
end; $$;
revoke all on function public.org_payments_status(uuid) from public, anon;
grant execute on function public.org_payments_status(uuid) to authenticated, service_role;

create or replace function public.payment_asks(p_organization_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
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
      'paid_count', (select count(*) from billing.payment p where p.ask_id = a.id and p.status = 'paid'),
      'paid_cents', (select coalesce(sum(p.amount_cents), 0) from billing.payment p where p.ask_id = a.id and p.status = 'paid')
    ) order by a.created_at)
    from billing.payment_ask a where a.organization_id = p_organization_id
  ), '[]'::jsonb);
end; $$;
revoke all on function public.payment_asks(uuid) from public, anon;
grant execute on function public.payment_asks(uuid) to authenticated, service_role;

-- ─── Set an ask (org admins) ────────────────────────────────────────────────────────
-- p_spec: { enabled, amount_mode: fixed|field, amount_cents, amount_field, currency, description }
-- Declares the plain text Field `payment` on the subject table through the store's own door the
-- first time, so the record carries Unpaid / Paid / Failed / Refunded where people already look.
create or replace function public.payment_ask_set(
  p_organization_id uuid, p_subject_kind text, p_subject_id uuid, p_spec jsonb
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
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
    updated_at = now()
  where a.organization_id = p_organization_id
  returning a.id into v_id;
  if v_id is null then
    raise exception 'That form already asks for payment in another organization.' using errcode = '42501';
  end if;
  return jsonb_build_object('id', v_id, 'table_id', v_table);
end; $$;
revoke all on function public.payment_ask_set(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.payment_ask_set(uuid, text, uuid, jsonb) to authenticated, service_role;

-- ─── Settle (server only) ───────────────────────────────────────────────────────────
-- Idempotent and forward-only: pending → paid|failed|expired, paid → refunded. A paid payment is
-- never moved back to failed or expired by a late or retried event. Writes the status word into the
-- record's declared `payment` key, which is an ordinary record change: automations on that field fire.
create or replace function billing.payment_settle(
  p_checkout_session_id text, p_status text, p_payment_intent_id text default null
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  p billing.payment;
  v_word text;
  v_key text;
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
  select coalesce(a.status_field_key, 'payment') into v_key from billing.payment_ask a where a.id = p.ask_id;
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), v_word)
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null;

  return jsonb_build_object('settled', true, 'status', p_status, 'record_id', p.record_id);
end; $$;
revoke all on function billing.payment_settle(text, text, text) from public, anon, authenticated;
grant execute on function billing.payment_settle(text, text, text) to service_role;

-- Marks a record Unpaid when its checkout starts (server only, same declared key).
create or replace function billing.payment_mark_unpaid(p_payment_id uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare p billing.payment; v_key text;
begin
  select * into p from billing.payment where id = p_payment_id;
  if p.id is null or p.status <> 'pending' then return; end if;
  select coalesce(a.status_field_key, 'payment') into v_key from billing.payment_ask a where a.id = p.ask_id;
  update custom.record r set data = r.data || jsonb_build_object(coalesce(v_key, 'payment'), 'Unpaid')
   where r.organization_id = p.organization_id and r.id = p.record_id and r.deleted_at is null
     and coalesce(r.data->>coalesce(v_key, 'payment'), '') not in ('Paid', 'Refunded');
end; $$;
revoke all on function billing.payment_mark_unpaid(uuid) from public, anon, authenticated;
grant execute on function billing.payment_mark_unpaid(uuid) to service_role;

grant usage on schema billing to service_role;
grant select, insert, update on billing.org_payment_account, billing.payment_ask, billing.payment to service_role;

-- ─── Admin read + service policies (billing.* posture: no authenticated row access) ─────
do $$
declare t text;
begin
  foreach t in array array['org_payment_account', 'payment_ask', 'payment'] loop
    execute format('create policy platform_admin_read on billing.%I for select to authenticated using ((select public.is_platform_admin()))', t);
  end loop;
end $$;
grant select on billing.org_payment_account, billing.payment_ask, billing.payment to authenticated;

-- ─── Client doors (signed-in only; each checks membership or admin first) ─────────────
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       case p.proname
         when 'org_payments_status' then 'Whether ONE named organization has its own Stripe account connected for collecting payments, and its state. Refuses an organization the caller is not a member of.'
         when 'payment_asks' then 'Where ONE named organization asks for payment (forms, booking pages, tables) with paid totals. Refuses a non-member.'
         else 'Sets where an organization asks for payment. Org admins only (public.is_org_admin); the form must belong to that organization.'
       end,
       '20261017210000_payments_connect_business_collects_into_its_own_stripe', null, true, false,
       case p.proname when 'payment_ask_set' then 'public.is_org_admin(p_organization_id)' else 'public.is_org_member(p_organization_id)' end
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('org_payments_status', 'payment_asks', 'payment_ask_set')
on conflict do nothing;
grant execute on function public.org_payments_status(uuid) to authenticated;
grant execute on function public.payment_asks(uuid) to authenticated;
grant execute on function public.payment_ask_set(uuid, text, uuid, jsonb) to authenticated;
