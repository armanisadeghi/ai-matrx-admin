# Messaging Starter Kit

Implement a complete real-time messaging system using Supabase Realtime in any Next.js + Supabase project.

## When to Use

- User asks to "add messaging" or "add chat" to a project
- User wants to implement real-time conversations
- User needs direct messaging between users
- User wants group chat functionality

## Prerequisites

The target project MUST have:
- Next.js 14+ with App Router
- Supabase (database + auth configured)
- An existing `users` table linked to `auth.users`
- TypeScript

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  useChat()  →  useMessages() + useTypingIndicator()             │
│      ↓                                                          │
│  MessagingService (singleton)                                   │
│      ↓                                                          │
│  Supabase Realtime Channels                                     │
│    - postgres_changes (INSERT/UPDATE on messages)               │
│    - broadcast (immediate message delivery)                     │
│    - presence (typing indicators, online status)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  /api/conversations     - List/create conversations             │
│  /api/conversations/[id] - Get/update/delete conversation       │
│  /api/conversations/[id]/participants - Manage members          │
│  /api/messages          - List/send messages                    │
│  /api/messages/[id]     - Get/edit/delete message               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  conversations          - Direct & group chats                  │
│  conversation_participants - Who's in each conversation         │
│  messages               - All messages with status tracking     │
│  message_reactions      - Emoji reactions (optional)            │
│  message_read_receipts  - Per-message read tracking (optional)  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Run Database Migration

Copy the migration from `templates/migration.sql` to the target project's `supabase/migrations/` folder.

**Before running**, review and customize:
1. **User table reference** - Migration assumes `users(id)` table. Adjust FK references if different.
2. **Blocks table** - If project has no blocking feature, remove block-related RLS policies.
3. **Optional tables** - Remove `message_reactions` and/or `message_read_receipts` if not needed.

Run migration:
```bash
pnpm supabase db push  # or your migration command
pnpm supabase gen types typescript --local > src/types/database.types.ts
```

### Step 2: Create Messaging Service

Create `src/lib/supabase/messaging.ts` based on the reference implementation.

**Key patterns to preserve:**
- Singleton pattern (`getMessagingService()`)
- Channel management with Map for reuse
- Dual subscription: `broadcast` + `postgres_changes`
- `client_message_id` for deduplication
- Proper cleanup with `removeChannel()`

**Reference (RealSingles):** `/home/arman/projects/real-singles/web/src/lib/supabase/messaging.ts` (744 lines)

### Step 3: Create React Hooks

Create `src/hooks/useSupabaseMessaging.ts` with:
- `useMessages()` - Message state, loading, pagination, send
- `useTypingIndicator()` - Track who's typing
- `useChat()` - Combined hook for convenience

Create `src/hooks/useOnlinePresence.ts` with:
- `useOnlinePresence()` - Track online users in conversation
- `useGlobalOnlineStatus()` - App-wide presence tracking

**Reference (RealSingles):**
- `/home/arman/projects/real-singles/web/src/hooks/useSupabaseMessaging.ts` (383 lines)
- `/home/arman/projects/real-singles/web/src/hooks/useOnlinePresence.ts` (183 lines)

### Step 4: Create API Routes

Create these API routes in `src/app/api/`:

| Route | Methods | Purpose |
|-------|---------|---------|
| `conversations/route.ts` | GET, POST | List conversations, create new |
| `conversations/[id]/route.ts` | GET, PUT, DELETE | Manage single conversation |
| `conversations/[id]/participants/route.ts` | POST, DELETE | Add/remove participants |
| `messages/route.ts` | GET, POST | List messages, send message |
| `messages/[id]/route.ts` | GET, PATCH, DELETE | Edit/delete message |

**See:** `templates/api-routes-overview.md` for full endpoint documentation.

**Reference (RealSingles):**
- `/home/arman/projects/real-singles/web/src/app/api/conversations/route.ts`
- `/home/arman/projects/real-singles/web/src/app/api/conversations/[id]/route.ts`
- `/home/arman/projects/real-singles/web/src/app/api/conversations/[id]/participants/route.ts`
- `/home/arman/projects/real-singles/web/src/app/api/messages/route.ts`
- `/home/arman/projects/real-singles/web/src/app/api/messages/[id]/route.ts`

### Step 5: Create UI Components (Optional)

The UI components are project-specific, but reference implementations exist:

