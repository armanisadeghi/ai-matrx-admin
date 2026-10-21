-- draft: CASA owner; rehearse and independently review before governed apply. Never activate during rollout.
-- chair-step: Add current-session administrator admission and an operator-held audited MFA switch.
-- based-on: platform.admin_lane_open() 5a66823ce4cefecfb0aae548b6b540fecd44d44f4f7e4218f9601b6dc1ec24df
begin;

do $baseline$
declare actual jsonb;
begin
 if encode(sha256(convert_to(pg_get_functiondef('platform.admin_lane_open()'::regprocedure),'UTF8')),'hex')<>'5a66823ce4cefecfb0aae548b6b540fecd44d44f4f7e4218f9601b6dc1ec24df' then
 raise exception 'Administrator lane changed since captured baseline'; end if;
 select jsonb_build_object('acl',to_jsonb(p.proacl),'owner',pg_get_userbyid(p.proowner),'config',to_jsonb(p.proconfig),'language',l.lanname,'volatility',p.provolatile,'security_definer',p.prosecdef)
 into actual from pg_proc p join pg_language l on l.oid=p.prolang where p.oid='platform.admin_lane_open()'::regprocedure;
 if actual is distinct from '{"acl":["postgres=X/postgres","dashboard_user=X/postgres","authenticated=X/postgres","service_role=X/postgres","svc_seo=X/postgres","anon=X/postgres","vault_history_writer=X/postgres"],"owner":"postgres","config":["search_path=pg_catalog"],"language":"plpgsql","volatility":"s","security_definer":false}'::jsonb then raise exception 'Administrator lane metadata/ACL changed since baseline'; end if;
end $baseline$;

insert into platform.feature_knob(feature,key,value,default_value,value_type,label,description,set_by,basis,overridable_by,delegable,not_delegable_reason)
values('platform.auth','admin_mfa_required','false','false','boolean','Administrator MFA','Require current elevated sessions for administrator power.','agent','READY-04 incomplete rollout; activation requires full consumer, recovery and operating acceptance.','{}',false,'Platform authentication authority is held by the database operator.');

-- Never confuse a SECURITY DEFINER owner with the incoming authenticated role.
create function platform._admin_operator_session() returns boolean
language sql stable security definer set search_path=pg_catalog as $fn$
 select session_user = pg_get_userbyid(p.proowner)
   and coalesce(nullif(current_setting('role',true),'none'),session_user::text) = pg_get_userbyid(p.proowner)
 from pg_proc p where p.oid='platform._admin_operator_session()'::regprocedure
$fn$;

