-- lane: AT-FIX-G3
-- Records cron job 42 (custom-subscription-tick) as it is live since AT-FIX-G2 changed it with cron.alter_job and no commit: summaries first, each half in its own exception block. A NO-OP APPLY: it refuses unless the live command already equals the one below, then sets the same command. No new schedule, same name, same interval. Inverse: migrations/inverse/atfixg3_cron_42_records_its_live_definition_down.sql (back to the pre-G2 single transaction).
do $g3$
declare
  v_want constant text := $cmd$do $job$
begin
  -- The summaries first and each half alone: the instant half reads every record changed in 15 minutes and
  -- timed out at 30 s for hours (2026-10-19), and because it ran first in ONE transaction its failure
  -- also cancelled the summaries, so hourly summaries never went out. query_canceled is not caught by OTHERS.
  begin
    perform custom.agg_digest_tick();
  exception when query_canceled or others then
    raise warning 'custom-subscription-tick: agg_digest_tick failed: %', sqlerrm;
  end;
  begin
    perform custom.agg_subscription_tick('15 minutes'::interval);
  exception when query_canceled or others then
    raise warning 'custom-subscription-tick: agg_subscription_tick failed: %', sqlerrm;
  end;
end
$job$;$cmd$;
  v_live text;
begin
  select j.command into v_live from cron.job j where j.jobid = 42 and j.jobname = 'custom-subscription-tick';
  if v_live is null then
    raise exception 'cron job 42 custom-subscription-tick is not there; nothing to record';
  end if;
  if v_live is distinct from v_want then
    raise exception 'cron job 42 is not the definition this file records; refusing to overwrite it (live command differs)';
  end if;
  perform cron.alter_job(42, command := v_want);
end
$g3$;
