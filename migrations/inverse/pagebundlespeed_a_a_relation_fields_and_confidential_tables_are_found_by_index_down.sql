-- chair-step: the inverse of migrations/campaign/pagebundlespeed_a_a_relation_fields_and_confidential_tables_are_found_by_index.sql (lane PAGE-BUNDLE-SPEED) — drops the 32 partial indexes it added, concurrently. Nothing of anybody's data is touched.
-- lock: custom
-- AUTOCOMMIT FILE: DROP INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_00;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_01;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_02;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_03;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_04;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_05;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_06;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_07;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_08;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_09;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_10;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_11;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_12;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_13;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_14;
drop index concurrently if exists custom.record_fieldkernel_reltarget_rp_15;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_00;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_01;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_02;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_03;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_04;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_05;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_06;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_07;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_08;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_09;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_10;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_11;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_12;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_13;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_14;
drop index concurrently if exists custom.record_tablekernel_confidential_rp_15;
