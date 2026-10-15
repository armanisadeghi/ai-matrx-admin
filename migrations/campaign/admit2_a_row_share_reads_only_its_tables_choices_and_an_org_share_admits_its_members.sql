-- additive: yes
--
-- why: (1) A LEAK CLOSED. custom.field_options(org, field) returned the choice rows of ANY Field of the organization
--   to anybody the wall admitted: portal_admits (row share) sets the w:r memo, assert_public_reader_names_a_public_table
--   returns at once on that memo, and nothing asked whether the caller may know the Field's Table. Now field_options
--   asks custom.assert_may_know_table (Table opened, or anything in it shared) — the rule views/forms/pipelines use.
--   Sweep of every custom/platform door that calls assert_client_may_reach or the public-reader check: the only other
--   door that listed organization data on the wall alone was custom.query_relation_edges (every link id of the
--   organization); it now lists an outsider only links whose both ends the ladder shows (custom.seen_among). The
--   other doors check the ladder per Table or per row (query_visible_ids, has_visibility, my_level, seen_among,
--   assert_may_know_table...) or are organization-level metadata (letterhead, cadences, knobs).
-- (2) A MISSING OPENING. A grant addressed to an ORGANIZATION (granted_to_organization_id) never admitted that
--   organization's members: portal_admits read only granted_to_user_id. ARM 2 now also admits a member of the addressed
--   organization, exactly as a person share (active, unexpired, live record, same organization pin). iam.permissions has
--   no team/group-addressed column (teams are containers, not grantees), so there is no group share to admit.
-- door rulings: no new door and no changed argument list — client_callable_door rows for custom.field_options,
--   custom.query_relation_edges and custom.portal_admits keep their argument rulings unchanged.
--
-- based-on: custom.portal_admits(uuid, uuid) c579881e6b97d0f4c1326addfe050c1a0e5d5e94217e1ff73fda8390ae6dddd0
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
            -- ADMIT-2 (2026-10-15): the grant may be addressed to this person OR to an ORGANIZATION this person
            -- belongs to (granted_to_organization_id) — the ladder reads an organization grant the same way
            -- (iam.grant_addressed_level). Active, unexpired, live record and the same organization pin all
            -- still hold, and it still admits and nothing more: the ladder is the next line of every door.
            and coalesce(p_user_id, (select auth.uid())) is not null
            and (g.granted_to_user_id = coalesce(p_user_id, (select auth.uid()))
                 or g.granted_to_organization_id in (select om.organization_id
                                                       from iam.organization_member om
                                                      where om.user_id = coalesce(p_user_id, (select auth.uid()))))
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

-- based-on: custom.field_options(uuid, uuid) 87747b308a5025cd3518c4161737a5991ada1e6d5bf25a64bdc4467a816f5872
CREATE OR REPLACE FUNCTION custom.field_options(p_organization_id uuid, p_field_id uuid)
 RETURNS SETOF custom.record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table uuid;
