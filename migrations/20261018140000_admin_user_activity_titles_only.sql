-- based-on: admin._user_activity_feedback(uuid, timestamp with time zone, integer) 4a27bec7796296659580f4f9e8b8184b0143cc19607f3e8b8ba662d75c08b7ea
-- based-on: admin._user_activity_sms(uuid, timestamp with time zone, integer) 990a39bc583174c4132ecc8fcac5567812abfde3633df512814b504aed0d48e8
-- based-on: admin._user_activity_error(uuid, timestamp with time zone, integer) eb694582b8b953f2a2218d165f05a8e54bd4fb14576099fa70049af9b67a5773
-- admin.user_activity: titles only, never content bodies (owner ruling, Arman 2026-10-18). The
-- timeline shows what happened, not what was said: feedback rows carry type · status instead of the
-- description, texts carry delivery status instead of the message body, errors carry the route
-- instead of the log message. Every other branch already showed a title or a status.

create or replace function admin._user_activity_feedback(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select f.created_at as at,
           admin._user_activity_item(f.created_at, 'feedback', f.id::text,
             'Feedback filed',
             replace(coalesce(f.feedback_type, 'feedback'), '_', ' ') || ' · ' || coalesce(f.status, 'new'),
             f.user_id,
             jsonb_build_object('type', 'feedback', 'id', f.id)) as item
      from users.user_feedback f
     where f.user_id = p_user and f.deleted_at is null and f.created_at <= p_before
     order by f.created_at desc
     limit p_limit
  ) s
$$;

create or replace function admin._user_activity_sms(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select distinct on (u.at, u.id) u.at, u.id, u.item from (
      (select m.created_at as at, m.id,
              admin._user_activity_item(m.created_at, 'sms', m.id::text,
                case when m.direction = 'inbound' then 'Text received' else 'Text sent' end,
                m.status,
                m.sent_by_user_id,
                jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id)) as item
         from communication.sms_conversations c
         join communication.sms_messages m on m.conversation_id = c.id
        where c.user_id = p_user and m.created_at <= p_before and m.deleted_at is null
        order by m.created_at desc
        limit p_limit)
      union all
      (select m.created_at, m.id,
              admin._user_activity_item(m.created_at, 'sms', m.id::text,
                'Text sent',
                m.status,
                m.sent_by_user_id,
                jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id))
         from communication.sms_messages m
        where m.sent_by_user_id = p_user and m.created_at <= p_before and m.deleted_at is null
        order by m.created_at desc
        limit p_limit)
    ) u
    order by u.at desc, u.id
    limit p_limit
  ) s
$$;

create or replace function admin._user_activity_error(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.ts as at,
           admin._user_activity_item(l.ts, 'error', l.id::text,
             coalesce(nullif(l.exc_type, ''), 'Error') || coalesce(' · ' || nullif(l.feature, ''), ''),
             l.route,
             l.user_id,
             case when l.conversation_id is not null
                  then jsonb_build_object('type', 'conversation', 'id', l.conversation_id)
                  else jsonb_build_object('type', 'app_log', 'id', l.id) end) as item
      from ops.app_log l
     where l.user_id = p_user and l.level_no >= 40 and l.ts <= p_before
     order by l.ts desc
     limit p_limit
  ) s
$$;
