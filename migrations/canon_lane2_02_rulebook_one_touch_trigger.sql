-- chair-step: canonicalization lane 2 retires platform._touch_rulebook into the canonical platform._touch_row (one touch trigger on platform.rulebook)
-- based-on: platform._touch_row() 308727fb3469230a2f9f91d7f91a8772492e266a2958fdab2b3e005d67ffe627
-- based-on: trigger _touch_row on platform.rulebook 8ea26e3ba23cb9f7d5bd1d7077325578be5e2d7b0c21fbbc019c7fdb9da4e66b
-- lane: canonicalization lane 2 (schema platform, m-z).
--
-- platform.rulebook carried a trigger NAMED _touch_row that ran a Rulebook-only copy,
-- platform._touch_rulebook(): identical to platform._touch_row except that an UPDATE which
-- moves nothing but the stamp columns and the DECLARED BACKGROUND metadata keys carries
-- `version` forward instead of bumping it (aidream migration 0728, wall W12: a Coherence
-- Partner note must not age out the Expert's open save). The certifier counts the canonical
-- function, so retrofit_entity found the name taken (42710) and the table read "missing
-- _touch_row".
--
-- The fix extends the ONE shared function in place instead of keeping a fork:
--   platform._touch_row() now reads its trigger arguments as background metadata keys.
--   With NO arguments (all 969 existing attachments) its behavior is byte-for-byte what it
--   was: updated_at := now() unless a declared relabel, version + 1 on every UPDATE.
--   With arguments, an UPDATE whose only visible change is to those metadata keys (or to
--   updated_at/updated_by/version) carries the version forward — exactly _touch_rulebook.
-- The rulebook's trigger is re-created on the canonical function with the one declared key:
--     platform._touch_row('coherence')
-- Mirrored by BACKGROUND_METADATA_KEYS in aidream/services/distillation/rulebook_writes.py;
-- the guard test there parses this file's trigger line.
set lock_timeout = '2s';

create or replace function platform._touch_row()
 returns trigger
 language plpgsql
as $function$
DECLARE
    shape jsonb := to_jsonb(NEW);
    background_keys text[];
BEGIN
    -- DD-184: NEVER `NEW := jsonb_populate_record(NEW, ...)` here.  That rebuilds the
    -- row from a TupleDesc cached at the first firing in this transaction, so a column
    -- added in between is silently written back as NULL.  Direct field assignment is
    -- resolved against the tuple itself, every time.
    --
    -- A declared relabel (a migration that only renames attribution/vocabulary values,
    -- set transaction-locally via `app.relabel_keeps_updated_at = 'on'`) is not
    -- activity: it keeps updated_at. version still bumps below.
    IF shape ? 'updated_at'
       AND coalesce(current_setting('app.relabel_keeps_updated_at', true), '') <> 'on' THEN
        NEW.updated_at := now();
    END IF;
    IF TG_OP = 'UPDATE' AND shape ? 'version' THEN
        -- A record field reference inside a branch that is not taken is never resolved,
        -- so this stays inert on the row types that carry no `version` (the reason
        -- ai_050 reached for jsonb_populate_record in the first place).
        IF TG_NARGS > 0 THEN
            -- THE DECLARED BACKGROUND KEYS (trigger arguments): metadata keys a machine
            -- writes ABOUT the row, never a new version of the person's work. A write that
            -- moves nothing else carries the version forward, so it cannot age out a save
            -- someone is in the middle of (wall W12, platform.rulebook 'coherence').
            background_keys := TG_ARGV::text[];
            IF (to_jsonb(NEW) - 'metadata' - 'updated_at' - 'updated_by' - 'version')
                 = (to_jsonb(OLD) - 'metadata' - 'updated_at' - 'updated_by' - 'version')
               AND (COALESCE(to_jsonb(NEW) -> 'metadata', '{}'::jsonb) - background_keys)
                 = (COALESCE(to_jsonb(OLD) -> 'metadata', '{}'::jsonb) - background_keys) THEN
                NEW.version := COALESCE((to_jsonb(OLD) ->> 'version')::integer, 0);
                RETURN NEW;
            END IF;
        END IF;
        NEW.version := COALESCE((to_jsonb(OLD) ->> 'version')::integer, 0) + 1;
    END IF;
    RETURN NEW;
END
$function$;

drop trigger if exists _touch_row on platform.rulebook;
create trigger _touch_row before insert or update on platform.rulebook
  for each row execute function platform._touch_row('coherence');
drop function if exists platform._touch_rulebook();

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'platform.rulebook'::regclass
                  and tgname = '_touch_row' and tgfoid = 'platform._touch_row()'::regprocedure and tgnargs = 1) then
    raise exception 'rulebook _touch_row not on the canonical function';
  end if;
end $$;
