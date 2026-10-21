-- Lane CLOSE-LINK (CD-LINK-07, acceptance test 3 "Reparent"). REPLACES custom.record_reparent(uuid, uuid, uuid) by body (same signature, same doors, same grants). Adds two refusals before the write: a record cannot move under itself, and it cannot move under a record that already sits inside it (its descendant along parent_id). Both say the two records' names. No table, column or door is added. Inverse: migrations/inverse/20261021140000_closelink_a_a_record_never_moves_under_its_own_descendant_down.sql.
-- lane: close-link
-- lock: custom
-- based-on: custom.record_reparent(uuid, uuid, uuid) 24608a8d8972a1fd6387506500941b57cb8ce50ad4bf915ea6ea314cdd1be0b2
--
-- Before: custom.record_reparent wrote data.parent_id whatever it named, so "Move Class 101 under Assignment 4"
-- (Assignment 4 sits inside Class 101) committed and made a ring: each record became the other's container, and
-- custom.visibility_ancestors walked the ring until its path guard stopped it. "Into two parents" cannot happen:
-- a record's parent is ONE key (data.parent_id), so a move replaces the parent, never adds a second.
-- Test: scripts/campaign-tests/closelink_reparent_green.sql (RED before: the move under a descendant commits).

set lock_timeout = '3s';
set statement_timeout = '60s';

create or replace function custom.record_reparent(p_organization_id uuid, p_record_id uuid, p_parent_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_inside boolean;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_reparent');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_reparent', 'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.record_reparent');
  if p_organization_id is null or p_record_id is null then
    raise exception 'custom.record_reparent: the organization and the record are required'
      using errcode = '22004';
  end if;
  -- ARGS-RULED (2026-09-21). THE PARENT IS A RECORD YOU MAY OPEN, IN THIS ORGANIZATION.
  -- `parent_id` is a CARRYING edge: `custom.visibility_ancestors` walks it and
  -- `custom.reaches_directly` arm 3 says an ancestor conveys its level to what is inside it. So
  -- this argument decides WHO ELSE can reach the record being moved — and it was never asked
  -- about. A caller could put their record inside a container they cannot see (handing it to
  -- whoever holds that container, and adding a row to a list its owner never added to), or name
  -- an id in another organization entirely and leave a pointer to nothing.
  -- `viewer` and not `editor`: filing something into a container is not changing the container,
  -- and the store already decides changing it separately.
  if p_parent_id is not null then
    perform custom.assert_client_may_open(p_organization_id, p_parent_id, 'custom.record_reparent',
                                          'viewer'::public.permission_level, 'record');
  end if;

  -- CLOSE-LINK (CD-LINK-07, test 3): A RECORD NEVER MOVES UNDER ITSELF OR UNDER WHAT IS INSIDE IT. The walk climbs
  -- data.parent_id from the new parent; if it meets the record being moved, the move would make a ring.
  if p_parent_id is not null and p_parent_id = p_record_id then
    raise exception '"%" cannot move under itself.',
      coalesce(nullif(platform.relation_label(p_organization_id, 'record', p_record_id), ''), 'This record')
      using errcode = '23514', hint = 'Test 3 (Reparent): pick another record to put it under. Nothing was moved.';
  end if;
  if p_parent_id is not null then
    with recursive up(id, depth) as (
      select p_parent_id, 0
      union all
      select nullif(r.data ->> 'parent_id', '')::uuid, u.depth + 1
        from up u
        join custom.record r on r.organization_id = p_organization_id and r.id = u.id
       where u.depth < 64 and nullif(r.data ->> 'parent_id', '') is not null
    ) cycle id set looped using trail
    select coalesce(bool_or(u.id = p_record_id), false) into v_inside from up u where not u.looped;
    if v_inside then
      raise exception '"%" cannot move under "%", because "%" is inside it.',
        coalesce(nullif(platform.relation_label(p_organization_id, 'record', p_record_id), ''), 'This record'),
        coalesce(nullif(platform.relation_label(p_organization_id, 'record', p_parent_id), ''), 'that record'),
        coalesce(nullif(platform.relation_label(p_organization_id, 'record', p_parent_id), ''), 'that record')
        using errcode = '23514', hint = 'Test 3 (Reparent): a record cannot sit inside its own child. Move the child out first. Nothing was moved.';
    end if;
  end if;

  update custom.record r
     set data = case when p_parent_id is null
                     then r.data - 'parent_id'
                     else r.data || jsonb_build_object('parent_id', p_parent_id::text) end
   where r.organization_id = p_organization_id and r.id = p_record_id;
  if not found then
    raise exception 'that record is not in this organization' using errcode = '23503';
  end if;
end;
$function$;
