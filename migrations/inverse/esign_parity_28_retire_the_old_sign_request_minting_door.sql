-- chair-step: retires custom.sign_request_create, the minting door of the old /sign/<token> page (e-sign parity POLISH, owner 2026-10-10): drops one function, moves its door rows to the retirement ledger; no record is removed (4 sign_request records stay, untouched).
-- The page (app/(link)/sign/[token]), its route (app/api/sign/[token]) and features/esign/service.ts are deleted in the same push; esign.* (the v2 envelope flow) is what mints signing links now.
-- Nothing calls the function: checked in pg_proc (only its own body names it), pg_depend (no dependents, no triggers, no policies), and git grep in aidream, matrx-frontend, matrx-extend, matrx-local (TS callers: none).
insert into platform.client_callable_door_retirement
  (schema_name, function_name, identity_args, retirement_class, retired_reason, successor,
   was_reason, was_declared_by, retired_by)
select d.schema_name, d.function_name, d.identity_args, 'not_a_function',
       'E-sign parity: the old /sign/<token> page is deleted; the v2 envelope flow (esign.*) is the one signing path.',
       'esign.envelope_send(...)',
       d.reason, d.declared_by, 'esign_parity_28_retire_the_old_sign_request_minting_door'
  from platform.client_callable_door d
 where d.schema_name = 'custom' and d.function_name = 'sign_request_create';
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'sign_request_create';
delete from platform.door_argument_rule where schema_name = 'custom' and function_name = 'sign_request_create';
drop function custom.sign_request_create(uuid, uuid, text, text, text, interval);
