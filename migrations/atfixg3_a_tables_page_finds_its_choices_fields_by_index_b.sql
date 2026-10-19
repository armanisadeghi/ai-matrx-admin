-- lane: AT-FIX-G3
-- Adds a second index on custom.record (nothing dropped). The first one (atfixg3_a_tables_page_finds_its_choices_fields_by_index.sql, partial on "is not null") was never chosen by the planner: the same 28 ms scan of every Field record of the organization with it present. This one has no "is not null" predicate. Inverse: migrations/inverse/atfixg3_a_tables_page_finds_its_choices_fields_by_index_b_down.sql
create index if not exists record_options_table_id_all_idx
  on custom.record (organization_id, ((data -> 'config' ->> 'options_table_id')))
  where deleted_at is null;
