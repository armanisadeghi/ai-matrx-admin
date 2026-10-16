--
-- why: a found thing can be OURS and still never be used (Arman, 2026-10-15): a former address or account, a
--   misspelling of our name, a wrong or outdated listing, a link that goes nowhere. These are kept as identity
--   signals for matching and finding the brand on the web, but marketing never shows or uses them. "Maybe" is
--   undecided: not used, stays in review.
--
-- web.brand_relation_kind.usage — the usage class every consumer honors:
--   use        → shown on brand surfaces and fed to marketing work (the default; every existing kind)
--   match_only → kept for matching / dedupe / search, never shown on marketing surfaces nor fed to agents
--   undecided  → not used, not shown on marketing surfaces, stays in review (a weak match signal at most)
-- web.property rows follow the same rule through their status: 'active' is the only marketing status; a
--   property whose link is dead is status 'match_only' with metadata.relation = {key: 'broken_link', reason, ...}.
--
-- New system kinds: broken_link, maybe, ours_but_wrong, misspelled, backlink (use; detection lives elsewhere).
-- former_account becomes "Former" (an old address, name or account) and match_only.

alter table web.brand_relation_kind
  add column if not exists usage text not null default 'use';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'web.brand_relation_kind'::regclass and conname = 'brand_relation_kind_usage_check'
  ) then
    alter table web.brand_relation_kind
      add constraint brand_relation_kind_usage_check check (usage in ('use', 'match_only', 'undecided'));
  end if;
end $$;

comment on column web.brand_relation_kind.usage is
  'Usage class: use (shown + used by marketing), match_only (kept for matching only, never shown or used), undecided (Maybe: not used, stays in review).';

insert into web.brand_relation_kind
  (organization_id, key, label, routes_to, is_known, sort, status, stance, usage, description, has_sentiment,
   visibility, published_to_web, published_to_web_at, metadata)
select '39c38960-d30c-4840-b0c1-c9960de95582'::uuid, v.key, v.label, null, true, v.sort, 'active', v.stance, v.usage,
       v.description, false, 'public', true, now(), '{}'::jsonb
from (values
  ('broken_link', 'Broken link', 81, 'ours', 'match_only',
   'A link to a page or account that no longer exists. Kept for matching, never shown or used.'),
  ('ours_but_wrong', 'Ours, but wrong', 82, 'ours', 'match_only',
   'Us, but wrong or outdated. Kept for matching, never shown or used.'),
  ('misspelled', 'Misspelled', 83, 'ours', 'match_only',
   'Us, under a misspelled name. Kept for matching, never shown or used.'),
  ('maybe', 'Maybe', 15, 'about_us', 'undecided',
   'Might be us; not decided. Not used until someone decides.'),
  ('backlink', 'Backlink', 9, 'about_us', 'use',
   'A site that links to our website or one of our accounts.')
) as v(key, label, sort, stance, usage, description)
where not exists (
  select 1 from web.brand_relation_kind k
  where k.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid and k.key = v.key and k.deleted_at is null
);

update web.brand_relation_kind
set label = 'Former', stance = 'ours', usage = 'match_only', sort = 80,
    description = 'An old address, name or account of ours. Kept for matching, never shown or used.',
    updated_at = now()
where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid and key = 'former_account' and deleted_at is null
  and usage is distinct from 'match_only';
