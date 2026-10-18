-- inverse of 20261018100200_payments_connect_payment_recreate.sql
-- lane: PAYMENTS-CONNECT-2
-- chair-step: drops the soft-delete billing.payment so 20261018100000's inverse can restore the pre-soft-delete shape; drops every payment row.
drop table if exists billing.payment;
delete from platform.entity_relationships where parent_type = 'billing_payment' or child_type = 'billing_payment';
delete from platform.entity_types where token = 'billing_payment';
