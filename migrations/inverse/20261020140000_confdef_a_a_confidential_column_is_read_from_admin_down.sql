-- chair-step: inverse of 20261020140000_confdef_a_a_confidential_column_is_read_from_admin — custom/field_sensitivity_levels reads confidential from Editor again (value and default_value), the basis loses its CONFIDENTIAL-DEFAULT sentence, and the platform.feature_knob access-version trigger is dropped (after the update, so that update still bumps the version).
-- lane: confidential-default
-- lock: platform

update platform.feature_knob
   set value         = jsonb_set(value, '{read,confidential}', '"editor"'::jsonb),
       default_value = jsonb_set(default_value, '{read,confidential}', '"editor"'::jsonb),
       basis = regexp_replace(basis, ' \| 2026-10-20 CONFIDENTIAL-DEFAULT .*$', '')
 where feature = 'custom' and key = 'field_sensitivity_levels';

drop trigger if exists zzzzzz_access_version_u on platform.feature_knob;
