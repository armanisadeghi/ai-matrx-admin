-- inverse of 20261018100100_payments_connect_payment_ask_recreate.sql
-- lane: PAYMENTS-CONNECT-2
-- chair-step: drops the soft-delete billing.payment_ask (run after 20261018100200's inverse); drops every ask row.
drop table if exists billing.payment;
drop table if exists billing.payment_ask;
delete from platform.entity_relationships where parent_type = 'billing_payment_ask' or child_type = 'billing_payment_ask';
delete from platform.entity_types where token = 'billing_payment_ask';
