-- chat.lane(chat.conversation) is a one-line wrapper over chat.conversation_lane read per row (as a
-- computed field, c.lane). Same class as 20261016211000_list_rpc_helpers_inline: its SET clause stopped
-- it inlining and protected nothing (it reads no table). Now both it and the classifier it wraps inline.
alter function chat.lane(chat.conversation) reset search_path;
