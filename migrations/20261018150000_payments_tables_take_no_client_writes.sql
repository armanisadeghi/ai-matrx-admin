-- 20261018150000_payments_tables_take_no_client_writes.sql
-- lane: PAYMENTS-FIX
-- lock: billing
--
-- REVIEW-PAYMENTS C1. billing.org_payment_account, billing.payment_ask and billing.payment were
-- built with platform.create_entity_table defaults, which grant INSERT/UPDATE/DELETE to
-- `authenticated`, and the std_* policies pass for any org editor. So a plain member could, with
-- supabase-js, lower a fixed price, repoint the organization's Stripe account, or mark a payment
-- paid. Every legitimate write goes through the server (service role) or a SECURITY DEFINER door
-- (payment_ask_set, payment_settle, payment_mark_unpaid), so clients keep SELECT only.
-- Guard: pnpm check:payment-tables-no-client-writes (fails when any client DML grant comes back).

revoke insert, update, delete, truncate on billing.org_payment_account from authenticated, anon;
revoke insert, update, delete, truncate on billing.payment_ask from authenticated, anon;
revoke insert, update, delete, truncate on billing.payment from authenticated, anon;
