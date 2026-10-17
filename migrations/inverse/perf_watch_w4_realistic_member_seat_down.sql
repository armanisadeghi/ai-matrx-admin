-- chair-step: inverse of perf_watch_w4_realistic_member_seat.sql — soft-deletes the twelve @stress twins, re-activates views@member@large and re-pins every changed @member twin to test@test.com (marker samples stay as history).
update ops.proof_check set deleted_at = now(), is_active = false where slug like 'door:%@stress%' and deleted_at is null;
update ops.proof_check set is_active = true where slug = 'door:custom.views@member@large';
do $w4d$
declare p record;
begin
  for p in select * from ops.proof_check
            where deleted_at is null and (perf_subject->>'seat_email' like 'bradley.gillespie%' or slug = 'door:custom.views@member@large') loop
    perform ops.perf_watch_declare(p.slug, 'door', p.label, p.perf_subject || '{"seat_email":"test@test.com"}'::jsonb,
              p.budget_ms, p.budget_stat, p.live_every_seconds, p.owner, p.source_feature);
  end loop;
end
$w4d$;
