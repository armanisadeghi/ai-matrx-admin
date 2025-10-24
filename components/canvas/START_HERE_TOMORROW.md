# 🌅 Start Here Tomorrow Morning

## Quick Context Refresh

You implemented a **Canvas Persistence System** with:
- ✅ Database schema with content hashing for deduplication
- ✅ Service layer (`canvasItemsService.ts`)
- ✅ React hooks (`useCanvasItems.ts`)
- ✅ Redux integration for sync tracking
- ✅ Library view (inside canvas itself - toggle with 📚 button)
- ✅ Public sharing (`/canvas/shared/[token]`)
- ✅ Management UI (search, filter, CRUD operations)

## 🚨 Issues Identified Tonight

### 1. **Duplicates Being Saved** (Critical)
**Problem:** Despite content hashing, identical items are being saved multiple times.

**Where to Look:**
- `services/canvasItemsService.ts` line ~97: `save()` method
- Check if `generateContentHash()` is being called correctly
- Check if the database constraint exists: 
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'canvas_items' AND indexname LIKE '%content%';
  ```
- Check if the duplicate check query is working:
  ```typescript
  const { data: existing } = await supabase
    .from('canvas_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('content_hash', contentHash)
    .single();
  ```

**Debug Steps:**
1. Add `console.log('Generated hash:', contentHash)` in `save()` method
2. Save same quiz twice
3. Check console - are hashes identical?
4. Check database - do both records have same `content_hash`?
5. If yes, constraint not working; if no, hash generation not deterministic

### 2. **Source Tracking Not Connected** (Critical)
**Problem:** Items not linked back to chat messages, sessions, or tasks.

**What's Missing:**
- `source_message_id` - ID of chat message that created the canvas
- `session_id` - ID of chat conversation
- `task_id` - Socket.io task UUID from AI backend

**Where to Fix:**
Look at where canvas is opened from chat. Likely in:
- `features/prompts/components/PromptAssistantMessage.tsx`
- `components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx`

**What to Change:**
```typescript
// When AI creates canvas content, need to capture IDs:
dispatch(openCanvas({
  type: 'quiz',
  data: quizData,
  metadata: {
    title: 'Quiz Title',
    sourceMessageId: messageId,      // ← ADD THIS
    sourceSessionId: sessionId,      // ← ADD THIS  
    sourceTaskId: taskId             // ← ADD THIS
  }
}));
```

Then verify these get passed to `canvasItemsService.save()` in `CanvasRenderer.tsx` line ~100.

---

## 🎯 Top Priority Tasks for Tomorrow

### Task 1: Debug Deduplication (30-60 min)
**Goal:** Find out why duplicates are being saved.

**Steps:**
1. Open browser console
2. Create a quiz from chat AI
3. Click sync button - note the console logs
4. Refresh page, open library
5. Create the EXACT same quiz again
6. Click sync button - check console
7. Are the hashes identical? If not, that's the problem.

**Files to Check:**
- `services/canvasItemsService.ts` - `generateContentHash()` and `save()`
- Database via Supabase dashboard - check `canvas_items` table

### Task 2: Connect Source IDs (45-60 min)
**Goal:** Capture message_id, session_id, and task_id when AI creates canvas.

**Steps:**
1. Find where AI response creates canvas (likely `PromptAssistantMessage.tsx`)
2. Identify where you have access to `messageId`, `sessionId`, `taskId`
3. Pass them to `openCanvas()` in metadata
4. Verify they flow through to database

**Files to Modify:**
- Where AI responses are handled (prompt components)
- Verify `CanvasRenderer.tsx` passes them to `save()`

### Task 3: Test Full Flow (30 min)
**Goal:** Verify everything works end-to-end.

**Test Scenario:**
1. User sends prompt: "Create a quiz about photosynthesis"
2. AI responds with quiz
3. Canvas opens automatically
4. User clicks sync button
5. Verify in database:
   - ✅ `content_hash` populated
   - ✅ `source_message_id` populated
   - ✅ `session_id` populated
   - ✅ `task_id` populated
6. Try to sync same quiz again
7. Verify: "Already saved" message appears, NOT a new row

---

## 📂 File Reference

### Files You Created Today
```
services/canvasItemsService.ts           - Service layer with save/load/delete
hooks/useCanvasItems.ts                  - React hook wrapper
components/canvas/SavedCanvasItems.tsx   - Library management UI
app/canvas/shared/[token]/page.tsx       - Public share page
components/canvas/README.md              - Documentation
components/canvas/LIBRARY_AND_SHARING.md - Feature docs
components/canvas/PRODUCTION_ROADMAP.md  - This roadmap
lib/redux/slices/canvasSlice.ts          - Redux state (modified)
components/layout/adaptive-layout/       - Canvas components (modified)
  ├─ CanvasHeader.tsx                    - Added library button
  ├─ CanvasRenderer.tsx                  - Added library view
  └─ CanvasNavigation.tsx                - History navigation
```

### Key Functions to Know
```typescript
// Save with deduplication
canvasItemsService.save({ content, title, task_id })

// Load user's items
canvasItemsService.list({ type: 'quiz', is_archived: false })

// Share item
canvasItemsService.share(itemId) // Returns shareUrl

// Open canvas from Redux
dispatch(openCanvas(content))

// Mark as synced after save
dispatch(markItemSynced({ canvasItemId, savedItemId }))
```

---

## 🔍 Quick Debugging Commands

### Check Database Constraints
```sql
-- See all indexes on canvas_items
SELECT * FROM pg_indexes WHERE tablename = 'canvas_items';

-- Check if content_hash constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'canvas_items'::regclass;

-- Find duplicates (should be none if working)
SELECT content_hash, COUNT(*) 
FROM canvas_items 
WHERE content_hash IS NOT NULL
GROUP BY content_hash 
HAVING COUNT(*) > 1;
```

### Check Current Items
```sql
-- See all your canvas items
SELECT 
  id, 
  title, 
  type, 
  content_hash,
  source_message_id,
  session_id,
  task_id,
  created_at
FROM canvas_items
ORDER BY created_at DESC
LIMIT 10;
```

### Clear Test Data
```sql
-- Delete all canvas items (for testing)
DELETE FROM canvas_items WHERE user_id = 'your-user-id';
```

---

## 📝 Notes for Context

### How Deduplication Should Work
1. User creates quiz in AI chat
2. Canvas opens with quiz
3. User clicks sync (☁️ button)
4. `generateContentHash()` creates SHA-256 hash of `type + data`
5. Query checks: "Do I already have an item with this hash?"
6. If yes: Update `last_accessed_at`, return existing item, show "Already saved"
7. If no: Insert new row, show "Canvas item saved!"

### Why It Might Not Be Working
- Hash not deterministic (object key order)
- Database constraint not created
- Query not finding existing item
- User ID not matching
- Content being modified before hashing

### Source Tracking Purpose
- **message_id**: Link back to exact AI message that created it
- **session_id**: Filter library by chat conversation
- **task_id**: Avoid re-saving if AI sends same task result twice
- All three enable "smart" features like "Show all from this chat"

---

## ☕ Morning Checklist

- [ ] Read this document
- [ ] Read `PRODUCTION_ROADMAP.md` (full task list)
- [ ] Open browser console
- [ ] Open Supabase dashboard
- [ ] Test duplicate save issue
- [ ] Fix issue #1 or #2 (whichever is easier)
- [ ] Test again
- [ ] Move on to next priority

---

## 🆘 If You're Stuck

### Deduplication Not Working?
1. Check if hash is being generated: Add `console.log` in `generateContentHash()`
2. Check if hash is being saved: Query database
3. Check if constraint exists: Run SQL query above
4. Check if query is running: Add `console.log` before/after duplicate check

### Source IDs Not Captured?
1. Search codebase for `openCanvas` calls
2. Find where AI responses trigger canvas creation
3. Check if you have access to `messageId`, `sessionId`, `taskId` in that scope
4. Pass them through to `openCanvas()` metadata
5. Verify they reach `canvasItemsService.save()`

### Something Else Broken?
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Check Redux DevTools for state issues
4. Ask Claude for help with specific error message

---

**You got this! 🚀**

The foundation is solid. We just need to fix these two connection issues and you'll have a production-ready system.

**Estimated time to fix critical issues:** 2-3 hours
**Estimated time to full MVP:** 1-2 weeks (following roadmap)

