-- INVERSE of atprint_a_doc_render_body_is_callable_by_a_signed_in_person.sql: the function goes back to owner-only (print layouts refuse again).
revoke execute on function custom.doc_render_body(uuid, uuid, uuid) from authenticated;
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'doc_render_body'
  and declared_by = 'atprint_a_doc_render_body_is_callable_by_a_signed_in_person';
