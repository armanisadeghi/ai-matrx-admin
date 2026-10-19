-- why: AT-SWEEP-2: the shared refusal sentence of custom.assert_client_may_change said "needs the admin level"; the share screens and the vocabulary say Full access (View, Comment, Edit, Full access; utils/permissions/levels.ts). One word per level, message and hint.
-- Proof: scripts/campaign-tests/atsweep2_a_the_ladder_sentence_says_full_access.sql. Inverse: migrations/inverse/atsweep2_a_the_ladder_sentence_says_full_access_down.sql
-- based-on: custom.assert_client_may_change(uuid, uuid, text, permission_level, text) dfc23c500cfa4f31448bdfb44699836129677ba8588dc5e339020b2eb483d7f8

CREATE OR REPLACE FUNCTION custom.assert_client_may_change(p_organization_id uuid, p_subject_id uuid, p_door text, p_required permission_level DEFAULT 'editor'::permission_level, p_subject_word text DEFAULT 'record'::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me          uuid;
  v_subject_org uuid;
  v_held        public.permission_level;
begin
  -- ONE order, always: the organization wall first, then the row.
  perform custom.assert_client_may_reach(p_organization_id, p_door);

  -- Way through 1: the role that owns the store (every campaign and server lane).
  if custom.query_is_store_owner() then
    return;
  end if;

  if p_subject_id is null then
    return;
  end if;

  -- Way through 2: no signed-in person at all — the anonymous capture door, which has
  -- already decided this write against the form's own token.
  v_me := custom.query_principal();
  if v_me is null then
    return;
  end if;

  -- WHERE THE SUBJECT ACTUALLY LIVES, BY ITS ID AND NOTHING ELSE (2026-09-23). A subject
  -- outside p_organization_id used to be waved through on the promise that the door would
  -- filter by that organization; the same promise was broken on the read side
  -- (`custom.record_as_of`, a cross-organization leak proven live). Access is decided by the
  -- PERSON and the ROW (organization-is-the-container rule 5).
  select r.organization_id into v_subject_org
    from custom.record r
   where r.id = p_subject_id;

  -- Not there at all: the door raises its own 02000 a line later.
  if v_subject_org is null then
    return;
  end if;

  -- The globally readable platform tenant's kernel Tables: unchanged — the door decides.
  if v_subject_org is distinct from p_organization_id
     and exists (select 1 from iam.system_orgs s
                  where s.organization_id = v_subject_org and s.global_readable) then
    return;
  end if;

  if custom.has_visibility(v_me, 'record', p_subject_id, p_required) then
    return;
  end if;

  -- THE REFUSAL NAMES THE RUNG HELD, NOT ONLY THE RUNG NEEDED (lane TAILS, 2026-09-21).
  v_held := custom.effective_level(v_me, v_subject_org, p_subject_id, 'record');

  if v_held is null then
    raise exception 'You do not have access to this %, so % may not write to it.',
      coalesce(nullif(btrim(p_subject_word), ''), 'record'),
      coalesce(nullif(btrim(p_door), ''), 'that door')
      using errcode = '42501',
            hint = format(
              'DOOR-1 decides reading and writing with the SAME question: a %s you may not open is a %s you may not change. This needs %s (View < Comment < Edit < Full access) - ask whoever has it to share it with you, or ask an owner of this organization. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end);
  end if;

  raise exception 'You have % on this %, and % needs %.',
    case v_held::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text end,
    coalesce(nullif(btrim(p_subject_word), ''), 'record'),
    coalesce(nullif(btrim(p_door), ''), 'that door'),
    case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end
    using errcode = '42501',
          hint = format(
            'DOOR-1 decides reading and writing with the SAME question, on ONE ladder: View < Comment < Edit < Full access. You have %s on this %s and %s needs %s, so ask someone with Full access on this %s - or an owner of this organization - to raise your access. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
            case v_held::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text end,
            coalesce(nullif(btrim(p_subject_word), ''), 'record'),
            coalesce(nullif(btrim(p_door), ''), 'that door'),
            case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end,
            coalesce(nullif(btrim(p_subject_word), ''), 'record'));
end
$function$
