-- Guard (read-only): a Person id carried to Email/Text becomes the person's email/name; a person with no email does not convert.
-- RED before the migration (the id is retired or kept as the text), GREEN after. Run through the Supabase MCP / psql.
with p as (
  select r.organization_id org, custom.person_kernel_id() pk,
         (select id from custom.record where table_id = custom.person_kernel_id() and data->>'full_name' = 'Probe Priya' limit 1) priya
    from custom.record r where r.table_id = custom.person_kernel_id() and r.data->>'full_name' = 'Probe Priya' limit 1
), nameless as (select 1)
select
  custom._field_value_carry(org, jsonb_build_object('type','relation','relation_target',pk::text), jsonb_build_object('key','lead','type','text','format','email','rules',jsonb_build_array(jsonb_build_object('kind','pattern','value','^[^@\s]+@[^@\s]+\.[^@\s]+$'))), to_jsonb(priya::text)) as to_email,  -- want "priya.p@probe.example"
  custom._field_value_carry(org, jsonb_build_object('type','relation','relation_target',pk::text), jsonb_build_object('key','lead','type','text'), to_jsonb(priya::text)) as to_text -- want "Probe Priya"
from p;
