-- lane: canonicalization wave 2, lane A. Declaration only — no table, policy or access change.
-- legal.opinions.author_id is CourtListener's own author key (bigint, the judge who wrote the opinion;
-- written by matrx-legal ingest/api_sync.py and services/legal/bulk_service.py), a subject column, never
-- a platform owner. Declared the way canon lane 3 declared subject columns (canon_lane3_01 §3).
set lock_timeout = '2s';

insert into meta.audit_exemption (check_name, schema_name, table_name, reason, organization_id, metadata)
values ('legacy_owner_col', 'legal', 'opinions',
        'subject column: author_id is CourtListener''s author (judge) key for the opinion, not who made the row',
        '39c38960-d30c-4840-b0c1-c9960de95582',
        '{"ruling":"Arman 2026-10-06: keep user_id where it names who the row is about","columns":["author_id"]}')
on conflict (check_name, schema_name, table_name) do nothing;
