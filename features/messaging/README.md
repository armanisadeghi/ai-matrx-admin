# Direct Messaging System

Real-time user-to-user messaging for AI Matrx using Supabase Realtime.

## Features

- **Direct Messages**: One-on-one conversations between users
- **Group Messages**: Multi-user conversations (future)
- **Real-time Updates**: Instant message delivery via broadcast + postgres_changes
- **Typing Indicators**: Live "user is typing" status
- **Online Presence**: Track who's currently viewing a conversation
- **Unread Counts**: Badge showing unread message count
- **Message Status**: Sending, sent, delivered, read, failed states
- **Optimistic Updates**: Messages appear instantly before server confirmation
- **Adjustable Side Sheet**: Resizable panel (like Canvas)
- **Full Page View**: Dedicated `/messages` route

## Architecture

### Database Schema

All tables use `dm_` prefix to avoid conflicts. User references use `auth.users(id)` UUID.

```
dm_conversations
├── id (UUID, PK)
├── type (dm_conversation_type: 'direct' | 'group')
├── group_name (TEXT)
├── group_image_url (TEXT)
├── created_by (UUID → auth.users)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

dm_conversation_participants
├── id (UUID, PK)
├── conversation_id (UUID → dm_conversations)
├── user_id (UUID → auth.users)
├── role (dm_participant_role: 'owner' | 'admin' | 'member')
├── joined_at (TIMESTAMPTZ)
├── last_read_at (TIMESTAMPTZ)
├── is_muted (BOOLEAN)
└── is_archived (BOOLEAN)

dm_messages
├── id (UUID, PK)
├── conversation_id (UUID → dm_conversations)
├── sender_id (UUID → auth.users)
├── content (TEXT)
├── message_type (dm_message_type)
├── media_url, media_thumbnail_url, media_metadata
├── status (dm_message_status)
├── reply_to_id (UUID → dm_messages)
├── deleted_at (TIMESTAMPTZ)
├── deleted_for_everyone (BOOLEAN)
├── created_at, edited_at (TIMESTAMPTZ)
└── client_message_id (TEXT, for deduplication)
```

### Key SQL Functions

- `is_dm_participant(user_id, conversation_id)` - Check participation
- `get_dm_unread_count(user_id, conversation_id)` - Get unread count
- `get_dm_user_info(user_id)` - Get user info from auth.users
- `get_dm_conversations_with_details(user_id)` - List conversations with metadata
- `find_dm_direct_conversation(user1_id, user2_id)` - Find existing direct chat

### Real-time Architecture

```
┌─────────────────┐
│  React Component │
│  (ChatThread)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   useChat Hook   │  ← Combines: useMessages, useTypingIndicator, useOnlinePresence
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MessagingService │  ← Singleton managing all channels
│   (lib/supabase) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌─────────────────┐
│Broadcast│ │postgres_changes │
│(fast)   │ │(reliable)       │
└───────┘ └─────────────────┘
```

**Dual Subscription Pattern:**
1. **Broadcast** - Immediate delivery when sender broadcasts
2. **postgres_changes** - Reliable fallback via database INSERT trigger

**Deduplication:** Uses `client_message_id` to prevent duplicates when both channels deliver the same message.

## Usage

### 1. Database Setup

Run the migration in Supabase SQL Editor:
```sql
-- See: supabase/migrations/20260130200000_messaging.sql
```

### 2. Import Components

```tsx
import {
  MessagingSideSheet,
  MessagingInitializer,
  MessageIcon,
} from '@/features/messaging';
```

### 3. Global Setup (Already Integrated)

The authenticated layout includes:
- `<MessagingInitializer />` - Loads conversations on mount
- `<MessagingSideSheet />` - Side panel UI

The header includes:
- `<MessageIcon />` - Toggle button with unread badge

### 4. Use Hooks Directly

```tsx
import { useChat, useConversations } from '@/hooks/useSupabaseMessaging';

// In your component
const userId = user?.id; // auth.users.id UUID
const displayName = user?.userMetadata?.fullName || 'User';

const {
  messages,
  sendMessage,
  typingUsers,
  setTyping,
  onlineUsers,
} = useChat(conversationId, userId, displayName);

const {
  conversations,
  createConversation,
  refreshConversations,
} = useConversations(userId);
```

### 5. Redux State

```tsx
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  openMessaging,
  selectTotalUnreadCount,
} from '@/features/messaging';

// Open to a specific conversation
dispatch(openMessaging(conversationId));

// Get unread count
const unreadCount = useAppSelector(selectTotalUnreadCount);
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/messages/conversations` | List user's conversations |
| POST | `/api/messages/conversations` | Create conversation (or return existing) |
| GET | `/api/messages/conversations/[id]` | Get conversation details |
| PUT | `/api/messages/conversations/[id]` | Update settings (mute, archive) |
| DELETE | `/api/messages/conversations/[id]` | Leave/delete conversation |
| GET | `/api/messages/[conversationId]/messages` | List messages (paginated) |
| POST | `/api/messages/[conversationId]/messages` | Send message |
| GET | `/api/messages/[conversationId]/messages/[id]` | Get single message |
| PATCH | `/api/messages/[conversationId]/messages/[id]` | Edit/delete message |
| DELETE | `/api/messages/[conversationId]/messages/[id]` | Soft delete message |

## File Structure

```
features/messaging/
├── index.ts                    # Barrel exports
├── types.ts                    # TypeScript types
├── README.md                   # This file
├── redux/
│   └── messagingSlice.ts       # Redux state
└── components/
    ├── MessagingSideSheet.tsx  # Main side panel
    ├── MessagingInitializer.tsx # Data loader
    ├── ConversationList.tsx    # Conversation list
    ├── ChatThread.tsx          # Message thread
    ├── MessageBubble.tsx       # Single message
    ├── MessageInput.tsx        # Input field
    ├── TypingIndicator.tsx     # "X is typing..."
    ├── OnlineIndicator.tsx     # Green/gray dot
    ├── NewConversationDialog.tsx # User search
    └── MessageIcon.tsx         # Header icon

lib/supabase/messaging.ts       # MessagingService singleton
hooks/useSupabaseMessaging.ts   # React hooks

app/api/messages/               # API routes
app/(authenticated)/messages/   # Page routes
```

## Key Patterns

### Singleton MessagingService

One instance manages all Supabase channels. Prevents duplicate subscriptions.

```tsx
const service = getMessagingService();
service.subscribeToMessages(convId, onMessage);
// cleanup
service.removeChannel(convId);
```

### Optimistic Updates

Messages appear immediately with `status: 'sending'`, then update on confirmation:

```tsx
// 1. Add optimistic message
setMessages(prev => [...prev, optimisticMessage]);

// 2. Send to server
await messagingService.sendMessage(...);

// 3. Real-time updates replace optimistic with confirmed
```

### Typing Indicator with Auto-timeout

```tsx
const handleTyping = () => {
  setTyping(true);
  // Auto-stops after 3 seconds of no input
};
```

### Presence Tracking

Uses Supabase Presence API to track who's currently viewing a conversation.

## Security

- **RLS Policies**: All operations require user to be conversation participant
- **SECURITY DEFINER functions**: Prevent RLS recursion issues
- **Soft Delete**: Messages are marked deleted, not removed
- **UUID References**: Uses `auth.users(id)` for all user references
