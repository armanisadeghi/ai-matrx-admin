-- chair-step: puts cron job 42 back to its definition before AT-FIX-G2 (both ticks in one transaction, instant half first). That is the version that lost the hourly summaries when the instant half timed out.
select cron.alter_job(42, command := $job$select custom.agg_subscription_tick('15 minutes'::interval); select custom.agg_digest_tick();$job$);
