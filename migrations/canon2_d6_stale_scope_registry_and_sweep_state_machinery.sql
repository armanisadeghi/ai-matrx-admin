-- Canonicalization wave 2, lane D, items 6 + 7 (part). Registry rows only — no policy, grant,
-- column or association change.
--
-- Item 6: six context.* tokens kept pointing at context.<table> after the Scopes tables moved to
-- the deprecated schema (audit.stale_registry). Scopes now live in the record store: all 401 live
-- platform.associations rows with token 'scope' name custom.record ids.
--   * context_item_value, context_value_refs, scope_dataset_instance: no association, no
--     permission, no code reference in either repo -> retired (type deprecated, inactive), which
--     is exactly the shape audit.refresh_static treats as "a retired table's record, not drift".
--   * scope, scope_type, context_item: still live vocabulary — 'scope' carries the 401 edges and
--     25 association types, scope_type/context_item carry 17 association types and are named by
--     item-presentation in the app. They cannot be re-pointed at custom.record (one registry row per
--     table; custom.record is the 'record' token) and must not be retired, so each gets the designed
--     stale_registry exemption with that reason.
-- Item 7: web.endpoint_family_sweep_state is the scraper's per-site sweep watermark (written by the
--   server's matrx-scraper models, platform-admin-only policy) -> machinery (Arman 2026-10-22).
set lock_timeout = '2s';

update platform.entity_types
   set type = 'deprecated', is_active = false, custom_fields_enabled = false
 where token in ('context_item_value', 'context_value_refs', 'scope_dataset_instance')
   and schema_name = 'context';

insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id)
select 'stale_registry', 'context', v.t, v.r, '39c38960-d30c-4840-b0c1-c9960de95582'::uuid
from (values
  ('scopes', 'token scope is live association vocabulary: 401 live platform.associations edges name custom.record ids (scopes moved into the record store); the legacy table is deprecated.scopes and custom.record is registered as token record'),
  ('scope_types', 'token scope_type is live vocabulary: 15 active association types and the app''s item-presentation registry name it; the legacy table is deprecated.scope_types'),
  ('context_items', 'token context_item is live vocabulary: 2 active association types and the app''s item-presentation registry name it; the legacy table is deprecated.context_items')
) as v(t, r)
where not exists (select 1 from meta.audit_exemption e
                  where e.check_name = 'stale_registry' and e.schema_name = 'context' and e.table_name = v.t);

do $$ begin
  if exists (select 1 from web.endpoint_family_sweep_state where custom_fields is not null and custom_fields <> '{}'::jsonb) then
    raise exception 'endpoint_family_sweep_state carries custom field values';
  end if;
end $$;

update platform.entity_types
   set audit_class = 'machinery', type = 'system', rls_variant = 'system',
       is_component = false, custom_fields_enabled = false,
       audit_class_reason = 'machinery: the scraper''s per-site endpoint-family sweep watermark (last sweep, next eligible, totals); written by the server''s matrx-scraper, read by platform admins only'
 where schema_name = 'web' and table_name = 'endpoint_family_sweep_state';
