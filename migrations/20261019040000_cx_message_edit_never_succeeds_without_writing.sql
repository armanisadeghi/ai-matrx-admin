-- based-on: public.cx_message_edit(uuid, jsonb) abfd6ff315e2e6e931ae44d9c77902351ec9bb51f4a702b09701bcd1de660c4e
-- DEFECT-59 (2026-10-19, real test Q-04): cx_message_edit never succeeds without writing.
--
-- cx_message_edit runs as the caller (SECURITY INVOKER). When the row is readable but its UPDATE matches
-- nothing (chat.message `std_update` refuses it; a trigger skips it), `UPDATE … RETURNING * INTO v_row`
-- leaves v_row all-null and the function RETURNED that row with no error. Every caller then took it
-- as saved — the chat edit thunk showed "Answer saved" while the stored row never changed.
-- Now the no-match UPDATE raises, naming why:
--   * the row is gone (deleted between the read and the write) → P0002 message_not_found_or_not_editable
--     (the same refusal the function already gives a row it cannot read);
--   * the row is still there, so the caller's access does not allow changing it → 42501 message_not_editable.
-- There is no version argument, so "the version moved" cannot happen inside this function; the chat
-- client refuses a stale edit itself before calling it (saveAnswerEdit re-reads the stored row).
-- The body is otherwise byte-identical to live; CREATE OR REPLACE keeps owner and grants.
-- Guard: aidream tests/test_a_message_edit_that_writes_nothing_raises_live.py (red before, green after).

CREATE OR REPLACE FUNCTION public.cx_message_edit(p_message_id uuid, p_new_content jsonb)
 RETURNS chat.message
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_caller  uuid := auth.uid();
    v_row     chat.message;
    v_now     timestamptz := now();
    v_history jsonb;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'no_session' USING ERRCODE = '28000';
    END IF;

    SELECT m.*
      INTO v_row
      FROM chat.message AS m
     WHERE m.id = p_message_id;

    IF NOT FOUND THEN
        perform platform.refuse_not_found('message_not_found_or_not_editable');
    END IF;

    v_history := COALESCE(v_row.content_history, '[]'::jsonb)
              || jsonb_build_array(jsonb_build_object(
                     'content', v_row.content,
                     'saved_at', v_now
                 ));

    UPDATE chat.message
       SET content = p_new_content,
           user_content = CASE
             WHEN v_row.role = 'user' THEN p_new_content
             ELSE v_row.user_content
           END,
           content_history = v_history,
           status = 'edited'
     WHERE id = p_message_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        -- The UPDATE matched nothing: never return the all-null row as if it were saved.
        PERFORM 1 FROM chat.message AS m WHERE m.id = p_message_id;
        IF NOT FOUND THEN
            perform platform.refuse_not_found('message_not_found_or_not_editable');
        END IF;
        RAISE EXCEPTION 'message_not_editable: you can read this message but your access does not let you change it, so nothing was saved'
          USING ERRCODE = '42501',
                HINT    = 'Ask for edit access to the conversation, or fork it and edit your copy.';
    END IF;

    RETURN v_row;
END;
$function$;
