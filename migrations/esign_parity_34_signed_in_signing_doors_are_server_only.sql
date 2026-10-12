-- draft: evidence lane — held until production aidream runs 0557afc31e+ (signed-in acts on the server connection, signing._as_signer); applying earlier breaks internal signing
-- chair-step: REVOKEs client EXECUTE from the signed-in signer's doors that take an IP address or device (final adversarial review C2), now that the server calls them on its own connection.
-- THE SIGNED-IN SIGNER'S DOORS ARE SERVER-ONLY (the half of migration 33 that waited for the server).
--
-- Before applying: production aidream must contain 0557afc31e (prove by behaviour: POST
-- /esign/envelopes/358033f9-be87-4fc5-8858-e53e0f3c8004/verify answers intact:false naming
-- signed_copy_bytes_mismatch). Then run test_evidence_live.py: test_no_client_reachable_door_takes_an_ip_or_a_device.

do $$
declare r record;
begin
  for r in
    select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('esign', 'public') and p.proname ~ '^esign_sign(_|$)' and p.proname !~ '^esign_signer'
       and p.proargnames && array['p_ip', 'p_ua']
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, authenticator', r.oid::regprocedure);
    execute format('grant execute on function %s to service_role', r.oid::regprocedure);
    update platform.client_callable_door
       set signed_in_callers = false, anonymous_callers = false, anonymous_purpose = null,
           non_client_lane = 'server_only: takes the IP address and device the aidream server observed for this request (services/esign/signing.py _as_signer); a client could only assert its own'
     where schema_name = r.nspname and function_name = r.proname and identity_args = r.args;
  end loop;
end $$;
