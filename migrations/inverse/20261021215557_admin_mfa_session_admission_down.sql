-- window-class: DROP TRIGGER on platform.feature_knob takes ACCESS EXCLUSIVE and may hold the supautils auth/storage/realtime set; production rollback only at 0100-0400 Pacific.
-- based-on: platform.admin_lane_open() 3c68665102a1c6fdd2a138e318443c8aa9956d7292b7d4da395c465075838fea
-- based-on: platform._admin_operator_session() e9207f1c9ff3ef8c5b618f3cb1baf0b8844d2e4cc0ac2d2cdba1913c5c49937d
-- based-on: platform._admin_mfa_required() 88c3dbe4c28d27cb7342410c7d8d46fb9c0e50b9f065e50c7b80fbf48702e24c
-- based-on: platform._admin_mfa_policy_guard() 7290c53ae2550dd40de02c49d666b349292029e9f754725161025948d848a888
-- based-on: platform._set_admin_mfa_required(boolean,uuid,text,text) d6db9bf919afd01ffe739d781068d4317b848d0ad31fcc612b6bf434297a987c
-- based-on: platform.admin_session_state() 34153373bca38098d1940c79e8f8514bb953d50086d945667c6cad30fc37d1b2
-- chair-step: Restore original lane only while MFA is off and no newer consumers exist. Retain audit history.
do $guard$ begin
if encode(sha256(convert_to(pg_get_functiondef('platform.admin_lane_open()'::regprocedure),'UTF8')),'hex') <> '3c68665102a1c6fdd2a138e318443c8aa9956d7292b7d4da395c465075838fea' then raise exception 'MFA inverse refuses changed platform.admin_lane_open()'; end if;
if encode(sha256(convert_to(pg_get_functiondef('platform._admin_operator_session()'::regprocedure),'UTF8')),'hex') <> 'e9207f1c9ff3ef8c5b618f3cb1baf0b8844d2e4cc0ac2d2cdba1913c5c49937d' then raise exception 'MFA inverse refuses changed platform._admin_operator_session()'; end if;
if encode(sha256(convert_to(pg_get_functiondef('platform._admin_mfa_required()'::regprocedure),'UTF8')),'hex') <> '88c3dbe4c28d27cb7342410c7d8d46fb9c0e50b9f065e50c7b80fbf48702e24c' then raise exception 'MFA inverse refuses changed platform._admin_mfa_required()'; end if;
if encode(sha256(convert_to(pg_get_functiondef('platform._admin_mfa_policy_guard()'::regprocedure),'UTF8')),'hex') <> '7290c53ae2550dd40de02c49d666b349292029e9f754725161025948d848a888' then raise exception 'MFA inverse refuses changed platform._admin_mfa_policy_guard()'; end if;
if encode(sha256(convert_to(pg_get_functiondef('platform._set_admin_mfa_required(boolean,uuid,text,text)'::regprocedure),'UTF8')),'hex') <> 'd6db9bf919afd01ffe739d781068d4317b848d0ad31fcc612b6bf434297a987c' then raise exception 'MFA inverse refuses changed platform._set_admin_mfa_required(boolean,uuid,text,text)'; end if;
if encode(sha256(convert_to(pg_get_functiondef('platform.admin_session_state()'::regprocedure),'UTF8')),'hex') <> '34153373bca38098d1940c79e8f8514bb953d50086d945667c6cad30fc37d1b2' then raise exception 'MFA inverse refuses changed platform.admin_session_state()'; end if;
if platform._admin_mfa_required() then raise exception 'MFA inverse requires an audited operator deactivation first'; end if;
if exists(select 1 from pg_proc p join pg_namespace n on p.pronamespace=n.oid
 where p.prokind='f' and p.prosrc ~ '(admin_session_state|_admin_mfa_required|_set_admin_mfa_required|_admin_operator_session)'
 and p.oid <> all(array['platform.admin_lane_open()'::regprocedure::oid,'platform.admin_session_state()'::regprocedure::oid,'platform._admin_mfa_required()'::regprocedure::oid,'platform._set_admin_mfa_required(boolean,uuid,text,text)'::regprocedure::oid,'platform._admin_operator_session()'::regprocedure::oid,'platform._admin_mfa_policy_guard()'::regprocedure::oid])) then
 raise exception 'MFA inverse refuses newly installed consumers'; end if;
end $guard$;

CREATE OR REPLACE FUNCTION platform.admin_lane_open()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare h json;
begin
  if current_setting('matrx.admin_lane', true) = 'on' then return true; end if;
  begin h := nullif(current_setting('request.headers', true),'')::json; exception when others then h := null; end;
  if h is null then return false; end if;
  return coalesce(h->>'x-matrx-admin-lane' = '1', false)
      or coalesce(h->>'origin' in ('https://admin.app.matrxserver.com'), false);
end $function$
;
drop trigger admin_mfa_policy_guard on platform.feature_knob;
delete from platform.feature_knob where feature='platform.auth' and key='admin_mfa_required';
drop function platform.admin_session_state();
drop function platform._set_admin_mfa_required(boolean,uuid,text,text);
drop function platform._admin_mfa_policy_guard();
drop function platform._admin_mfa_required();
drop function platform._admin_operator_session();
delete from platform.client_callable_door where schema_name='platform' and function_name<>'admin_lane_open' and declared_by='20261021215557_admin_mfa_session_admission.sql';
-- Retain the corrected declaration of the pre-existing lane grant; removing it would make DDL guards silently revoke its original anonymous EXECUTE.
