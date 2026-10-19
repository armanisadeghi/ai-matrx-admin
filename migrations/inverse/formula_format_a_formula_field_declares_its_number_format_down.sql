-- Inverse of migrations/campaign/formula_format_a_formula_field_declares_its_number_format.sql.
-- Removes the backfilled display_format from exactly the fields it set, and only while the value is still the one the
-- backfill wrote (a look a person changed since stays).
UPDATE custom.record r
   SET data = r.data - 'display_format'
  FROM (VALUES
  ('e787e4e8-51e9-4576-8b35-bb6729d32e16'::uuid, '{"id":"percent"}'::jsonb),
  ('791e8d5e-3960-4651-89ac-ccae4228f657'::uuid, '{"id":"percent"}'::jsonb),
  ('1c8ad41a-25ab-41b8-88b0-85d5c13c72f8'::uuid, '{"id":"percent"}'::jsonb),
  ('778a7e55-3f26-4ac3-b417-3c0c009839e2'::uuid, '{"id":"percent"}'::jsonb),
  ('cc71ffe0-70d0-49b0-afa6-3e06f389ca97'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('38628e4e-cd1a-46db-8c05-d82f60625c18'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('11111111-0008-4000-8000-000000000008'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('4f234e9d-82fa-4c47-90dc-e414f0a7c0b9'::uuid, '{"id":"percent"}'::jsonb),
  ('eba65cd6-8621-40df-b12a-7b0ac30b0f89'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('e9cc8067-26c1-47d4-bdcd-7f34fc4323a4'::uuid, '{"id":"percent"}'::jsonb),
  ('9467b188-5e08-4688-a1ae-6ccd83135e1f'::uuid, '{"id":"percent"}'::jsonb),
  ('87c24ef8-6151-4a97-9cfd-c13385a79285'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('7dbe390a-1ea9-4014-b457-a6b3bd446e7e'::uuid, '{"id":"percent"}'::jsonb),
  ('d0377328-e2fa-4db0-b534-c58e96a30995'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('ad11e513-99c5-4a71-8a5e-05dec117307d'::uuid, '{"id":"percent"}'::jsonb),
  ('43b2625d-4e01-43f7-a3a2-e3e9404d25b1'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('c3acd940-9a75-4d32-814c-fd2993293763'::uuid, '{"id":"percent"}'::jsonb),
  ('dfe98480-eed3-4ce4-a1c0-05abf5b51780'::uuid, '{"id":"percent"}'::jsonb),
  ('a2dec486-d023-4d7d-b7de-f8720eef2521'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('6f618c5d-5d2b-49f8-ab8d-a5a719ddf752'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('5a640369-5b06-4c1d-a965-ecbc6f471e53'::uuid, '{"id":"percent"}'::jsonb),
  ('0e5295de-c0c7-481d-a128-a087690e097d'::uuid, '{"id":"percent"}'::jsonb),
  ('3dbe976e-0e1a-41a7-ad55-fe0427c4a3eb'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('8b68d36d-ab60-4e41-86a1-f4493530c6ff'::uuid, '{"id":"percent"}'::jsonb),
  ('581a6b76-73f7-49b3-807c-87e9c9343c86'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('ad9b5c64-d120-4125-885b-e12cbb8907e7'::uuid, '{"id":"percent"}'::jsonb),
  ('220ade9a-c965-4cdc-b101-03cd8eaf8f29'::uuid, '{"id":"percent"}'::jsonb),
  ('f2698b07-4dea-4718-930a-e2b144bffc0a'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb),
  ('8df0d09b-c78d-47a9-995b-b2fbd4acc96e'::uuid, '{"id":"currency","options":{"currency":"USD"}}'::jsonb)
  ) AS v(id, look)
 WHERE r.id = v.id
   AND r.table_id = custom.field_kernel_id()
   AND r.data -> 'display_format' = v.look;
