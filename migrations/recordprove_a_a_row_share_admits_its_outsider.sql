-- additive: yes
--
-- why: a share on ONE ROW now admits the outsider it was addressed to, exactly as a share on a Table already did.
--   Found by lane RECORD-PROVE (2026-10-14) with a persona who belongs to no organization of admin@admin.com: a row shared at
--   viewer opened "We couldn't find this record", because custom.portal_admits ARM 2 admitted only a grant on a record that IS a
--   Table (t.table_id = table_kernel_id). Access ladder: "Sharing outside the organization follows the same rule as inside"
--   and "There are millions of things that need to be shared outside of the org" (Arman, 2026-10-11). The grant is the
--   admission; it admits and nothing more (the ladder is the next line of every door and shows only what the grant carries);
--   a revoke ends it in the same statement. Still behind `custom/external_principal_enabled`.
--
-- based-on: custom.portal_admits(uuid, uuid) 8190719bdd4f82269aff627b0fc976c24bc918b2f130f38470243ee924c84922
CREATE OR REPLACE FUNCTION custom.portal_admits(p_organization_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  return (
  select (coalesce(
           (platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean,
           false)
     and (
       -- ARM 1 — A PORTAL PRINCIPAL. The organization named this person, through a live
       -- portal, as somebody whose own records live here (PORTAL, 2026-09-20).
       exists (
         select 1
           from custom.portal_principal pp
           join custom.portal p on p.id = pp.portal_id and p.is_active
          where pp.organization_id = p_organization_id
            and pp.user_id = coalesce(p_user_id, (select auth.uid()))
            and pp.user_id is not null
            and pp.is_active)

       -- ARM 2 — A TABLE OR A ROW OF THIS ORGANIZATION IS SHARED WITH THIS PERSON (SHARE-OUT, 2026-09-21;
       -- widened to a row by RECORD-PROVE, 2026-10-14). A grant addressed to this person, on a record that
       -- IS of this organization (a Table, or one row of one), is that organization saying — explicitly, on
       -- the record — that this outsider may reach its doors. THE GRANT IS THE ADMISSION: revoking it revokes
       -- the admission in the same statement. IT ADMITS AND NOTHING MORE: the next line of every door is the
       -- ladder, and the ladder reads this person's grants, so this arm cannot show a single row the grant
       -- does not already carry, and it confers no membership.
       or exists (
         select 1
           from iam.permissions g
           join custom.record t
             on t.id = g.resource_id
            and t.organization_id = p_organization_id
            and t.deleted_at is null
          where g.resource_type = 'record'
            and g.granted_to_user_id = coalesce(p_user_id, (select auth.uid()))
            and g.granted_to_user_id is not null
            and g.status = 'active'
            and (g.expires_at is null or g.expires_at > now()))

       -- ARM 4 — A PAGE OF THIS ORGANIZATION THAT OWNS ONE OF ITS TABLES IS SHARED WITH THIS PERSON
       -- (spaces-store-2, 2026-10-07; access ladder "children inherit their parent"). A Space's own
       -- database (association `page_database`, document -> record) is part of its page, as in Notion:
       -- sharing the page shares it. Same shape as arm 2: the page's share is the admission and a revoke
       -- ends it. It admits only when the ladder already gives this person the Table through its page,
       -- and it admits nothing more: the next line of every door is the ladder.
       or exists (
         select 1
           from platform.associations a
           join custom.record t
             on t.id = a.target_id
            and t.organization_id = p_organization_id
            and t.deleted_at is null
          where a.deleted_at is null
            and a.label = 'page_database'
            and a.source_type = 'document'
            and a.target_type = 'record'
            and coalesce(p_user_id, (select auth.uid())) is not null
            and iam.has_access_for(coalesce(p_user_id, (select auth.uid())), 'record', t.id, 'viewer'::public.permission_level))
     ))
    -- ARM 3 — A SCOPE MEMBERSHIP ON ONE OF THIS ORGANIZATION'S RECORDS (lane SC-3', P7's read
    -- arm, 2026-09-24). A student the tutoring company admitted to one class. Outside the
    -- external-principal gate on purpose: that knob is the organization's answer about sharing
    -- with strangers, and this person was named on the record by the organization itself.
    -- `custom/scope_members_admitted` is where an organization says no. Like arm 2 it ADMITS
    -- AND NOTHING MORE: the ladder's arm 4 decides which records, and only at viewer.
    or (coalesce((platform.knob_resolve('custom', 'scope_members_admitted', p_organization_id) #>> '{}')::boolean, true)
        and exists (
          select 1
            from iam.memberships m
            join custom.record r
              on r.id = m.container_id
             and r.organization_id = p_organization_id
             and r.deleted_at is null
           where m.container_type = 'scope'
             and m.user_id = coalesce(p_user_id, (select auth.uid()))
             and m.user_id is not null
             and m.status = 'active'
             and m.deleted_at is null))
  );
end
$function$;
