-- chair-step: canonicalization lane 6 drops the _version_capture triggers on public.app_instances and public.sandbox_instances — both tokens are declared is_versioned=false, so platform._version_capture returns before writing anything; the triggers are inert
-- lane: canonicalization lane 6. Rehearsed rolled back: only legacy_owner_col WARNs remain on the four public tables; hr.candidate, studio_recording_chunks clean.
set lock_timeout = '2s';

-- 1. product-rule policies (self-only actor checks), declared per the estate close-out ruling
--    (Arman 2026-10-06: product-rule policies kept as declared exceptions). hr.candidate's update
--    guard was edited after it was declared (an editor arm was added), so its fingerprint is re-declared.
update meta.audit_exemption ae
   set metadata = jsonb_set(ae.metadata, '{policies,candidate_actor_user_id_is_the_caller_update}',
         to_jsonb((select md5(concat_ws('|',p.polcmd::text,p.polpermissive::text,p.polroles::regrole[]::text,
                 coalesce(pg_get_expr(p.polqual,p.polrelid),'-'),coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-')))
             from pg_policy p where p.polrelid='hr.candidate'::regclass and p.polname='candidate_actor_user_id_is_the_caller_update')))
 where ae.check_name='bespoke_policy_present' and ae.schema_name='hr' and ae.table_name='candidate';

insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id, metadata)
select 'bespoke_policy_present', n.nspname, c.relname,
       'Hand-written policies encode product rules (self-only actor checks on writes, addressable-person checks, owner/staff writes, operator-only reads, viewer-private rows); they stay as written. Honoured only while each policy keeps its fingerprint.',
       '39c38960-d30c-4840-b0c1-c9960de95582',
       jsonb_build_object('ruling','canonicalization lane 6, 2026-10-22 (Arman 2026-10-06 approval: product-rule policies kept as declared exceptions)',
         'policies', (select jsonb_object_agg(p.polname, md5(concat_ws('|',p.polcmd::text,p.polpermissive::text,p.polroles::regrole[]::text,
                 coalesce(pg_get_expr(p.polqual,p.polrelid),'-'),coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-'))))
            from pg_policy p where p.polrelid=c.oid and p.polname like '%\_user\_id\_is\_the\_caller\_%'))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where (n.nspname, c.relname) in (('public','app_instances'),('public','sandbox_instances'))
   and not exists (select 1 from meta.audit_exemption ae where ae.check_name='bespoke_policy_present' and ae.schema_name=n.nspname and ae.table_name=c.relname);

-- 2. app_instance / sandbox_instance are declared is_versioned=false, so platform._version_capture
--    returns before writing anything: the attached trigger is inert. Remove it (behavior unchanged).
do $$ declare r record; begin
  for r in select t.tgname, t.tgrelid::regclass::text rel from pg_trigger t
            where t.tgrelid in ('public.app_instances'::regclass, 'public.sandbox_instances'::regclass)
              and t.tgfoid = 'platform._version_capture()'::regprocedure and not t.tgisinternal
  loop
    execute format('drop trigger %I on %s', r.tgname, r.rel);
  end loop;
end $$;

-- 3. base FKs on three private-class tables. platform.retrofit_entity refuses them (it demands a
--    visibility column, which the T-13 event trigger forbids on private tables), so these are the
--    exact statements it would run: covering index, FK NOT VALID, validated next in its own transaction.
create index if not exists app_settings_organization_id_idx on public.app_settings (organization_id);
create index if not exists app_settings_created_by_idx on public.app_settings (created_by);
create index if not exists app_settings_updated_by_idx on public.app_settings (updated_by);
create index if not exists app_sync_status_organization_id_idx on public.app_sync_status (organization_id);
create index if not exists app_sync_status_created_by_idx on public.app_sync_status (created_by);
create index if not exists app_sync_status_updated_by_idx on public.app_sync_status (updated_by);
create index if not exists studio_recording_chunks_organization_id_idx on transcripts.studio_recording_chunks (organization_id);
alter table public.app_settings add constraint public_app_settings_organization_id_fkey foreign key (organization_id) references iam.organizations(id) not valid;
alter table public.app_settings add constraint public_app_settings_created_by_fkey foreign key (created_by) references iam.users(id) not valid;
alter table public.app_settings add constraint public_app_settings_updated_by_fkey foreign key (updated_by) references iam.users(id) not valid;
alter table public.app_sync_status add constraint public_app_sync_status_organization_id_fkey foreign key (organization_id) references iam.organizations(id) not valid;
alter table public.app_sync_status add constraint public_app_sync_status_created_by_fkey foreign key (created_by) references iam.users(id) not valid;
alter table public.app_sync_status add constraint public_app_sync_status_updated_by_fkey foreign key (updated_by) references iam.users(id) not valid;
alter table transcripts.studio_recording_chunks add constraint transcripts_studio_recording_chunks_organization_id_fkey foreign key (organization_id) references iam.organizations(id) not valid;

-- 4. studio_recording_chunks: the mutation pair (entity variant) + _touch_row, added the way retrofit_entity adds them.
alter table transcripts.studio_recording_chunks add column if not exists updated_at timestamptz not null default now();
alter table transcripts.studio_recording_chunks add column if not exists version integer not null default 1;
create trigger _touch_row before insert or update on transcripts.studio_recording_chunks for each row execute function platform._touch_row();
