-- The move-and-archive § 12 parity census: what each live delete/archive/move function writes, refuses, previews,
-- stamps and moves (regex reads of pg_get_functiondef). Read-only. Output feeds PLAN.md § 12 "Parity census".
with names(fn) as (values
 ('public.move_site_to_organization'),('public.preview_site_organization_move'),('platform.carry_children_to_organization'),
 ('platform.org_follow_only'),('web.reject_crawl_fact_mutation'),('web.reject_immutable_fact_mutation'),
 ('custom.table_move'),('custom._table_move_plan'),('platform.set_home'),('chat.move_coding_conversations_to_organization'),
 ('files.files_org_move_guard'),('platform._cascade_soft_delete'),('platform._guard_soft_delete_parent'),('platform.declare_soft_delete_edge'),
 ('platform.soft_delete_cascade_job'),('platform.soft_delete_cascade_step'),('platform.soft_delete_cascade_drain'),('platform.soft_delete_cascade_advance'),('platform.soft_delete_cascade_progress'),
 ('platform._gc_entity_associations'),('public.entity_soft_delete'),('public.entity_undelete'),('platform.entity_archive'),('platform.entity_unarchive'),
 ('platform._entity_trash_or_restore'),('public.org_trash_restore'),('web.brand_archive'),('web.brand_archive_preview'),('web.brand_archive_associated'),
 ('web._brand_cascade_softdelete_extras'),('web.brand_restore'),('custom.table_archive'),('custom.table_restore'),('custom.delete_rule'),('custom.delete_cascade_closure'),('custom.record_delete'),
 ('custom.relation_carry'),('custom.relation_uncarry'),('platform.carrying_cycles'),('iam.organization_archive'),('iam.organization_restore'),
 ('public.team_archive'),('custom.automation_archive'),('custom.form_archive'),('custom.portal_archive'),('custom.template_archive'),('custom.table_webhook_archive'),
 ('custom.context_item_archive'),('custom.context_scope_archive'),('custom.context_type_archive'),('hr.hr_goal_archive'),('hr.hr_review_template_archive'),
 ('public.cx_canvas_archive'),('public.cat_archive'),('public.rulebook_archive'),('public.saved_view_archive'),
 ('workflow._cascade_definition_soft_delete'),('plan._node_cascade'),('docproc.cascade_file_softdelete_to_documents'),('docproc.trash_the_whole_source'),('docproc.trash_source_originals'),
 ('rag.soft_delete_members_on_file_delete'),('public.cx_soft_delete_conversation'),('public.cx_message_soft_delete'),('runtime.spine_soft_delete_conversation_requests'),
 ('public.soft_delete_file'),('public.soft_delete_folder'),('extend._soft_delete_follows_deleted_at'),
 ('custom.migrate_purge_hard_request'),('rag.fn_purge_library_document'),('rag.fn_purge_library_file'),('public.crm_party_purge')
), f as (
 select n.fn, p.oid, pg_get_function_identity_arguments(p.oid) args, pg_get_functiondef(p.oid) d
   from names n left join pg_proc p on p.oid = (select pp.oid from pg_proc pp join pg_namespace ns on ns.oid=pp.pronamespace
                                                 where ns.nspname||'.'||pp.proname = n.fn limit 1)
)
select fn,
  case when oid is null then 'MISSING' else args end args,
  (select string_agg(distinct m[1], ', ') from regexp_matches(coalesce(d,''), '(?:update|insert into|delete from)\s+([a-z_]+\.[a-z_]+)', 'gi') m) writes,
  (select string_agg(left(m[1],90), ' / ') from (select m from regexp_matches(coalesce(d,''), 'message\s*=\s*(?:pg_catalog\.)?(?:format\()?''([^'']{8,})', 'gi') m limit 2) z) refuses,
  (coalesce(d,'') ~* 'preview') previews,
  (coalesce(d,'') ~* 'deleted_at') stamps,
  (coalesce(d,'') ~* 'organization_id\s*=') moves_org
from f order by fn;
