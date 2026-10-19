-- AT-SWEEP-4: public.crm_party_purge refuses in plain words ("needs Full access on this person or company"), and ONLY that message changed: with the new sentence put back to the old one, the function body hashes to the body it had before (md5 b046239029dbf715ef92d542291fbc85). RED before atsweep4_c; GREEN after. Read-only.
do $g$
declare v_src text; v_back text;
begin
  select p.prosrc into v_src from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'crm_party_purge';
  if v_src like '%admin access required on the party%' then
    raise exception 'RED: crm_party_purge still says "admin access required on the party"';
  end if;
  if v_src not like '%Permanently deleting this needs Full access on this person or company.%' then
    raise exception 'RED: crm_party_purge does not say "needs Full access on this person or company"';
  end if;
  v_back := replace(v_src, 'Permanently deleting this needs Full access on this person or company.', 'crm_party_purge: admin access required on the party');
  if md5(v_back) <> 'b046239029dbf715ef92d542291fbc85' then
    raise exception 'RED: more than the message changed in crm_party_purge (body md5 % <> b046239029dbf715ef92d542291fbc85)', md5(v_back);
  end if;
  raise notice 'GREEN: crm_party_purge says Full access on this person or company and the rest of the body is byte-identical';
end
$g$;
