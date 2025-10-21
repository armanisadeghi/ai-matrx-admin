# Quiz Database Integration Guide

The quiz system now supports automatic database persistence with Supabase, allowing users to save their progress and resume quizzes later.

## Quick Start

### Basic Usage with Auto-Save

```tsx
import MultipleChoiceQuiz from '@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz';

// Auto-save is enabled by default
<MultipleChoiceQuiz 
  questions={questions}
  quizTitle="JavaScript Fundamentals"
/>
```

### Disable Auto-Save (Original Behavior)

```tsx
<MultipleChoiceQuiz 
  questions={questions}
  enableAutoSave={false}
/>
```

### Load Existing Quiz Session

```tsx
<MultipleChoiceQuiz 
  questions={questions}
  sessionId="some-uuid-here"
/>
```

### Custom Auto-Save Interval

```tsx
<MultipleChoiceQuiz 
  questions={questions}
  autoSaveInterval={5000} // Save every 5 seconds
/>
```

## Database Schema

```sql
quiz_sessions
├── id (UUID, PK)
├── user_id (UUID, FK to auth.users)
├── title (TEXT, nullable)
├── state (JSONB) - Complete QuizState object
├── is_completed (BOOLEAN)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ, auto-updated)
└── completed_at (TIMESTAMPTZ, nullable)
```

## How Auto-Save Works

1. **Initial Save**: When user answers the first question, the quiz is automatically saved to the database
2. **Periodic Saves**: Quiz state is saved every 10 seconds (configurable)
3. **On Completion**: When user finishes the quiz, it's immediately saved with results
4. **Manual Save**: Users can click the Save button to force an immediate save

## Save Status Indicators

The quiz displays real-time save status:

- **Cloud with pulse animation** (blue) - Currently saving
- **Cloud icon** (green) - Successfully saved (hover to see last save time)
- **Cloud with X** (red) - Save failed (hover to see error)

## Server Actions

All database operations are handled via server actions in `actions/quiz.actions.ts`:

### `createQuizSession(state, title?)`
Creates a new quiz session in the database.

```typescript
const result = await createQuizSession(quizState, "My Quiz Title");
if (result.success) {
  console.log('Quiz created:', result.data.id);
}
```

### `updateQuizSession(id, state, isCompleted?)`
Updates an existing quiz session.

```typescript
const result = await updateQuizSession(sessionId, updatedState);
if (result.success) {
  console.log('Quiz updated');
}
```

### `getQuizSession(id)`
Retrieves a specific quiz session.

```typescript
const result = await getQuizSession(sessionId);
if (result.success) {
  const session = result.data;
  console.log('Quiz loaded:', session);
}
```

### `getUserQuizSessions(options?)`
Gets all quiz sessions for the current user.

```typescript
// Get all sessions
const result = await getUserQuizSessions();

// Get only completed quizzes
const result = await getUserQuizSessions({ completedOnly: true });

// Get only in-progress quizzes
const result = await getUserQuizSessions({ inProgressOnly: true });

// Limit results
const result = await getUserQuizSessions({ limit: 10 });
```

### `deleteQuizSession(id)`
Deletes a quiz session.

```typescript
const result = await deleteQuizSession(sessionId);
if (result.success) {
  console.log('Quiz deleted');
}
```

### `updateQuizTitle(id, title)`
Updates just the title of a quiz session.

```typescript
const result = await updateQuizTitle(sessionId, "New Title");
```

## useQuizPersistence Hook

The persistence hook manages all database interactions:

```typescript
const {
  sessionId,        // Database UUID of the session
  isSaving,         // Is currently saving
  lastSaved,        // Date of last successful save
  saveError,        // Error message if save failed
  isLoading,        // Is loading a session
  loadedSession,    // The loaded session data
  saveNow,          // Function to manually trigger save
  loadQuizSession   // Function to load a specific session
} = useQuizPersistence(quizState, {
  autoSave: true,
  autoSaveInterval: 10000,
  sessionId: 'optional-uuid'
});
```

## QuizSessionList Component

Display and manage saved quizzes:

```tsx
import { QuizSessionList } from '@/components/mardown-display/blocks/quiz/QuizSessionList';

<QuizSessionList 
  filter="all" // 'all' | 'completed' | 'in-progress'
  onLoadSession={(sessionId) => {
    // Handle loading the session
    console.log('Load session:', sessionId);
  }}
/>
```

### Complete Example: Quiz Manager Page

