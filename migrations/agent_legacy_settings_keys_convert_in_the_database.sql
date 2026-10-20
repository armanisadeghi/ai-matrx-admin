-- L46: the ONE home of the legacy agent-settings alias table. Every writer (the Builder's direct
-- Supabase writes, the aidream save door, MCP, migrations) goes through this BEFORE trigger, so a
-- legacy spelling is stored under its canonical key/field and never ignored at run time.
--   image_size          -> settings.resolution
--   ai_model_id         -> settings.model_id
--   json_schema / output_schema (in settings) -> the row's output_schema column, only when empty
--   response_mime_type application/json -> settings.response_format {"type":"json_object"},
--                         dropped when the row has an output schema (stricter JSON mode)
-- A canonical value already present always wins; the alias key is dropped. Never raises.
create or replace function agent.normalize_definition_settings()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  s jsonb;
  v jsonb;
  k text;
  schema jsonb;
  have_schema boolean;
begin
  if new.settings is null or jsonb_typeof(new.settings) <> 'object' then
    return new;
  end if;
  if not (new.settings ?| array['image_size','ai_model_id','json_schema','output_schema','response_mime_type']) then
    return new;
  end if;

  s := new.settings;
  have_schema := new.output_schema is not null
    and new.output_schema::text not in ('null', '{}');

  if s ? 'image_size' then
    v := s -> 'image_size';
    s := s - 'image_size';
    if v <> 'null'::jsonb and coalesce(s -> 'resolution', 'null'::jsonb) = 'null'::jsonb then
      s := jsonb_set(s, '{resolution}', v);
    end if;
  end if;

  if s ? 'ai_model_id' then
    v := s -> 'ai_model_id';
    s := s - 'ai_model_id';
    if v <> 'null'::jsonb and coalesce(s -> 'model_id', 'null'::jsonb) = 'null'::jsonb then
      s := jsonb_set(s, '{model_id}', v);
    end if;
  end if;

  foreach k in array array['json_schema', 'output_schema'] loop
    if not (s ? k) then
      continue;
    end if;
    v := s -> k;
    s := s - k;
    if jsonb_typeof(v) <> 'object' or v = '{}'::jsonb then
      continue;
    end if;
    if jsonb_typeof(v -> 'schema') = 'object' and (v -> 'schema') <> '{}'::jsonb then
      schema := v -> 'schema';
    else
      schema := v;
    end if;
    if not have_schema then
      new.output_schema := schema::json;
      have_schema := true;
    end if;
  end loop;

  if s ? 'response_mime_type' then
    v := s -> 'response_mime_type';
    s := s - 'response_mime_type';
    if jsonb_typeof(v) = 'string' and lower(v #>> '{}') like 'application/json%' then
      if not have_schema and coalesce(s -> 'response_format', 'null'::jsonb) = 'null'::jsonb then
        s := jsonb_set(s, '{response_format}', '{"type":"json_object"}'::jsonb);
      end if;
    end if;
  end if;

  new.settings := s;
  return new;
end;
$function$;

create or replace trigger _a1_normalize_legacy_settings
  before insert or update on agent.definition
  for each row execute function agent.normalize_definition_settings();

create or replace trigger _a1_normalize_legacy_settings
  before insert or update on agent.definition_version
  for each row execute function agent.normalize_definition_settings();

create or replace trigger _a1_normalize_legacy_settings
  before insert or update on agent.template
  for each row execute function agent.normalize_definition_settings();
