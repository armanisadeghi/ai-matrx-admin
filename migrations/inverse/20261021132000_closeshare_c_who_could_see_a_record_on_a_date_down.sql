-- chair-step: inverse of 20261021132000_closeshare_c_who_could_see_a_record_on_a_date — drops the door custom.who_could_see_on(uuid, timestamptz) and its door row. history.who_could_see is untouched.
-- lane: close-share
-- lock: custom

delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'who_could_see_on';
drop function if exists custom.who_could_see_on(uuid, timestamptz);
