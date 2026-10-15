-- Guard: run `npx tsx scripts/pu-proof.ts x <org> <person-column field id> <user id> noapply` on a fresh Person column.
-- GREEN = the "undone" line shows type relation, relation_target, relation_max and on_target_delete back, with no format or rules.
-- RED (before personundo_b) = ERROR "the relation field ... has to say what it points at". It runs the Email change and its
-- undo as the admin inside a transaction and ROLLS BACK. (scripts/airtable-walk/pu-probe3.mjs is the committed-data twin.)
select 1;
