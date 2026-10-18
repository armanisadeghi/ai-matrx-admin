-- lane: APPLOG-ROLLUP
-- lock: platform
-- Written by aidream apps/shared/records/scripts/drill-sync.ts from: aidream/apps/shared/records/scripts/drill-definitions/structured_logs.drill.ts
-- Declared drill definitions, one function each (platform.drill_def__<key>()). Code, not data.

create or replace function platform.drill_def__structured_logs()
returns jsonb
language sql
immutable
set search_path to 'pg_catalog'
as $function$
  select $drill${"key":"structured_logs","label":"Structured logs","grain":"one row per hour for each level, feature, route, logger, exception kind, host role, classified, person and request","fact":"app_log_hourly","mode":"definer","lanes":["platform","mine"],"lane_rules":{"platform":{"rule":"super_admin"},"mine":{"column":"user_id"}},"dimensions":[{"key":"level","label":"Level","from":"level","kind":"choice","cardinality":"low","choices":[{"value":"DEBUG","label":"Debug"},{"value":"INFO","label":"Info"},{"value":"WARNING","label":"Warning"},{"value":"ERROR","label":"Error"},{"value":"CRITICAL","label":"Critical"}],"level":{"breakouts":["feature","route","logger_name","exc_type","created_at:hour"],"show":["count","requests","people"]}},{"key":"feature","label":"Feature","from":"feature","kind":"text","cardinality":"medium","empty_label":"No feature stamped","level":{"breakouts":["level","route","exc_type","logger_name","created_at:hour"],"show":["count","requests","people"]}},{"key":"route","label":"Route","from":"route","kind":"text","cardinality":"medium","empty_label":"No route","level":{"breakouts":["level","feature","exc_type","created_at:hour"],"show":["count","requests","people"]}},{"key":"logger_name","label":"Logger","from":"logger_name","kind":"text","cardinality":"medium","level":{"breakouts":["level","feature","route","created_at:hour"],"show":["count","requests","people"]}},{"key":"exc_type","label":"Exception kind","from":"exc_type","kind":"text","cardinality":"medium","empty_label":"No exception","level":{"breakouts":["feature","route","level","created_at:hour"],"show":["count","requests","people"]}},{"key":"host_role","label":"Host role","from":"host_role","kind":"text","cardinality":"low","empty_label":"Not stamped"},{"key":"classified","label":"Classified","from":"classified","kind":"boolean"},{"key":"created_at","label":"When","from":"created_at","kind":"time","grains":["year","quarter","month","week","day","hour"]}],"measures":[{"key":"count","label":"Log lines","op":"sum","of":"lines","unit":"count","additive":true},{"key":"requests","label":"Requests","op":"count_distinct","of":"request_id","unit":"count","additive":false},{"key":"people","label":"People","op":"count_distinct","of":"user_id","unit":"count","additive":false}],"paths":[{"key":"when","label":"When","levels":["created_at:day","created_at:hour"]}],"records":{"fact":"app_log_lines","columns":["created_at","level","feature","route","logger_name","message","exc_type","request_id","user_id","host_role","classified","id"],"labels":{"created_at":"When","logger_name":"Logger","exc_type":"Exception kind","request_id":"Request","user_id":"Person","host_role":"Host role","id":"Log line"}},"stale_after_knob":"drill.app_log.stale_after_minutes","default":{"by":["level"],"show":["count","requests"],"sort":{"key":"count","direction":"desc"}}}$drill$::jsonb;
$function$;

comment on function platform.drill_def__structured_logs() is
  'DRILL-STANDARD-DOOR: the declared drill definition "Structured logs" (structured_logs), compiled from its *.drill.ts file by aidream apps/shared/records/scripts/drill-sync.ts. Code, not data: never edited by hand.';

-- The summary-backed definition replaces the raw-table override keyed by the token app_log (lane APPLOG-ROLLUP).
drop function if exists platform.drill_def__app_log();
