-- scripts/campaign-tests/dashshare_red.sql — LANE DASH-SHARE-COUNT. RED twin: applies the INVERSE inside the transaction, then the same clauses must FAIL.
\set ON_ERROR_STOP on
\set suite 'dashshare_red.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local dashshare.red = 'on';
select set_config('statement_timeout','20s',true);
\i migrations/inverse/20261022193500_dashshare_a_a_share_lists_the_record_and_opens_the_door_down.sql
select set_config('statement_timeout','20s',true);
\i scripts/campaign-tests/_dashshare_body.sql
rollback;
