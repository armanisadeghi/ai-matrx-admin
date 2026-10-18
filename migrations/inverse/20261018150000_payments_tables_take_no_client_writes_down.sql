-- inverse of 20261018150000_payments_tables_take_no_client_writes.sql
-- lane: PAYMENTS-FIX
-- Restores the create_entity_table default client DML grants (the C1 hole). Only for rollback.
grant insert, update, delete on billing.org_payment_account to authenticated;
grant insert, update, delete on billing.payment_ask to authenticated;
grant insert, update, delete on billing.payment to authenticated;
