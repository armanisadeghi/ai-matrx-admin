# Messaging System Architecture

## High-Level Overview

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        UI[Chat UI Components]
        Hooks[React Hooks]
        Service[MessagingService]
    end
    
    subgraph Realtime["Supabase Realtime"]
        Channel[Realtime Channel]
        Broadcast[Broadcast Events]
        Changes[Postgres Changes]
        Presence[Presence API]
    end
    
    subgraph API["API Layer"]
        ConvAPI["/api/conversations"]
        MsgAPI["/api/messages"]
    end
    
    subgraph Database["Supabase PostgreSQL"]
        Conv[conversations]
        Parts[conversation_participants]
        Msgs[messages]
        Reactions[message_reactions]
        Receipts[message_read_receipts]
    end
    
    UI --> Hooks
    Hooks --> Service
    Service --> Channel
    Channel --> Broadcast
    Channel --> Changes
    Channel --> Presence
    
    UI --> ConvAPI
    UI --> MsgAPI
    ConvAPI --> Conv
    ConvAPI --> Parts
    MsgAPI --> Msgs
    
    Changes -.-> Msgs
    Presence -.-> Parts
```

## Data Flow: Sending a Message

```mermaid
sequenceDiagram
    participant User
    participant UI as Chat UI
    participant Hook as useMessages
    participant Service as MessagingService
    participant API as /api/messages
    participant DB as Supabase DB
    participant RT as Realtime Channel
    participant Other as Other User
    
    User->>UI: Types message, clicks send
    UI->>Hook: sendMessage(content)
    
    Note over Hook: Generate client_message_id
    Hook->>Hook: Add optimistic message (status: sending)
    Hook->>Service: sendMessage(convId, userId, content, {clientMessageId})
    
    Service->>DB: INSERT into messages
    DB-->>Service: Return message with real ID
    
    Service->>RT: broadcast("new_message", message)
    
    Service-->>Hook: Return sent message
    Hook->>Hook: Update optimistic msg with real data
    
    RT-->>Other: Broadcast event received
    Other->>Other: Add message to state
    
    Note over DB,RT: Postgres Changes also fires
    RT-->>Hook: postgres_changes INSERT
    Hook->>Hook: Dedupe by client_message_id (ignored)
```

## Data Flow: Receiving a Message

```mermaid
sequenceDiagram
    participant Sender
    participant DB as Supabase DB
    participant RT as Realtime Channel
    participant Hook as useMessages
    participant UI as Chat UI
    
    Sender->>DB: INSERT message
    
    par Broadcast (immediate)
        DB-->>RT: Trigger postgres_changes
        RT-->>Hook: broadcast "new_message"
        Hook->>Hook: Check duplicates
        Hook->>UI: Update messages state
    and Postgres Changes (backup)
        RT-->>Hook: postgres_changes INSERT
        Hook->>Hook: Check duplicates (already exists)
        Note over Hook: Ignored if duplicate
    end
    
    UI->>UI: Render new message
    Hook->>DB: markConversationAsRead
