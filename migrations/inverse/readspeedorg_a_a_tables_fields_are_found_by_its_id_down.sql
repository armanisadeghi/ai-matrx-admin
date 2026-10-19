-- chair-step: the inverse of migrations/campaign/readspeedorg_a_a_tables_fields_are_found_by_its_id.sql (lane READ-SPEED-ORG) — drops the 16 partial field-kernel uuid indexes it added, concurrently. Nothing of anybody's data is touched.
-- lock: custom
-- AUTOCOMMIT FILE: DROP INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_00;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_01;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_02;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_03;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_04;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_05;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_06;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_07;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_08;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_09;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_10;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_11;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_12;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_13;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_14;
drop index concurrently if exists custom.record_fieldkernel_def_uuid_rp_15;
