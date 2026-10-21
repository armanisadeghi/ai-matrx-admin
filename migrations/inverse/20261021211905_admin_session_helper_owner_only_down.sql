-- chair-step: Restore only the two captured pre-correction helper grants for a reviewed rollback.
-- based-on: iam._end_user_sessions(uuid) 5fc5b4317ea501c50027586e47cd521d7a1312b323bbd255cd5935df15ade23e
DO $inverse$
begin
  if encode(sha256(convert_to(pg_get_functiondef('iam._end_user_sessions(uuid)'::regprocedure),'UTF8')),'hex') <> '5fc5b4317ea501c50027586e47cd521d7a1312b323bbd255cd5935df15ade23e' then raise exception 'Private session helper body changed'; end if;
  if exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='iam._end_user_sessions(uuid)'::regprocedure and a.grantee<>p.proowner) then raise exception 'Private session helper ACL changed; review before inverse'; end if;
  grant execute on function iam._end_user_sessions(uuid) to dashboard_user,svc_seo;
end $inverse$;
