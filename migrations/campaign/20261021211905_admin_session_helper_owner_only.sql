-- chair-step: Remove unintended direct grants from the new private session helper; existing audited callers remain the only entry points.
-- based-on: iam._end_user_sessions(uuid) 5fc5b4317ea501c50027586e47cd521d7a1312b323bbd255cd5935df15ade23e
DO $private$
declare v_owner oid; v_grantee oid;
begin
  select proowner into strict v_owner from pg_proc where oid='iam._end_user_sessions(uuid)'::regprocedure;
  if encode(sha256(convert_to(pg_get_functiondef('iam._end_user_sessions(uuid)'::regprocedure),'UTF8')),'hex') <> '5fc5b4317ea501c50027586e47cd521d7a1312b323bbd255cd5935df15ade23e' then
    raise exception 'Private session helper body changed; review before altering its grants';
  end if;
  for v_grantee in select distinct a.grantee from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='iam._end_user_sessions(uuid)'::regprocedure and a.grantee <> v_owner and a.grantee <> 0 loop
    execute format('REVOKE ALL ON FUNCTION iam._end_user_sessions(uuid) FROM %I',pg_get_userbyid(v_grantee));
  end loop;
  revoke all on function iam._end_user_sessions(uuid) from public;
end $private$;
