-- A text row in a person's Activity opens the chat conversation behind its thread (the one record that exists)
-- based-on: admin._user_activity_sms(uuid, timestamp with time zone, integer) 294ec791eccba8e397510122401da3747cbed7d76fe03934a71cd28f398680a9
-- A thread with no chat conversation keeps no door (no page exists for a bare thread).
create or replace function admin._user_activity_sms(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select distinct on (u.at, u.id) u.at, u.id, u.item from (
      (select m.created_at as at, m.id,
              admin._user_activity_item(m.created_at, 'sms', m.id::text,
                case when m.direction = 'inbound' then 'Text received' else 'Text sent' end,
                m.status,
                m.sent_by_user_id,
                case when c.chat_conversation_id is not null
                     then jsonb_build_object('type', 'conversation', 'id', c.chat_conversation_id)
                     else jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id) end) as item
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
                case when c.chat_conversation_id is not null
                     then jsonb_build_object('type', 'conversation', 'id', c.chat_conversation_id)
                     else jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id) end)
         from communication.sms_messages m
         left join communication.sms_conversations c on c.id = m.conversation_id
        where m.sent_by_user_id = p_user and m.created_at <= p_before and m.deleted_at is null
        order by m.created_at desc
        limit p_limit)
    ) u
    order by u.at desc, u.id
    limit p_limit
  ) s
$function$;
