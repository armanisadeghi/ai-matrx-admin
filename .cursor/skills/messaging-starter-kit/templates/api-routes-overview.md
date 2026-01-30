# Messaging API Routes

Complete API documentation for the messaging system.

## Authentication

All endpoints require authentication via Supabase Auth. The auth token should be passed via:
- Cookie (automatic with Supabase client)
- Authorization header: `Bearer <token>`

Unauthenticated requests return `401 Unauthorized`.

---

## Conversations

### GET /api/conversations

List all conversations for the current user.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Max results (capped at 50) |
| `offset` | number | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ConversationID": "uuid",
      "Type": "direct",
      "DisplayName": "John Doe",
      "DisplayImage": "https://...",
      "GroupName": null,
      "GroupImage": "",
      "CreatedAt": "2024-01-15T10:30:00Z",
      "UpdatedAt": "2024-01-15T12:45:00Z",
      "IsMuted": false,
      "LastReadAt": "2024-01-15T12:00:00Z",
      "Participants": [
        {
          "UserID": "uuid",
          "DisplayName": "John Doe",
          "FirstName": "John",
          "LastName": "Doe",
          "ProfileImage": "https://...",
          "LastActiveAt": "2024-01-15T12:40:00Z",
          "Role": "member"
        }
      ]
    }
  ],
  "total": 5,
  "msg": "Conversations fetched successfully"
}
```

---

### POST /api/conversations

Create a new conversation or return existing one (for direct chats).

**Request Body:**
```json
{
  "type": "direct",
  "participant_ids": ["user-uuid-1"],
  "group_name": "Optional Group Name"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | No | "direct" (default) or "group" |
| `participant_ids` | string[] | Yes | Array of user UUIDs (min 1) |
| `group_name` | string | No | Name for group chats |

**Response (New):**
```json
{
  "success": true,
  "data": { "ConversationID": "uuid" },
  "existing": false,
  "msg": "Conversation created successfully"
}
```

**Response (Existing Direct Chat):**
```json
{
  "success": true,
  "data": { "ConversationID": "uuid" },
  "existing": true,
  "msg": "Existing conversation found"
}
```

**Errors:**
- `400` - Invalid request, missing participants
- `403` - Cannot create conversation with blocked users

---

### GET /api/conversations/[id]

Get details for a specific conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "ConversationID": "uuid",
    "Type": "direct",
    "GroupName": null,
    "GroupImage": null,
    "CreatedAt": "2024-01-15T10:30:00Z",
    "UpdatedAt": "2024-01-15T12:45:00Z",
    "Participants": [...]
  },
  "msg": "Conversation fetched successfully"
}
```

**Errors:**
- `403` - Not a participant in this conversation
- `404` - Conversation not found

---

### PUT /api/conversations/[id]

Update conversation settings.

**Request Body:**
```json
{
  "is_muted": true,
  "group_name": "New Group Name",
  "group_image_url": "https://..."
}
```

| Field | Type | Who Can Update |
|-------|------|----------------|
| `is_muted` | boolean | Any participant (own setting) |
| `group_name` | string | Owner/Admin only |
| `group_image_url` | string | Owner/Admin only |

**Response:**
```json
{
  "success": true,
  "data": { "ConversationID": "uuid" },
  "msg": "Conversation updated successfully"
}
```

**Errors:**
- `403` - Not authorized to update group settings

---

### DELETE /api/conversations/[id]

Leave or delete a conversation.

**Behavior:**
- **Direct chats**: Removes current user from participants (soft leave)
- **Group chats (owner)**: Deletes entire conversation
- **Group chats (member)**: Leaves the group

**Response:**
```json
{
  "success": true,
  "msg": "Left conversation successfully"
}
```

---

### POST /api/conversations/[id]/participants

Add a participant to a group conversation.

**Request Body:**
```json
{
  "user_id": "uuid"
}
```

**Permissions:** Owner or Admin only

**Errors:**
- `400` - Can only add to group conversations
- `403` - Not authorized / user is blocked
- `409` - User already in conversation

---

### DELETE /api/conversations/[id]/participants

Remove a participant from a group conversation.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `user_id` | uuid | User to remove |

**Permissions:**
- Users can remove themselves
- Admins can remove members
- Cannot remove the owner

**Errors:**
- `400` - Can only remove from group conversations
- `403` - Not authorized to remove this user

---

## Messages

### GET /api/messages

Get messages for a conversation.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `conversation_id` | uuid | - | **Required** |
| `limit` | number | 50 | Max results (capped at 100) |
| `before` | ISO timestamp | - | Get messages before this time |
| `after` | ISO timestamp | - | Get messages after this time |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "content": "Hello!",
      "message_type": "text",
      "media_url": null,
      "media_thumbnail_url": null,
      "media_metadata": null,
      "status": "sent",
      "reply_to_id": null,
      "deleted_at": null,
      "deleted_for_everyone": false,
      "created_at": "2024-01-15T12:45:00Z",
      "edited_at": null,
      "client_message_id": "user_1705322700000_abc123"
    }
  ],
  "msg": "Messages fetched successfully"
}
```