```

## Database Schema

```mermaid
erDiagram
    users ||--o{ conversations : creates
    users ||--o{ conversation_participants : joins
    users ||--o{ messages : sends
    users ||--o{ message_reactions : adds
    users ||--o{ message_read_receipts : marks
    
    conversations ||--o{ conversation_participants : has
    conversations ||--o{ messages : contains
    
    messages ||--o{ message_reactions : has
    messages ||--o{ message_read_receipts : has
    messages ||--o| messages : "reply_to"
    
    conversations {
        uuid id PK
        text type "direct|group"
        text group_name
        text group_image_url
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    conversation_participants {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        text role "owner|admin|member"
        timestamptz joined_at
        timestamptz last_read_at
        boolean is_muted
        boolean is_archived
    }
    
    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        text message_type
        text media_url
        text status
        uuid reply_to_id FK
        timestamptz deleted_at
        timestamptz created_at
        timestamptz edited_at
        text client_message_id
    }
    
    message_reactions {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        text reaction
        timestamptz created_at
    }
    
    message_read_receipts {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        timestamptz read_at
    }
```

## Realtime Channel Architecture

```mermaid
flowchart LR
    subgraph ChannelName["Channel: conversation:{id}"]
        direction TB
        BC[Broadcast Events]
        PC[Postgres Changes]
        PR[Presence]
    end
    
    subgraph Events["Event Types"]
        direction TB
        NewMsg["new_message (broadcast)"]
        Insert["INSERT (postgres_changes)"]
        Update["UPDATE (postgres_changes)"]
        Typing["presence sync"]
    end
    
    subgraph Handlers["Client Handlers"]
        direction TB
        OnMsg["onMessage callback"]
        OnTyping["onTypingUpdate callback"]
    end
    
    BC --> NewMsg --> OnMsg
    PC --> Insert --> OnMsg
    PC --> Update --> OnMsg
    PR --> Typing --> OnTyping
```

## Component Architecture

```mermaid
flowchart TB
    subgraph Pages["Pages"]
        ChatList["/chats - ConversationList"]
        ChatView["/chats/[id] - ChatThread"]
    end
    
    subgraph Hooks["Hooks"]
        useChat["useChat()"]
        useMessages["useMessages()"]
        useTyping["useTypingIndicator()"]
        usePresence["useOnlinePresence()"]
    end
    
    subgraph Service["Service Layer"]
        MS["MessagingService (singleton)"]
    end
    
    subgraph Components["UI Components"]
        CT["ChatThread"]
        MB["MessageBubble"]
        MI["MessageInput"]
        CL["ConversationList"]
    end
    
    ChatList --> CL
    ChatView --> CT
    
    CT --> useChat
    CT --> usePresence
    MI --> useChat
    
    useChat --> useMessages
    useChat --> useTyping
    
    useMessages --> MS
    useTyping --> MS
    usePresence --> MS
    
    CT --> MB
    CT --> MI
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Loading: Mount component
    Loading --> Ready: Messages loaded
    Loading --> Error: Load failed
    
    Ready --> Sending: User sends message
    Sending --> Ready: Message sent
    Sending --> Failed: Send failed
    
    Ready --> Ready: Real-time message received
    Ready --> Ready: Typing indicator update
    Ready --> LoadingMore: Load older messages
    LoadingMore --> Ready: Messages loaded
    
    state Ready {
        [*] --> Idle
        Idle --> Typing: User starts typing
        Typing --> Idle: 3s timeout
    }
```

## Message Status Flow

```mermaid
stateDiagram-v2
    [*] --> sending: Optimistic add
    sending --> sent: API success
    sending --> failed: API error
    
    sent --> delivered: Recipient online
    delivered --> read: Recipient viewed
    
    failed --> sending: Retry
```

## Key Design Decisions

### 1. Dual Real-time Channels
- **Broadcast**: Immediate delivery, sender pushes to channel
- **Postgres Changes**: Backup delivery, database triggers push

Why both? Broadcast is faster but can be missed. Postgres changes are reliable but slower.

### 2. Client Message ID Deduplication
Every message gets a `client_message_id` before sending. This allows:
- Matching optimistic updates to real messages
- Preventing duplicates from multiple delivery channels
- Idempotent retries on network failure

### 3. Singleton MessagingService
One service instance manages all channels. Benefits:
- Channel reuse (same channel for messages + typing)
- Centralized cleanup
- Consistent state

### 4. SECURITY DEFINER Function
`is_conversation_participant()` bypasses RLS to check participation. Without this, RLS policies that check participation would cause infinite recursion.

### 5. Soft Deletes
Messages use `deleted_at` instead of hard delete. Allows:
- "Delete for me" (only sender sees deleted_at)
- "Delete for everyone" (content replaced, deleted_for_everyone = true)
- Audit trail