create function platform._admin_mfa_required() returns boolean
language plpgsql stable security definer set search_path=pg_catalog as $fn$
declare k platform.feature_knob%rowtype;
begin
 select * into k from platform.feature_knob where feature='platform.auth' and key='admin_mfa_required';
 if not found or k.archived_at is not null or k.value_type<>'boolean'
    or jsonb_typeof(k.value) is distinct from 'boolean'
    or jsonb_typeof(k.default_value) is distinct from 'boolean'
    or cardinality(k.overridable_by)<>0 or k.delegable then
   raise exception 'Administrator MFA policy unavailable or invalid' using errcode='55000';
 end if;
 return (k.value #>> '{}')::boolean;
end $fn$;

create function platform._admin_mfa_policy_guard() returns trigger
language plpgsql security definer set search_path=pg_catalog as $fn$
begin
 if (tg_op<>'INSERT' and old.feature='platform.auth' and old.key='admin_mfa_required')
 or (tg_op<>'DELETE' and new.feature='platform.auth' and new.key='admin_mfa_required') then
   if not platform._admin_operator_session()
      or current_setting('platform.admin_mfa_policy_write',true) is distinct from txid_current()::text then
     raise exception 'Administrator MFA policy requires the private audited operator setter' using errcode='42501';
   end if;
   if tg_op<>'UPDATE' or new.feature is distinct from old.feature or new.key is distinct from old.key
      or new.default_value is distinct from old.default_value or new.value_type is distinct from old.value_type
      or new.overridable_by is distinct from old.overridable_by or new.delegable is distinct from old.delegable
      or new.archived_at is not null or jsonb_typeof(new.value) is distinct from 'boolean' then
     raise exception 'Administrator MFA policy shape is immutable' using errcode='22023';
   end if;
 end if;
 return coalesce(new,old);
end $fn$;
create trigger admin_mfa_policy_guard before insert or update or delete on platform.feature_knob
for each row execute function platform._admin_mfa_policy_guard();

-- Existing knob history is the canonical audit, not a parallel settings log.
create function platform._set_admin_mfa_required(p_required boolean,p_actor uuid,p_reason text,p_evidence text)
returns bigint language plpgsql security definer set search_path=pg_catalog as $fn$
declare v_old jsonb; v_last bigint; v_id bigint; v_count bigint; v_org uuid;
begin
 if not platform._admin_operator_session() then raise exception 'Database operator required' using errcode='42501'; end if;
 if p_required is null or p_actor is null or nullif(btrim(p_reason),'') is null or nullif(btrim(p_evidence),'') is null then
   raise exception 'Value, operator identity, reason and acceptance evidence required' using errcode='22023';
 end if;
 if not exists(select 1 from admin.admins where user_id=p_actor) then
   raise exception 'Operator attribution must name a current administrator' using errcode='22023';
 end if;
 v_org := public.system_org_id('system');
 if v_org is null then raise exception 'System settings audit organization unavailable' using errcode='55000'; end if;
 select value into strict v_old from platform.feature_knob where feature='platform.auth' and key='admin_mfa_required' for update;
 perform platform._admin_mfa_required();
 if v_old=to_jsonb(p_required) then raise exception 'Administrator MFA policy already has this value' using errcode='22023'; end if;
 select coalesce(max(id),0) into v_last from platform.knob_override_audit where feature='platform.auth' and key='admin_mfa_required';
 perform set_config('platform.admin_mfa_policy_write',txid_current()::text,true);
 update platform.feature_knob set value=to_jsonb(p_required),updated_by=p_actor,updated_at=now(),set_by='human',
   basis=jsonb_build_object('reason',p_reason,'evidence',p_evidence)::text where feature='platform.auth' and key='admin_mfa_required';
 perform set_config('platform.admin_mfa_policy_write','',true);
 select count(*),min(id) into v_count,v_id from platform.knob_override_audit
 where id>v_last and feature='platform.auth' and key='admin_mfa_required' and scope_kind='platform'
 and organization_id=v_org and actor=p_actor and action='update' and old_value=v_old and new_value=to_jsonb(p_required);
 if v_count<>1 then raise exception 'Expected exactly one atomic settings audit receipt' using errcode='55000'; end if;
 update platform.knob_override_audit set set_note=jsonb_build_object('reason',p_reason,'evidence',p_evidence)::text where id=v_id;
 return v_id;
end $fn$;

create function platform.admin_session_state() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $fn$
declare c jsonb; u uuid; s uuid; lvl text; valid boolean:=false; elevated boolean:=false; required boolean; why text;
begin
 required:=platform._admin_mfa_required();
 if platform._admin_operator_session() then
   return jsonb_build_object('authority','database_operator','admitted',true,'mfa_required',required,'is_admin',false,'admin_level',null);
 end if;
 if current_setting('role',true)='service_role' then
   return jsonb_build_object('authority','service_role','admitted',true,'mfa_required',required,'is_admin',false,'admin_level',null);
 end if;
 begin
   c:=auth.jwt();
   u:=nullif(c->>'sub','')::uuid; s:=nullif(c->>'session_id','')::uuid;
 exception when invalid_text_representation then
   return jsonb_build_object('authority','human','admitted',false,'mfa_required',required,'is_admin',false,'admin_level',null,'reason','invalid_claims');
 end;
 select level::text into lvl from admin.admins where user_id=u;
 select true, a.aal::text='aal2' into valid,elevated from auth.sessions a
 where a.id=s and a.user_id=u and (a.not_after is null or a.not_after>now());
 valid:=coalesce(valid,false); elevated:=coalesce(elevated,false);
 if u is null or s is null then why:='missing_session';
 elsif exists(select 1 from admin.support_sessions where auth_session_id=s) then why:='support_session';
 elsif not valid then why:='session_ended';
 elsif lvl is null then why:='not_admin';
 elsif required and (c->>'aal' is distinct from 'aal2' or not elevated) then why:='insufficient_aal';
 else why:='admitted'; end if;
 return jsonb_build_object('authority','human','admitted',why='admitted','mfa_required',required,
   'is_admin',lvl is not null,'admin_level',lvl,'session_valid',valid,'aal',c->>'aal','reason',why);
end $fn$;

create or replace function platform.admin_lane_open() returns boolean
language plpgsql stable set search_path=pg_catalog as $fn$
declare h json; lane boolean:=false;
begin
 if current_setting('matrx.admin_lane',true)='on' then lane:=true; end if;
 begin h:=nullif(current_setting('request.headers',true),'')::json; exception when others then h:=null; end;
 lane:=lane or coalesce(h->>'x-matrx-admin-lane'='1',false)
           or coalesce(h->>'origin' in ('https://admin.app.matrxserver.com'),false);
 if not lane then return false; end if;
 if not platform._admin_mfa_required() then return true; end if;
 return coalesce((platform.admin_session_state()->>'admitted')::boolean,false);
end $fn$;

comment on function platform.admin_session_state() is 'Self-only current administrator/session/AAL admission. Identity is separate from power. READY-04 rollout remains off until full acceptance.';
-- Preserve the existing lane callers' ability to receive a self-only denial/verdict.
-- None of these grants creates administrator authority or treats a named role as a machine.
do $public_acl$
declare g record;
begin
 for g in select distinct x.grantee from pg_proc p cross join lateral aclexplode(p.proacl) x
 where p.oid='platform.admin_lane_open()'::regprocedure and x.grantee<>0 loop
   execute format('grant execute on function platform._admin_mfa_required(),platform.admin_session_state() to %I',pg_get_userbyid(g.grantee));
 end loop;
end $public_acl$;

-- Restrict exact new signatures after all CREATE/COMMENT/GRANT event triggers have run.
do $acl$
declare signature text; f record; g record;
begin
 foreach signature in array array['platform._admin_operator_session()','platform._admin_mfa_required()','platform._admin_mfa_policy_guard()','platform._set_admin_mfa_required(boolean,uuid,text,text)','platform.admin_session_state()'] loop
   select p.oid,p.proowner,p.proname into strict f from pg_proc p where p.oid=signature::regprocedure;
   execute format('revoke all on function %s from public',f.oid::regprocedure);
   for g in select distinct x.grantee from pg_proc p cross join lateral aclexplode(p.proacl) x where p.oid=f.oid and x.grantee<>0 and x.grantee<>f.proowner
   and not (p.proname in ('_admin_mfa_required','admin_session_state') and exists(
     select 1 from pg_proc lane cross join lateral aclexplode(lane.proacl) a
     where lane.oid='platform.admin_lane_open()'::regprocedure and a.grantee=x.grantee and a.privilege_type='EXECUTE')) loop
     execute format('revoke all on function %s from %I',f.oid::regprocedure,pg_get_userbyid(g.grantee));
   end loop;
 end loop;
end $acl$;
commit;