**Notes:**
- Messages returned in chronological order (oldest first)
- Use `before` param for pagination (pass `created_at` of oldest message)
- Deleted messages not included unless sender is requesting

---

### POST /api/messages

Send a new message.

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "content": "Hello!",
  "message_type": "text",
  "media_url": "https://...",
  "media_thumbnail_url": "https://...",
  "media_metadata": { "width": 1920, "height": 1080 },
  "reply_to_id": "uuid",
  "client_message_id": "unique_client_id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | uuid | Yes | Target conversation |
| `content` | string | Yes | Message text (1-10000 chars) |
| `message_type` | string | No | text, image, video, audio, file, system |
| `media_url` | string | No | URL for media messages |
| `media_thumbnail_url` | string | No | Thumbnail URL |
| `media_metadata` | object | No | Width, height, duration, etc. |
| `reply_to_id` | uuid | No | Message being replied to |
| `client_message_id` | string | No | Client-side deduplication ID |

**Response:**
```json
{
  "success": true,
  "data": { /* message object */ },
  "msg": "Message sent successfully"
}
```

**Response (Duplicate):**
```json
{
  "success": true,
  "data": { /* existing message */ },
  "duplicate": true,
  "msg": "Message already exists"
}
```

**Errors:**
- `403` - Not a participant / blocked by recipient

---

### GET /api/messages/[id]

Get a single message by ID.

**Response:**
```json
{
  "success": true,
  "data": { /* message object */ },
  "msg": "Message fetched successfully"
}
```

---

### PATCH /api/messages/[id]

Edit or delete a message.

**Request Body (Edit):**
```json
{
  "content": "Updated message content"
}
```

**Request Body (Delete):**
```json
{
  "deleted": true,
  "deleted_for_everyone": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | New message content |
| `deleted` | boolean | Soft delete the message |
| `deleted_for_everyone` | boolean | Replace content with "[Message deleted]" |

**Permissions:** Only the sender can edit/delete

**Response:**
```json
{
  "success": true,
  "data": { /* updated message */ },
  "msg": "Message updated successfully"
}
```

---

### DELETE /api/messages/[id]

Permanently delete a message (soft delete).

**Permissions:** Only the sender can delete

**Behavior:**
- Sets `deleted_at` to current time
- Sets `deleted_for_everyone` to true
- Replaces content with "[Message deleted]"

**Response:**
```json
{
  "success": true,
  "msg": "Message deleted successfully"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "msg": "Error description"
}
```

**Common Status Codes:**
| Code | Meaning |
|------|---------|
| 400 | Bad request (validation failed) |
| 401 | Not authenticated |
| 403 | Forbidden (not authorized) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, etc.) |
| 500 | Server error |

---

## Validation

All endpoints use Zod for request validation. Common validation rules:

- UUIDs must be valid v4 format
- Content length: 1-10000 characters
- Message types: text, image, video, audio, file, system
- Participant roles: owner, admin, member
- Conversation types: direct, group

---

## Real-time Updates

While the API handles CRUD, real-time delivery uses Supabase Realtime:

1. **Broadcast events** - Immediate push from sender
2. **Postgres changes** - Database trigger on INSERT/UPDATE

Clients should subscribe to `conversation:{id}` channel for live updates.