begin
  -- The decision comes BEFORE the read, so a foreign organization id and an
  -- invented one answer identically: both are refused, neither is told whether
  -- the Field exists.
  perform custom.assert_store_door(p_organization_id, 'custom.field_options');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_options');
  -- CHAIR-WORLD-LANE-2: a person the wall admitted only through the world lane reads the choices of a Field
  -- of a Public Table, and of no other Field (an unknown Field names no Table, and is refused as before).
  v_table := (select t.id
                from custom.record f
                join custom.record t
                  on t.organization_id = f.organization_id
                 and t.id = platform.uuid_or_null(f.data ->> 'entity_definition_id')
                 and t.table_id = custom.table_kernel_id()
               where f.organization_id = p_organization_id
                 and f.id = p_field_id
                 and f.table_id = custom.field_kernel_id()
                 and f.deleted_at is null);
  perform custom.assert_public_reader_names_a_public_table(p_organization_id, v_table, 'custom.field_options');
  -- ADMIT-2 (2026-10-15): THE CHOICES ARE THE FIELD'S TABLE'S, SO THEY FOLLOW THAT TABLE. The wall above passes a
  -- person admitted by one share on ONE row (custom.portal_admits writes the w:r memo), and the public-lane check
  -- above returns at once once that memo is set; before this line such a person read the choice rows of ANY Field
  -- of ANY Table of the organization. The rule is the one views / forms / pipelines use: you know a Table when you
  -- may open it, or when anything in it has been shared with you (custom.assert_may_know_table) — which is also
  -- exactly what reading your own row's choice labels needs. A Field that names no Table is answered to the store,
  -- to a seat with no principal and to a member — never to somebody admitted from outside.
  if v_table is not null then
    perform custom.assert_may_know_table(p_organization_id, v_table, 'custom.field_options');
  elsif not (custom.query_is_store_owner()
             or custom.query_principal() is null
             or iam.has_org_access(p_organization_id)) then
    return;
  end if;

  -- IN THE ORDER THE PERSON DECLARED THEM (lane P, 2026-10-07). `custom._options_table_for`
  -- stamps `metadata.option_position`; without an ORDER BY this answered in heap order, so a
  -- status declared Idea · Planning · Assets ready · Posted came back Posted · Idea · Planning ·
  -- Assets ready in every dropdown and board that reads its choices here. Same order as
  -- `custom.choice_options`.
  return query
  select o.*
    from custom.record f
    join custom.record o
      on o.organization_id = f.organization_id
     and o.table_id = (f.data -> 'config' ->> 'options_table_id')::uuid
     and o.deleted_at is null
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
   order by (o.metadata ->> 'option_position')::integer nulls last, o.created_at, o.id;
end
$function$;

-- based-on: custom.query_relation_edges(uuid, text, text) 493fcdb8b043bb34d94b69cae540f2fc728f1a0754b0f8966df9d494aa41ec9e
CREATE OR REPLACE FUNCTION custom.query_relation_edges(p_organization_id uuid, p_flavor text DEFAULT NULL::text, p_role text DEFAULT NULL::text)
 RETURNS TABLE(parent_id uuid, child_id uuid, role text, flavor text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
declare
  v_me   uuid := custom.query_principal();
  v_open boolean;
  v_seen uuid[];
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.query_relation_edges');
  -- ADMIT-2 (2026-10-15): a person admitted from outside (a share on one row) reads only the links whose both ends
  -- the ladder shows them; the wall alone listed every link of the organization.
  v_open := custom.query_is_store_owner() or v_me is null or iam.has_org_access(p_organization_id);
  if not v_open then
    v_seen := coalesce(custom.seen_among(v_me, array(
                select x.id from (select a.source_id as id from platform.associations a
                                   where a.organization_id = p_organization_id and a.deleted_at is null
                                     and a.source_type = 'record'
                                     and (a.relation_field_id is not null or a.role = 'references')
                                  union
                                  select a.target_id from platform.associations a
                                   where a.organization_id = p_organization_id and a.deleted_at is null
                                     and a.source_type = 'record'
                                     and (a.relation_field_id is not null or a.role = 'references')) x)),
              '{}'::uuid[]);
  end if;
  return query
select a.source_id, a.target_id, a.role, d.declaration ->> 'flavor'
    from platform.associations a
    cross join lateral (select case when a.relation_field_id is not null
                                   then platform.relation_declaration(p_organization_id, a.relation_field_id)
                                   -- A carrying link is a `referenced` relation by construction:
                                   -- custom.relation_carry writes kind = 'referenced', carrying,
                                   -- role = 'references', and custom.carrying_rule caps what it
                                   -- conveys at viewer. There is no declaration row to read
                                   -- because there is no field.
                                   else jsonb_build_object('flavor', 'referenced')
                              end as declaration) d
   where a.organization_id = p_organization_id
     and a.deleted_at is null
     -- STORE-T / T11: an edge names a relation FIELD, **or** it is a carrying link, which
     -- has no field because the link itself is the relation (REL-6). Excluding the second
     -- kind was excluding the only relation T11 is about.
     and (a.relation_field_id is not null or a.role = 'references')
     and a.source_type = 'record'
     and (p_role is null or a.role = p_role)
     and (p_flavor is null or d.declaration ->> 'flavor' = p_flavor)
     and (v_open or (a.source_id = any (v_seen) and a.target_id = any (v_seen)));
end;
$function$;
