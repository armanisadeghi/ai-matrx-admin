-- Guard: a Person column changed to Text (custom.migrate_retype) and undone is a Person column again with its relation_target.
-- RED before personundo_c: migrate_undo refused "the relation field ... has to say what it points at" (FLD-13).
-- Run: node scripts/airtable-walk/pu-probe4.mjs (committed data on a fresh column; prints the shape after the undo).
select 1;
