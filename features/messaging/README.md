# Messaging System

Real-time user-to-user messaging system for AI Matrx.

## Features

- **Real-time messaging** - Instant message delivery using Supabase Realtime
- **Dual subscription** - Broadcast for immediate delivery + Postgres changes for reliability
- **Typing indicators** - See when others are typing (3-second timeout)
- **Online presence** - Track who's online in a conversation
- **Message deduplication** - Prevents duplicate messages via `client_message_id`
- **Optimistic updates** - Messages appear instantly while sending
- **Resizable side sheet** - Quick access from anywhere in the app
- **Full-page view** - Dedicated `/messages` route for focused messaging

## Architecture

```
features/messaging/
├── index.ts                      # Barrel exports
├── types.ts                      # TypeScript types
├── README.md                     # This file
├── redux/
│   └── messagingSlice.ts         # Redux state (sheet, conversations, unread)
└── components/
    ├── MessagingSideSheet.tsx    # Global side sheet
    ├── MessagingInitializer.tsx  # Data loader
    ├── ConversationList.tsx      # List of conversations
    ├── ChatThread.tsx            # Messages view
    ├── MessageBubble.tsx         # Single message
    ├── MessageInput.tsx          # Text input with typing detection
    ├── TypingIndicator.tsx       # Animated typing dots
    ├── OnlineIndicator.tsx       # Green online dot
    ├── MessageIcon.tsx           # Header icon with badge
    └── NewConversationDialog.tsx # Start new conversation
```

## Database Schema

Run the migration at `supabase/migrations/20260130200000_messaging.sql`:

### Tables

- **conversations** - Chat containers (direct or group)
- **conversation_participants** - Links users to conversations
- **messages** - All chat messages

### Key Columns

- `matrix_id` - References `users.matrix_id` (AI Matrx specific)
- `client_message_id` - For deduplication and optimistic updates
- `status` - sending → sent → delivered → read

## Usage

### Side Sheet (Quick Access)

The messaging side sheet is globally available. Users can:
1. Click the MessageIcon in the header
2. Select a conversation or start a new one
3. Chat while staying on their current page

### Full Page (/messages)

For focused messaging:
- Desktop: Split view with conversation list + chat thread
- Mobile: Full-screen chat experience

### Starting a Conversation

```typescript
import { useConversations } from '@/hooks/useSupabaseMessaging';

const { createConversation } = useConversations(userId);

// Creates new conversation or returns existing one
const conversationId = await createConversation(otherUserId);
```

### Sending Messages

```typescript
import { useChat } from '@/hooks/useSupabaseMessaging';

const { sendMessage, messages, typingUsers } = useChat(
  conversationId,
  userId,
  displayName
);

await sendMessage('Hello!');
```

### Redux Actions

```typescript
import { 
  openMessaging, 
  closeMessaging,
  setCurrentConversation 
} from '@/features/messaging';

// Open side sheet
dispatch(openMessaging());

// Open to specific conversation
dispatch(openMessaging(conversationId));

// Close
dispatch(closeMessaging());
```

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/messages/conversations` | GET, POST | List/create conversations |
| `/api/messages/conversations/[id]` | GET, PUT, DELETE | Single conversation |
| `/api/messages/[conversationId]/messages` | GET, POST | List/send messages |
| `/api/messages/[conversationId]/messages/[id]` | PATCH, DELETE | Edit/delete message |

## Real-Time Architecture

### Dual Subscription Strategy

1. **Broadcast** - Sender pushes to channel immediately after DB insert
   - Fast (bypasses Postgres replication lag)
   - May be missed if recipient just connected

2. **Postgres Changes** - Database triggers fire INSERT/UPDATE events
   - Reliable (always delivers if RLS allows)
   - Slightly slower due to replication

### Deduplication

Messages can arrive via multiple paths. Always check both `id` and `client_message_id`:

```typescript
const exists = prev.some(m => 
  m.id === newMessage.id || 
  (m.client_message_id && m.client_message_id === newMessage.client_message_id)
);
```

### Channel Cleanup

Always clean up channels on unmount to prevent memory leaks:

```typescript
const unsubscribe = messagingService.subscribeToMessages(convId, onMessage);
return () => unsubscribe();
```

## Key Implementation Details

### MessagingService (Singleton)

Located at `lib/supabase/messaging.ts`:
- Manages channel subscriptions
- Prevents duplicate handlers
- Handles typing via Presence API
- Provides cleanup methods

### RLS Policies

The migration includes `is_conversation_participant()` SECURITY DEFINER function to prevent RLS infinite recursion.

### User Mapping

AI Matrx uses `matrix_id` (not Supabase `auth.uid()`). The `get_user_matrix_id()` function maps between them.

## Post-Migration Steps

1. Run the migration in Supabase Dashboard
2. Regenerate types: `pnpm supabase gen types typescript --local > types/database.types.ts`
3. Restart the dev server

## Future Enhancements

- [ ] Message reactions (emoji)
- [ ] Read receipts (per-message)
- [ ] Group chats (schema ready)
- [ ] File/media attachments
- [ ] Message search
- [ ] Push notifications
