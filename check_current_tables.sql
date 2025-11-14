-- Check what tables we currently have
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE '%functionality%' OR table_name LIKE '%system_prompt%'
ORDER BY table_name;

-- Check columns in system_prompt_functionality_configs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'system_prompt_functionality_configs'
ORDER BY ordinal_position;

