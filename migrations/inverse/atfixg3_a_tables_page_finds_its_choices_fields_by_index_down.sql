-- chair-step: drops the options_table_id index on custom.record; table_placement goes back to scanning every Field per table (a member's table page times out again in a large organization).
drop index if exists custom.record_options_table_id_idx;
