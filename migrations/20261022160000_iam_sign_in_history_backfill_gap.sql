-- 20261022160000_iam_sign_in_history_backfill_gap.sql (admin user page nits, 2026-10-21).
--
-- Sessions created between the seed (20261022150000 section 3) and the trigger attach (20261022150200)
-- were never recorded. Re-runs the seed's idempotent insert (same SELECT, same "no event for this
-- session" guard) so each of those sign-ins gets its row once; running it again adds nothing.
insert into iam.sign_in_event
  (organization_id, person_id, session_id, signed_in_at, method, provider, aal, ip, user_agent, factor_id, oauth_client_id, metadata)
select (select so.organization_id from iam.system_orgs so where so.key = 'system'),
       s.user_id, s.id, s.created_at, m.authentication_method,
       case when m.authentication_method in ('oauth', 'sso/saml') then (
         select i.provider from auth.identities i where i.user_id = s.user_id
          order by i.last_sign_in_at desc nulls last limit 1) end,
       s.aal::text, s.ip, left(s.user_agent, 1000), s.factor_id, s.oauth_client_id,
       jsonb_build_object('seeded_from', 'live_session')
  from auth.sessions s
  join iam.users u on u.id = s.user_id
  left join lateral (
    select a.authentication_method from auth.mfa_amr_claims a
     where a.session_id = s.id order by a.created_at limit 1) m on true
 where s.created_at is not null
   and not exists (select 1 from iam.sign_in_event e where e.session_id = s.id);
