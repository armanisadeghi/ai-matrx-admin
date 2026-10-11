-- chair-step: THE INVERSE of hr_door_spec_employment_is_an_hr_door_token.sql - restores hr._door_spec to the hr_rev_03 body (no hr_employment row). Run only when the command names it with --confirm-chair-step.
-- lane: HR-REVIEWS
-- based-on: hr._door_spec(text) 66ac12e2d01b9beeb013487115e45ab626e79ae718de360c46c7ed7f12a98bb0

CREATE OR REPLACE FUNCTION hr._door_spec(p_token text)
 RETURNS TABLE(tier text, caps text[], allows_break_glass boolean, no_door_reason text)
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  return query
  -- the projection is explicit: `select *` would return the lookup key as the first column and the
  -- declared result type would not match it
  select m.tier, m.caps, m.bg, m.reason from (values
    -- ---------- Confidential tier
    ('hr_employee_private',      'confidential', array['identity.read'],                              true,  null::text),
    ('hr_compensation',          'confidential', array['comp.read'],                                  true,  null),
    ('hr_emergency_contact',     'confidential', array['identity.read','working_record.read'],        true,  null),
    ('hr_separation',            'confidential', array['working_record.read'],                        true,  null),
    ('hr_corrective_action',     'confidential', array['working_record.read','corrective_action.issue'], true, null),
    ('hr_background_check',      'confidential', array['background_check.adjudicate','candidate.read','working_record.read'], true, null),
    ('hr_employer_profile',      'confidential', array['working_record.read'],                        true,  null),
    ('hr_tax_withholding',       'confidential', array['identity.read','payroll.export'],             true,  null),
    ('hr_i9',                    'confidential', array['identity.read'],                              true,  null),
    ('hr_offer',                 'confidential', array['candidate.read','requisition.manage'],        true,  null),
    ('hr_reference_check',       'confidential', array['candidate.read'],                             true,  null),
    ('hr_records_request',       'confidential', array['records.govern','identity.read'],             true,  null),
    ('hr_verification_letter_request','confidential', array['identity.read'],                         true,  null),
    ('hr_ai_evidence',           'confidential', array['audit.read','records.govern'],                true,  null),
    ('hr_legal_hold',            'confidential', array['records.govern'],                             true,  null),
    ('hr_scorecard',             'confidential', array['candidate.read'],                             false, null),
    -- hr_rev_03 (HR-REVIEWS, 2026-10-09): a workflow instance carries the subject's HR request and is
    -- class Confidential. Its auto:wf_step reader grants are written and revoked by the engine
    -- (hr._wf_grant_step / hr._wf_revoke_step) under hr.arm_write(); declaring it here puts those
    -- grants under HR's own audited-tier guard instead of the generic owner-only guard, which
    -- refused every step close decided by anyone but the instance's creator. No break-glass:
    -- instances are read through the workflow doors (hr.wf_instance / hr.wf_inbox).
    ('hr_workflow_instance',     'confidential', array['workflow.cancel'],                            false, null),
    -- ---------- Restricted tier
    ('hr_restricted_note',       'restricted',   array['__per_note_kind__'],                          true,  null),
    ('hr_incident',              'restricted',   array['incident.read'],                              false, null),
    ('hr_incident_party',        'restricted',   array['incident.read'],                              false, null),
    ('hr_accommodation_request', 'restricted',   array['medical.read'],                               false, null),
    ('hr_leave_case',            'restricted',   array['medical.read'],                               false, null),
    -- ---------- structurally doorless (RECORDED DECISIONS 3 and 4)
    ('hr_eeo_response',          'restricted',   null::text[],                                        false,
     'SPEC-ACCESS §4.4: no individual read function is ever written for EEO self-identification. The only reader is hr.eeo_aggregate, which suppresses any cell below hr.hiring.eeo_min_cell. The guarantee is the ABSENCE of code, which no configuration mistake can undo.'),
    ('hr_employment_pin',        'restricted',   null::text[],                                        false,
     'SPEC-ACCESS §3.2: never client-readable. A PIN hash has no read path; it is verified, never returned.'),
    ('hr_kiosk_device',          'restricted',   null::text[],                                        false,
     'SPEC-ACCESS §3.2: never client-readable. The device secret hash has no read path.'),
    ('hr_kiosk_session',         'restricted',   null::text[],                                        false,
     'SPEC-ACCESS §3.2: never client-readable.'),
    ('hr_access_audit',          'restricted',   null::text[],                                        false,
     'SPEC-ACCESS §4.7: read through hr_access_audit_query only, which applies the audit.read gate plus the subject''s own lane and audits itself once per query.')
  ) as m(token, tier, caps, bg, reason)
  where m.token = p_token;
end
$function$;
