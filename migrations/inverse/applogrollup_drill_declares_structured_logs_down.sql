-- chair-step: the inverse of migrations/campaign/applogrollup_drill_declares_structured_logs.sql (lane APPLOG-ROLLUP) — drops the declared drill definition function(s) it created. No row of anybody's data is touched.
-- lane: APPLOG-ROLLUP
-- lock: platform

drop function if exists platform.drill_def__structured_logs();
