-- chair-step: THE INVERSE of migrations/campaign/atdbfix_b_a_webhook_test_receiver_keeps_what_it_got.sql (lane AT-DBFIX). Refuses while any receipt exists; nothing is destroyed.
-- lane: AT-DBFIX
do $$
begin
  if exists (select 1 from communication.webhook_test_receipt) then
    raise exception 'AT-DBFIX inverse: receipts exist; nothing is destroyed';
  end if;
end $$;
delete from platform.entity_types where schema_name = 'communication' and table_name = 'webhook_test_receipt';
drop table communication.webhook_test_receipt;
