-- additive: yes
--
-- why: the inverse of migrations/campaign/admit2_a_row_share_reads_only_its_tables_choices_and_an_org_share_admits_its_members.sql —
--   portal_admits reads only a grant addressed to a person; field_options and query_relation_edges are back on the wall alone.
--   (Restoring field_options reopens the leak that migration closed; run only to roll the whole change back.)
--
-- based-on: custom.portal_admits(uuid, uuid) d23e6ef3b66cf7212644c667f304eff15fdb92cd8706193bb9d231a4f433facc
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

-- based-on: custom.field_options(uuid, uuid) 77da94781a533112ffe6da9501a834f7bef4269b15eb6590f6760166f3cb28ee
CREATE OR REPLACE FUNCTION custom.field_options(p_organization_id uuid, p_field_id uuid)
 RETURNS SETOF custom.record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- The decision comes BEFORE the read, so a foreign organization id and an
  -- invented one answer identically: both are refused, neither is told whether
  -- the Field exists.
  perform custom.assert_store_door(p_organization_id, 'custom.field_options');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_options');
  -- CHAIR-WORLD-LANE-2: a person the wall admitted only through the world lane reads the choices of a Field
  -- of a Public Table, and of no other Field (an unknown Field names no Table, and is refused as before).
  perform custom.assert_public_reader_names_a_public_table(p_organization_id,
    (select t.id
       from custom.record f
       join custom.record t
         on t.organization_id = f.organization_id
        and t.id = platform.uuid_or_null(f.data ->> 'entity_definition_id')
        and t.table_id = custom.table_kernel_id()
      where f.organization_id = p_organization_id
        and f.id = p_field_id
        and f.table_id = custom.field_kernel_id()
        and f.deleted_at is null),
    'custom.field_options');

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

-- based-on: custom.query_relation_edges(uuid, text, text) af5426e108a74a3c3e6c59e03b84743ca2b3c2ebf4141fb8ae6d445a975d109c
CREATE OR REPLACE FUNCTION custom.query_relation_edges(p_organization_id uuid, p_flavor text DEFAULT NULL::text, p_role text DEFAULT NULL::text)
 RETURNS TABLE(parent_id uuid, child_id uuid, role text, flavor text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.query_relation_edges');
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
     and (p_flavor is null or d.declaration ->> 'flavor' = p_flavor);
end;
$function$;
