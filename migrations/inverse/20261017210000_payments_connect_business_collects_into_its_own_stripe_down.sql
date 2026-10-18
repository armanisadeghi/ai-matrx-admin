-- inverse of 20261017210000_payments_connect_business_collects_into_its_own_stripe.sql
-- lane: PAYMENTS-CONNECT
-- chair-step: removes the business payments tables and doors; drops every recorded payment row.
delete from platform.client_callable_door
 where schema_name = 'billing' and function_name in ('org_payments_status', 'payment_asks', 'payment_ask_set', 'payment_settle', 'payment_mark_unpaid');
drop function if exists public.payment_ask_set(uuid, text, uuid, jsonb);
drop function if exists public.payment_asks(uuid);
drop function if exists public.org_payments_status(uuid);
drop function if exists billing.payment_mark_unpaid(uuid);
drop function if exists billing.payment_settle(text, text, text);
drop table if exists billing.payment;
drop table if exists billing.payment_ask;
drop table if exists billing.org_payment_account;
