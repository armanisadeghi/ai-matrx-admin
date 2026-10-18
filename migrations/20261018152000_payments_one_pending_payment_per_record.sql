-- 20261018152000_payments_one_pending_payment_per_record.sql
-- lane: PAYMENTS-FIX
-- lock: billing
--
-- REVIEW-PAYMENTS I2. A double click or a stale tab opened two live Checkout sessions for one
-- record, and a payer could pay both. The server now reuses the open session (startCheckout);
-- this index makes a second pending row for the same record impossible even when two starts race.
-- Proof: pnpm check:payment-settle-rules (scenario I2).

create unique index if not exists payment_one_pending_per_record
  on billing.payment (organization_id, record_id)
  where status = 'pending' and deleted_at is null;
