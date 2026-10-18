-- Teardown of a throwaway test person was blocked: mandate.binding.subject_user_id is a NO ACTION key to the
-- permanent person row, so the fixture sweeper (aidream fixture_sweep) tried to SET NULL it, and
-- mandate.guard_binding_containment (BEFORE trigger) refused "A user binding must name the subject it decides
-- for" before the binding_principal_chk check could make the sweeper delete the row instead. A user-principal
-- binding IS the person's own row (it decides only for them), so it dies with the fixture, exactly like the
-- former ON DELETE CASCADE keys that carry this comment. The guard is untouched: real writes still refuse a
-- user binding without a subject.
comment on constraint binding_subject_user_id_fkey on mandate.binding is
  'fixture teardown: delete (a user binding decides only for its subject; person row is permanent, so no cascade, and the containment guard refuses a null subject)';
