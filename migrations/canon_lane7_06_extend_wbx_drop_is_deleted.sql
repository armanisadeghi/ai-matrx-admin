-- chair-step: drop the legacy is_deleted flag on extend.wbx_demo and extend.wbx_highlight; deleted_at is the canonical soft-delete column and agreed with is_deleted on every row (measured 2026-10-22: 0 disagreements)
-- lane: canonicalization lane 7. Readers census: matrx-extend src (the only client of both tables) never reads or
-- writes is_deleted; no DB function, policy or trigger references it; aidream service code does not touch these tables.
set lock_timeout = '2s';
alter table extend.wbx_demo drop column is_deleted;
alter table extend.wbx_highlight drop column is_deleted;
do $$ begin
  if not iam.canonical_certify_ok('extend', 'wbx_demo', 'wbx_demo') then raise exception 'lane7: wbx_demo does not certify'; end if;
  if not iam.canonical_certify_ok('extend', 'wbx_highlight', 'wbx_highlight') then raise exception 'lane7: wbx_highlight does not certify'; end if;
end $$;
