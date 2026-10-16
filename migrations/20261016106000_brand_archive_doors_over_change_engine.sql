-- chair-step: web.brand_archive and web.brand_restore become thin doors over platform.change_records (plan § 12): one walker, restore keyed by the archive's plan, the slug rule kept in the engine's restore.
-- based-on: web.brand_archive(uuid) 684ba0e4bc104fc857d4567a10ad4b0a321c7299e331968f1dd72d739f631a5b
-- based-on: web.brand_restore(uuid) cfc1ce2714d0a0a6a889dd104cdbe4cc1a624d9a83aa95b1686b69ee9cba4a71
-- MOVE AND ARCHIVE § 12 — the brand archive converges. Same signatures and the same answer (the counts, archived +
-- archived_at) so no caller changes; the work is the engine's: what goes with the brand, what survives because
-- something else uses it, and a restore that brings back exactly that archive (by its plan, not by timestamp).
create or replace function web.brand_archive(p_brand_id uuid)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_counts jsonb := web.brand_archive_preview(p_brand_id);
  v_prev jsonb;
  v_done jsonb;
begin
  v_prev := platform.change_records('delete', 'web_brand', array[p_brand_id]);
  v_done := platform.change_records('delete', 'web_brand', array[p_brand_id], null, null, '{}'::jsonb, false, v_prev ->> 'fingerprint');
  if v_done ->> 'status' is distinct from 'done' then
    raise exception using errcode = '40001', message = coalesce(v_done ->> 'message', 'The brand changed while it was being archived. Try again.');
  end if;
  return v_counts || jsonb_build_object('archived', true, 'plan_id', v_done ->> 'plan_id', 'kept_in_use', v_done -> 'kept_in_use',
    'archived_at', (select b.deleted_at from web.brand b where b.id = p_brand_id));
end $function$;

create or replace function web.brand_restore(p_brand_id uuid)
returns jsonb
language plpgsql
set search_path to ''
as $function$
begin
  perform platform.change_records('restore', 'web_brand', array[p_brand_id], null, null, '{}'::jsonb, false);
  if not exists (select 1 from web.brand b where b.id = p_brand_id and b.deleted_at is null) then
    raise exception 'That brand could not be restored.' using errcode = '42501';
  end if;
  return web.brand_archive_preview(p_brand_id);
end $function$;
