-- chair-step: canonicalization lane 8 turns row security ON for seven closed-store tables (custom.portal, portal_principal, portal_table, iam.publish_binding, publisher_verification, world_namespace, world_publish_admission) so they can register as machinery; every reader is postgres-owned SECURITY DEFINER or service_role (both BYPASSRLS), no client role holds a privilege, so no read changes
-- Canonicalization lane 8 (2026-10-22).
--
-- A) Thirteen tables the m2m detector (audit.is_m2m_shape) flags are REAL RECORDS that merely
--    reference two others — each has its own lifecycle/payload that people or the engine act on —
--    so each gets the designed exemption row (meta.audit_exemption, check 'm2m_candidate').
--    The two TRUE LINKS (web.site_offering, workbench.product_capture_file) are NOT exempted:
--    they stay flagged until their feature cut-over to platform.associations.
--
-- B) Eleven unregistered tables, all created by campaign files, all closed-store state: owned by
--    postgres, no anon/authenticated privilege, read and written only by SECURITY DEFINER doors
--    (custom.* store doors and the iam publish/world-lane doors). They register as
--    audit_class='machinery' with a reason, following the custom.automation_fired /
--    iam.content_lane precedent. Seven of them had row security OFF; machinery requires it ON.
--    Enabling it changes nothing for any reader: every table is owned by postgres (BYPASSRLS),
--    every reading function is SECURITY DEFINER owned by postgres, and the only other privilege
--    is service_role SELECT (BYPASSRLS). platform._admin_read_follows_rls adds platform_admin_read.

set lock_timeout = '2s';

-- ── A) m2m exemptions ──────────────────────────────────────────────────────────────────────────
insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id)
select 'm2m_candidate', v.s, v.t, v.r, '39c38960-d30c-4840-b0c1-c9960de95582'::uuid
from (values
  ('commerce','ebay_inventory_item_group_member','mirror of eBay''s inventory-item-group membership (sort_order, removal_blocked_reason) synced to and from eBay, not a platform link'),
  ('crm','merge_candidate','entity: a detected duplicate pair with signals, confidence and a dismiss/merge status people act on'),
  ('hr','review_peer_nomination','entity: a peer nomination for a review with its own status and decision (decided_by/decided_at)'),
  ('hr','scorecard','entity: one interviewer''s scorecard (responses, rating, recommendation, draft/submitted), not a link'),
  ('platform','association_types','registry: the association type catalog itself (source/target type pairs), the thing that defines links'),
  ('provider','account_credential','credential binding with a role (one primary per account); associations convey access, a credential link must never'),
  ('seo','page_mapping_queue','work queue: one item per (site,page) with status, attempts, claims and errors; consumed and completed by a worker'),
  ('seo','site_keyword_offering','entity: a three-way site/keyword/offering assignment with is_primary, confidence and assigned_by; associations are binary'),
  ('seo','site_topic_value','entity: a site''s scored valuation of a topic (six score dimensions and a weight), not a link'),
  ('seo','topic_placement_queue','work queue: one item per (site,keyword) with status, attempts, claims and errors; consumed and completed by a worker'),
  ('social','watchlist_hit','entity: a watchlist hit with score and a triage state people move, not a link'),
  ('tool','binding','routing machinery: which executor runs a tool definition (is_active), read by the tool runtime, never a person-facing link'),
  ('web','location_listing','entity: a business location''s observed listing on a publisher (url, status, NAP match, last checked)')
) as v(s,t,r)
where not exists (select 1 from meta.audit_exemption e
                  where e.check_name='m2m_candidate' and e.schema_name=v.s and e.table_name=v.t);

-- ── B) row security on for the seven closed-store tables that had it off ──────────────────────
alter table custom.portal enable row level security;
alter table custom.portal_principal enable row level security;
alter table custom.portal_table enable row level security;
alter table iam.publish_binding enable row level security;
alter table iam.publisher_verification enable row level security;
alter table iam.world_namespace enable row level security;
alter table iam.world_publish_admission enable row level security;

-- ── B) registration as machinery ──────────────────────────────────────────────────────────────
insert into platform.entity_types
  (token, schema_name, table_name, label, base_tier, is_versioned, has_soft_delete, is_active,
   rls_variant, audit_class, audit_class_reason, type, data_class, data_class_reason, origin, table_ref, notes)
select v.tok, v.s, v.t, v.lbl, 1, false, false, true,
       'entity', 'machinery', v.reason, 'system', 'organization',
       'Closed-store state with no client privilege; reached only through SECURITY DEFINER doors.',
       'standard', format('%I.%I', v.s, v.t)::regclass,
       'Registered 2026-10-22 by canonicalization lane 8 (was unregistered since its campaign file).'
from (values
  ('custom_agent_table_origin','custom','agent_table_origin','Agent Table Origin',
   'machinery: one row per Table an agent declared; written only by custom.agent_table_claim, read by custom.agent_change_approval and custom.table_move; no client grant'),
  ('custom_anon_form_draft','custom','anon_form_draft','Anonymous Form Draft',
   'machinery: a stranger''s unfinished answers to a public form keyed by a secret hash; written by custom.form_draft_save, consumed by custom.form_submit; never a record; no client grant'),
  ('custom_inbox_item_state','custom','inbox_item_state','Inbox Item State',
   'machinery: one person''s snooze/clear/remind state about an inbox item; written only by custom.inbox_* doors and inbox_remind_tick, read through custom._inbox_items; no client grant'),
  ('custom_portal','custom','portal','Portal',
   'machinery: closed-store portal declaration; written by custom.portal_declare/archive/restore and read through custom.list_portals/portal_card and the portal doors; schema custom is door-only, no client grant'),
  ('custom_portal_principal','custom','portal_principal','Portal Principal',
   'machinery: an outsider''s invitation/identity binding for one portal (access machinery like iam.invitations); written by custom.portal_invite/bind/revoke; no client grant'),
  ('custom_portal_table','custom','portal_table','Portal Table',
   'machinery: one Table a portal exposes and its visible/editable field masks; written by custom.portal_declare, read by the store access doors; no client grant'),
  ('custom_whole_value_parked','custom','whole_value_parked','Parked Whole Value',
   'machinery: an oversize text value waiting for the server to write its file; written inside custom._value_envelope, cleared by custom.whole_value_complete; no client grant'),
  ('iam_publish_binding','iam','publish_binding','Publish Binding',
   'machinery: a record bound to a public URL with a render mode; written only by iam.publish_binding_create/revoke and custom.publish_bind, read by iam.resolve_publish_binding; no client grant'),
  ('iam_publisher_verification','iam','publisher_verification','Publisher Verification',
   'machinery: whether an organization may publish to the world and how it was verified; read only by iam.world_publish_admit; no client grant'),
  ('iam_world_namespace','iam','world_namespace','World Namespace',
   'machinery: the one namespace an organization claimed for world publishing; written by iam.claim_world_namespace, read by the world-lane doors; no client grant'),
  ('iam_world_publish_admission','iam','world_publish_admission','World Publish Admission',
   'machinery: one row per admission to the world lane; written by iam.publish_to_world, read by iam.world_publish_announcement; no client grant')
) as v(tok,s,t,lbl,reason)
where not exists (select 1 from platform.entity_types et where et.schema_name=v.s and et.table_name=v.t)
on conflict do nothing;
