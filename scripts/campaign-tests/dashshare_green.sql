-- scripts/campaign-tests/dashshare_green.sql — LANE DASH-SHARE-COUNT. GREEN: with migrations/campaign/20261022193500_dashshare_a_a_* applied, a share lists the record and opens the door.
\set ON_ERROR_STOP on
\set suite 'dashshare_green.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local dashshare.red = 'off';
select set_config('statement_timeout','20s',true);
\i scripts/campaign-tests/_dashshare_body.sql
rollback;
