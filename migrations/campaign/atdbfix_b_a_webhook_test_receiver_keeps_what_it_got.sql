-- guard: custom/system_enabled
-- lock: communication,platform,iam
-- lane: AT-DBFIX
-- AT-DBFIX item 4. Creates ONE new table, communication.webhook_test_receipt, through platform.create_entity_table (Organization class, list scope organization, soft delete, certified inside this file). No function, grant, drop or revoke. It holds what the test receiver at /api/webhooks/records-test-sink writes: one row per delivery a table webhook made to it, with the signature the receiver checked. Inverse: migrations/inverse/atdbfix_b_a_webhook_test_receiver_keeps_what_it_got_down.sql.
--
-- AT-DBFIX 4 — A PLACE OUR OWN SERVER CAN REACH THAT KEEPS WHAT A TABLE WEBHOOK SENDS.
-- WHY. Table webhooks (custom.table_webhook_declare -> files.webhook_dispatch, signed `X-Matrx-Signature:
-- sha256=<hmac of the body text>`) could be declared but never observed: a tester has no https address of ours
-- that the database's pg_net can reach, and a localhost receiver is refused by files.is_safe_webhook_url.
-- THE TABLE. One row per delivery received: which webhook, the event, the delivery id, the signature header, whether
-- the receiver's own recomputation of the signature over the raw body matched (signature_valid), the body, and the
-- organization of the webhook it came from. Written only by the receiver's service-role client; read by the
-- organization's members through the entity RLS iam.apply_rls generated.

select platform.create_entity_table(
  'communication', 'webhook_test_receipt', 'webhook_test_receipt', 'Webhook test receipt',
  array[
    'webhook_id uuid NOT NULL',
    'event text',
    'delivery_event_id text',
    'signature text',
    'signature_valid boolean NOT NULL',
    'received_body jsonb',
    'raw_body text',
    'received_at timestamptz NOT NULL DEFAULT now()'
  ],
  'entity', false, true, 'none', false, false, false, false, null, 'organization', 'organization');

create index webhook_test_receipt_webhook_idx on communication.webhook_test_receipt (webhook_id, received_at desc);
