-- target: production
-- additive: yes
--   CHANGES one knob row's platform value, custom/field_sensitivity_levels read.confidential editor -> admin (value and
--   default_value), and ADDS one trigger, platform.feature_knob zzzzzz_access_version_u, on the existing trigger function
--   custom._access_version_bump_stmt(). No function body is replaced. No organization override row is touched.
--   Inverse: migrations/inverse/20261020140000_confdef_a_a_confidential_column_is_read_from_admin_down.sql.
-- guard: custom/system_enabled
-- lock: platform
-- lane: confidential-default
-- based-on: iam.field_sensitivity_level(text, text, uuid) a30667ea4dc66276de846f666afe2f7f946bb5d4ae99a1f01c9694d21275b14a
-- based-on: custom._access_version_bump_stmt() 430aafdce4266b68df322274f0ea2a94f080a9d15467bb410287014e8edd1d5d
--
-- CONFIDENTIAL-DEFAULT (Arman, 2026-10-20, in chat; common-docs custom-data VISION "Confidential columns hide below admin
-- by default"): a column marked Confidential is hidden below admin unless someone is granted it. The one rule is the knob
-- custom/field_sensitivity_levels (read through iam.field_sensitivity_level by every read door, mask and notice); its
-- platform value read Confidential from Editor, and every member starts at Editor (custom/member_default_level), so
-- members saw it. Only the platform value moves: an organization's own override row (platform.knob_override) still wins,
-- and an explicit field grant (iam.permissions resource_type='field') still opens the column.
--
-- Who loses sight (counted on live before applying, 2026-10-20): 343 confidential columns on 176 tables in 38
-- organizations; 6 of those organizations have plain members (11 members, 96 tables, 204 columns); no field grant exists
-- on any confidential column; no organization overrides either knob.
--
-- THE KEPT MASKS FOLLOW A PLATFORM KNOB CHANGE. custom.read_mask_kept is valid while custom._access_versions(org) is
-- unchanged; a knob_override write bumps it, a platform.feature_knob write did not, so a changed platform default was
-- served from kept masks for up to 5 minutes. The trigger below bumps the platform version (every organization's second
-- version slot) when a `custom` knob's value or default_value changes; it fires for this migration's own update.

do $$
declare
  v_now jsonb;
begin
  select coalesce(value, default_value) into v_now
    from platform.feature_knob where feature = 'custom' and key = 'field_sensitivity_levels';
  if v_now is null then
    raise exception 'CONFIDENTIAL-DEFAULT: the knob custom/field_sensitivity_levels is missing. Nothing was changed.';
  end if;
  if v_now -> 'read' ->> 'confidential' not in ('editor', 'admin') then
    raise exception 'CONFIDENTIAL-DEFAULT: custom/field_sensitivity_levels reads confidential from %, not editor; someone changed it since this was written. Nothing was changed.',
      v_now -> 'read' ->> 'confidential';
  end if;
end $$;

create trigger zzzzzz_access_version_u
  after update on platform.feature_knob
  for each row
  when (new.feature = 'custom'
        and (old.value is distinct from new.value or old.default_value is distinct from new.default_value))
  execute function custom._access_version_bump_stmt();

update platform.feature_knob
   set value         = jsonb_set(value, '{read,confidential}', '"admin"'::jsonb),
       default_value = jsonb_set(default_value, '{read,confidential}', '"admin"'::jsonb),
       basis = basis || ' | 2026-10-20 CONFIDENTIAL-DEFAULT (Arman, in chat: "For confidential columns... yes."): a Confidential column is read from Admin; below admin it is hidden unless granted. Organizations may still override.',
       set_by = 'agent'
 where feature = 'custom' and key = 'field_sensitivity_levels';