| Component | Purpose | Reference (RealSingles) |
|-----------|---------|-------------------------|
| `ChatThread` | Main chat view | `/home/arman/projects/real-singles/web/src/components/chat/ChatThread.tsx` |
| `MessageBubble` | Message display | `/home/arman/projects/real-singles/web/src/components/chat/MessageBubble.tsx` |
| `MessageInput` | Compose/send | `/home/arman/projects/real-singles/web/src/components/chat/MessageInput.tsx` |
| `ConversationList` | Conversation list | `/home/arman/projects/real-singles/web/src/components/chat/ConversationList.tsx` |

## Customization Checklist

Before copying files, decide on these features:

| Feature | Default | Notes |
|---------|---------|-------|
| Media messages (images, video) | Yes | Remove `media_*` columns if not needed |
| Message reactions | Yes | Remove `message_reactions` table if not needed |
| Read receipts | Yes | Remove `message_read_receipts` table if not needed |
| Message editing | Yes | Remove `edited_at` column if not needed |
| Threaded replies | Yes | Remove `reply_to_id` column if not needed |
| Group chats | Yes | Set `type` CHECK to only allow 'direct' if not needed |
| Block checking | Yes | Remove block-related code if no blocking feature |
| Typing indicators | Yes | Remove presence code if not needed |

## Key Patterns

### Optimistic Updates
```typescript
// Generate client ID before sending
const clientMessageId = `${userId}_${Date.now()}_${randomString()}`;

// Add optimistic message immediately
setMessages(prev => [...prev, { ...optimisticMsg, status: "sending" }]);

// Send with same clientMessageId for matching
await messagingService.sendMessage(convId, userId, content, { clientMessageId });
```

### Real-time Deduplication
Messages can arrive via multiple channels (broadcast, postgres_changes, API response). Always check:
```typescript
const exists = prev.some(m => 
  m.id === newMessage.id || 
  (m.client_message_id && m.client_message_id === newMessage.client_message_id)
);
```

### Channel Management
Always clean up channels on unmount:
```typescript
useEffect(() => {
  const unsubscribe = messagingService.subscribeToMessages(convId, onMessage);
  return () => unsubscribe();
}, [convId]);
```

### RLS Recursion Prevention
The migration includes `is_conversation_participant()` SECURITY DEFINER function to prevent infinite recursion in RLS policies. This is critical - do not remove.

## Testing

After implementation:

1. **Create conversation** - POST to `/api/conversations`
2. **Send message** - POST to `/api/messages`
3. **Verify real-time** - Open two browser tabs, send message in one, verify instant delivery in other
4. **Test typing** - Verify typing indicator appears within 1s
5. **Test pagination** - Load 50+ messages, verify "load more" works
6. **Test edit/delete** - Edit a message, verify real-time update

## Common Issues

### Messages not appearing in real-time
- Check Supabase Realtime is enabled for `messages` table
- Verify RLS policies allow SELECT for participants
- Check browser console for subscription errors

### Duplicate messages
- Ensure `client_message_id` is being passed through
- Check deduplication logic in `useMessages`

### Typing indicator not working
- Verify presence channel is subscribed
- Check that typing timeout (3s) isn't clearing too fast

### RLS recursion error
- Ensure `is_conversation_participant()` function exists
- Check all policies use the function instead of direct subqueries

## Target File Structure

After implementing this skill, your project should have:

```
supabase/migrations/
└── XXXXXX_messaging.sql          # Database schema (from templates/migration.sql)

src/
├── lib/supabase/
│   └── messaging.ts              # MessagingService class
├── hooks/
│   ├── useSupabaseMessaging.ts   # React hooks (useMessages, useTypingIndicator, useChat)
│   └── useOnlinePresence.ts      # Presence hooks
├── app/api/
│   ├── conversations/
│   │   ├── route.ts              # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts          # GET, PUT, DELETE
│   │       └── participants/
│   │           └── route.ts      # POST, DELETE
│   └── messages/
│       ├── route.ts              # GET (list), POST (send)
│       └── [id]/
│           └── route.ts          # GET, PATCH, DELETE
└── components/chat/              # UI components (customize to your design)
    ├── ChatThread.tsx
    ├── MessageBubble.tsx
    ├── MessageInput.tsx
    └── ConversationList.tsx
```

## Reference Implementation

A complete working implementation exists in the RealSingles project at:
`/home/arman/projects/real-singles/`

Use those files as reference when implementing each component.
