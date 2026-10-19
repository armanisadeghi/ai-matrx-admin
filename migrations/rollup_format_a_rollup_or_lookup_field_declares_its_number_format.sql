-- additive: yes
-- Data only: no function, table or policy is replaced, so there is no -- based-on: line to carry.
-- Inverse: migrations/inverse/rollup_format_a_rollup_or_lookup_field_declares_its_number_format_down.sql.
--
-- ROLLUP-FORMAT (2026-10-19): a rollup or lookup field has a DECLARED number format on the field like any other
-- column's "Shows as" (`display_format`), the look of the column it reads. The template installer now writes it at
-- install time; this backfills the rollup / lookup fields already installed. The 34 values below were produced by the
-- ONE inference function (@ai-matrx/records `derivedLookOf`, the same one the template installer and the table display
-- use) over every live column on 2026-10-19; nothing is re-derived in SQL. A count (or any measure other than
-- sum / avg / min / max) is never listed. Only rollup / lookup fields that have NO display_format are touched.
UPDATE custom.record r
   SET data = r.data || jsonb_build_object('display_format', v.look)
  FROM (VALUES
  ('4f376c31-bd21-47cd-8af4-50fe438f8f81'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('e370425a-d414-478a-92fa-edd8bbf4561b'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('a853a420-ae8f-4e6e-99b5-5c63caf3e439'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('d0c975a4-3957-44dd-b772-cbf8eca8f7c9'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('d2a890cf-2096-40a9-8352-d293cd2baa8e'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('05ce67a6-203d-4af1-8fbd-54e0cc093d3b'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('0a06ded2-7a99-4414-beee-94cbabcdecbc'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('359221ce-ac46-449f-b217-3d9e7fcccee6'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('a39035df-bb21-44a1-9e82-b61cc62724e7'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('b0fdd2db-e128-4acf-8f30-e99928c9e56e'::uuid, '{"id":"currency","options":{"currency":"EUR"}}'::jsonb),
  ('0ccdc5b5-1335-41d1-bcdc-cd38ce009143'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('6d56246f-fc8c-4ba0-bb43-e90285c007e8'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('5d908aa1-f766-473d-8d92-0327df45f948'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('517bdc86-d3bb-4f13-b6fc-773c1086f1a3'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('adfe5f68-1313-4d02-9a01-e0522ba1184f'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('d2a3ae1c-4338-4119-8c93-9b91dbd987ad'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('41938218-e8e2-4d19-bade-6e668b208a64'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('115425f3-f764-4635-911a-77349b9ab8e4'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('77ddb2cf-71ab-4199-8a35-cf43ed5f887f'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('693708ac-2081-4188-97fa-086afd13d6d4'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('b8b41e18-c511-4d29-972e-b8540a930f94'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('374f4f2e-86d4-4bc9-8cb5-8f030dae3073'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('f695b26d-9be0-4366-9c57-648c703948d0'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('e45d57df-4baf-46d8-9d4c-4a3bb8ca1a85'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('f373d901-e8eb-4474-b50e-5c72e8faf3e6'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('2a743f0e-f424-4c8f-84a7-dbffcf1aa0d7'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('4ff090d3-bc20-4272-ac99-1c91a032d2e9'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('50ec452c-1ab9-4086-a59f-10423605feb2'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('e25d3b65-3d33-42b6-8052-56d9638bafc7'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('4ec9cfe6-874a-402b-b2e3-f89756dea2d2'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('9208c1f4-3e38-401f-949b-dec581774a0f'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('e42286fa-ab40-4cff-8f9a-cac87c842a1a'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('a9cf59ff-299c-4138-b057-8c6846762c91'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('bf4a9f02-e467-4a92-b340-3594074a00a2'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb)
  ) AS v(id, look)
 WHERE r.id = v.id
   AND r.table_id = custom.field_kernel_id()
   AND r.deleted_at IS NULL
   AND r.data ->> 'parity_type' IN ('rollup', 'lookup')
   AND NOT (r.data ? 'display_format');