```tsx
'use client';

import { useState } from 'react';
import MultipleChoiceQuiz from '@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz';
import { QuizSessionList } from '@/components/mardown-display/blocks/quiz/QuizSessionList';

export default function QuizManagerPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState([/* your questions */]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Quiz List */}
      <div>
        <h2 className="text-xl font-bold mb-4">My Quizzes</h2>
        <QuizSessionList 
          filter="all"
          onLoadSession={(id) => setActiveSessionId(id)}
        />
      </div>

      {/* Active Quiz */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quiz</h2>
        {activeSessionId ? (
          <MultipleChoiceQuiz 
            questions={questions}
            sessionId={activeSessionId}
          />
        ) : (
          <MultipleChoiceQuiz 
            questions={questions}
            quizTitle="New Quiz"
          />
        )}
      </div>
    </div>
  );
}
```

## Data Flow

### Creating a New Quiz

1. AI generates questions → passed to `MultipleChoiceQuiz`
2. User answers first question
3. `useQuizPersistence` detects state change
4. `createQuizSession()` saves to database
5. Database returns UUID
6. UUID stored in component state as `sessionId`

### Resuming a Quiz

1. User clicks "Resume" on a quiz from `QuizSessionList`
2. `sessionId` passed to `MultipleChoiceQuiz`
3. `useQuizPersistence` loads session via `getQuizSession()`
4. Quiz state restored from database
5. User continues where they left off

### Completing a Quiz

1. User answers last question
2. Results calculated and added to state
3. `useQuizPersistence` detects completion
4. `updateQuizSession()` saves with `is_completed: true`
5. `completed_at` timestamp set automatically

## Querying Quiz Data

You can query the JSONB state column for advanced filtering:

```sql
-- Find quizzes with perfect scores
SELECT * FROM quiz_sessions 
WHERE (state->'results'->>'scorePercentage')::int = 100;

-- Find quizzes about specific topics (if stored in questions)
SELECT * FROM quiz_sessions 
WHERE state->'originalQuestions' @> '[{"question": "JavaScript"}]'::jsonb;

-- Get average scores per user
SELECT 
  user_id, 
  AVG((state->'results'->>'scorePercentage')::int) as avg_score
FROM quiz_sessions 
WHERE is_completed = true
GROUP BY user_id;
```

## Security

Row Level Security (RLS) is enabled:
- Users can only access their own quiz sessions
- All operations filtered by `auth.uid() = user_id`
- Foreign key ensures user exists in auth.users

## Best Practices

### 1. Set Meaningful Titles
```tsx
<MultipleChoiceQuiz 
  questions={questions}
  quizTitle="React Hooks - Advanced Patterns"
/>
```

### 2. Handle Save Errors
```tsx
const { saveError } = useQuizPersistence(quizState, options);

useEffect(() => {
  if (saveError) {
    toast.error('Failed to save quiz: ' + saveError);
  }
}, [saveError]);
```

### 3. Adjust Auto-Save for Different Networks
```tsx
// Slower network - save less frequently
<MultipleChoiceQuiz 
  questions={questions}
  autoSaveInterval={30000} // 30 seconds
/>

// Fast network - save more frequently
<MultipleChoiceQuiz 
  questions={questions}
  autoSaveInterval={5000} // 5 seconds
/>
```

### 4. Provide User Feedback
The component already shows save status, but you can enhance it:

```tsx
const { lastSaved, isSaving } = useQuizPersistence(quizState, options);

return (
  <div>
    {isSaving && <p>Saving your progress...</p>}
    {lastSaved && <p>Last saved: {lastSaved.toLocaleTimeString()}</p>}
  </div>
);
```

## Migration from File-Based System

The file download/upload system still works alongside the database:

- **Download** - Export quiz as JSON file (backup, sharing)
- **Upload** - Import quiz from JSON file (restore, migrate)
- **Database** - Automatic persistence (primary method)

Users can still export their quiz as a file for backup or sharing purposes.

## Performance Considerations

1. **Auto-Save Debouncing**: Prevents rapid consecutive saves
2. **JSONB Indexing**: GIN index on state column for fast queries
3. **Lazy Loading**: Sessions loaded on-demand, not all at once
4. **Optimistic Updates**: UI updates immediately, sync happens in background

## Troubleshooting

### Quiz Not Saving

1. Check user is authenticated: `await supabase.auth.getUser()`
2. Check RLS policies are enabled
3. Check browser console for errors
4. Verify `enableAutoSave={true}` (it's default)

### Can't Load Previous Quiz

1. Verify `sessionId` is correct UUID
2. Check user has permission (must be owner)
3. Check session exists in database
4. Verify state JSONB is valid

### Save Status Always Shows Error

1. Check network connectivity
2. Verify Supabase credentials
3. Check RLS policies
4. Look for error details in `saveError` state

## Future Enhancements

Potential additions (not yet implemented):

- Quiz templates (share quiz structure without answers)
- Leaderboards (compare scores with other users)
- Quiz categories and tagging
- Full-text search on questions
- Analytics and insights
- Export quiz history as PDF

