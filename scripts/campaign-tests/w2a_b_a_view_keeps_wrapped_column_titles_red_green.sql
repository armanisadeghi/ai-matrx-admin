-- LANE W2-A 5 - THE LIVE VIEW REGISTRY NAMES presentation.headerWrap. Plain SQL, read only, rolled back.
-- RED before 20261018051000_w2a_b_a_view_keeps_wrapped_column_titles.sql: R1 fails (the key is missing).
begin;
do $t$
begin
  if not exists (select 1 from custom.view_keys() where path = 'presentation.headerWrap' and shape = 'boolean' and layouts = array['grid'] and writer = 'caller') then
    raise exception 'R1 RED: custom.view_keys() has no presentation.headerWrap (grid, boolean, caller)';
  end if;
  if (select count(*) from custom.view_keys() where path = 'presentation.headerWrap') <> 1 then raise exception 'R2 RED: headerWrap listed twice'; end if;
  raise notice 'GREEN R1-R2: the registry names presentation.headerWrap once, as @ai-matrx/records views/keys.ts does';
end
$t$;
rollback;
