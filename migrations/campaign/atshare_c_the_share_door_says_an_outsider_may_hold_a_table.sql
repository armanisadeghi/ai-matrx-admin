-- lane: AT-SHARE
-- scope: the argument ruling of custom.share_grant's p_principal_id said a person must be a member or a portal principal. Since atshare_a_a_whole_table_can_be_shared_outside_the_organization.sql that is no longer the body; the ruling now says what the body does. Text only, no behaviour.
-- additive: yes
update platform.client_callable_door
   set argument_rules = jsonb_set(argument_rules, '{arguments,p_principal_id}',
     jsonb_build_object(
       'type', 'uuid',
       'check', 'ANY existing person: a Row or a whole Table is shared with a person inside or outside the organization by the same rule (owner ruling 2026-10-11). What the caller may hand out is capped by iam.may_grant_as (Edit shares View / Comment / Edit; Full shares at Full), decided before the subject is read; a person who is no one is refused by the share writer.',
       'access', 'whoever may share the subject at the level asked, to any person',
       'foreign', jsonb_build_object('note', 'the grant names the person and nothing else of theirs is read', 'not_a_leak', true, 'same_as_invented', true),
       'verified', '2026-10-15 lane AT-SHARE — scripts/campaign-tests/atshare_table_to_outsider_green.sql, rolled back'))
 where schema_name = 'custom' and function_name = 'share_grant';
