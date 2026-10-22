-- chair-step: seo.location is access machinery (audit_class=machinery) carrying a generated-name std_select lane that apply_rls can never own; the identical signed-in read moves to a named machinery policy (the platform.edge_payload_kind precedent) and std_select is superseded through the sanctioned door
-- lane: canonicalization lane 7. No reader changes: authenticated still reads every row (USING true).
set lock_timeout = '2s';
create policy location_read on seo.location for select to authenticated using (true);
select iam.supersede_bespoke_policies('seo', 'location', array['std_select'],
  'std_select was a generated-name lane left on machinery (apply_rls refuses machinery); the same signed-in read of the shared SEO location catalogue now lives in location_read, the platform.edge_payload_kind precedent.');
do $$ begin
  if not iam.canonical_certify_ok('seo', 'location', 'location') then raise exception 'lane7: seo.location does not certify'; end if;
end $$;
