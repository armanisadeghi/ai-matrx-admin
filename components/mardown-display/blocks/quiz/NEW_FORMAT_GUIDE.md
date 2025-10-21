# Quiz Format Update - New Structure with Metadata & Duplicate Detection

## ✨ What's New

The quiz system now supports **two formats** and includes intelligent **duplicate detection** using content hashing.

### Format Support

1. **Legacy Format** (still works):
```json
{
  "multiple_choice": [
    {
      "id": 1,
      "question": "What is React?",
      "options": ["Library", "Framework", "Language", "Tool"],
      "correctAnswer": 0,
      "explanation": "React is a JavaScript library"
    }
  ]
}
```

2. **New Format** (with metadata):
```json
{
  "quizId": "react_basics_001",
  "title": "React Fundamentals Quiz",
  "category": "Web Development",
  "multiple_choice": [
    {
      "id": 1,
      "question": "What is React?",
      "options": ["Library", "Framework", "Language", "Tool"],
      "correctAnswer": 0,
      "explanation": "React is a JavaScript library"
    }
  ],
  "questions": [
    {
      "id": 2,
      "question": "What is JSX?",
      "options": ["HTML", "Syntax Extension", "Template", "Function"],
      "correctAnswer": 1,
      "explanation": "JSX is a syntax extension for JavaScript"
    }
  ]
}
```

### Key Features

✅ **Flexible Question Arrays** - Can use `multiple_choice`, `questions`, or both  
✅ **Metadata Support** - Title, category, and AI-generated quiz ID  
✅ **Content Hashing** - SHA-256 hash of questions for duplicate detection  
✅ **Automatic Merging** - Combines questions from both arrays, removes duplicates  
✅ **Resume Detection** - If same quiz is rendered again, resumes existing session  

## 🔄 How Duplicate Detection Works

### Content Hashing

When a quiz is parsed:
1. Questions are extracted and sorted by ID
2. Content is normalized (lowercased, trimmed, sorted)
3. SHA-256 hash is generated from question content
4. Hash is stored in database with the session

### Resume Logic

When a new quiz is rendered:
1. Content hash is generated
2. Database is checked for existing in-progress session with same hash
3. If found → Resumes that session
4. If not found → Creates new session

**Example Flow:**
```
User takes quiz → Closes browser → Returns to page → Same quiz rendered → Auto-resumes!
```

## 📝 Usage Examples

### Old Format (Still Works)

```tsx
import { MultipleChoiceQuiz } from '@/components/mardown-display/blocks/quiz';

const questions = [
  {
    id: 1,
    question: "What is TypeScript?",
    options: ["Superset", "Framework", "Library", "Language"],
    correctAnswer: 0,
    explanation: "TypeScript is a typed superset of JavaScript"
  }
];

<MultipleChoiceQuiz questions={questions} />
```

### New Format with Metadata

```tsx
import { MultipleChoiceQuiz, type RawQuizJSON } from '@/components/mardown-display/blocks/quiz';

const quizData: RawQuizJSON = {
  quizId: "typescript_basics_001",
  title: "TypeScript Fundamentals",
  category: "Programming Languages",
  multiple_choice: [
    {
      id: 1,
      question: "What is TypeScript?",
      options: ["Superset", "Framework", "Library", "Language"],
      correctAnswer: 0,
      explanation: "TypeScript is a typed superset of JavaScript"
    }
  ],
  questions: [
    {
      id: 2,
      question: "What does tsc stand for?",
      options: ["Type System Compiler", "TypeScript Compiler", "Type Safe Code", "Type Check"],
      correctAnswer: 1,
      explanation: "tsc is the TypeScript Compiler"
    }
  ]
};

<MultipleChoiceQuiz quizData={quizData} />
```

### Parsing Quiz Manually

```tsx
import { parseQuizJSON, generateQuizHash } from '@/components/mardown-display/blocks/quiz';

const quizData = JSON.parse(jsonString);
const parsed = await parseQuizJSON(quizData);

console.log(parsed.questions);      // All questions merged
console.log(parsed.title);           // Quiz title
console.log(parsed.contentHash);     // SHA-256 hash
console.log(parsed.metadata);        // Additional metadata
```

## 🗄️ Database Schema Changes

Run this migration to add the new columns:

```sql
-- Add quiz content hash and metadata
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS quiz_content_hash TEXT,
ADD COLUMN IF NOT EXISTS quiz_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_content_hash 
ON quiz_sessions(user_id, quiz_content_hash);
```

### What Gets Stored

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "title": "React Fundamentals Quiz",
  "state": { /* QuizState object */ },
  "is_completed": false,
  "quiz_content_hash": "a3f5b8c...",
  "quiz_metadata": {
    "quizId": "react_basics_001",
    "title": "React Fundamentals Quiz",
    "category": "Web Development"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:10:00Z"
}
```

## 🎯 Detection in Markdown Streaming

The system detects both formats automatically:

```typescript
// Old format detection
if (trimmed.startsWith('{\n  "multiple_choice"') || 
    trimmed.startsWith('{"multiple_choice"')) {
  // Render as quiz
}

// New format detection
if (trimmed.startsWith('{\n  "quizId"') || 
    trimmed.startsWith('{"quizId"')) {
  // Render as quiz with metadata
}
```

## 🔑 Key Differences

| Feature | Old Format | New Format |
|---------|-----------|------------|
| Question arrays | `multiple_choice` only | `multiple_choice` + `questions` |
| Metadata | None | `quizId`, `title`, `category` |
| Duplicate detection | No | Yes (via content hash) |
| Auto-resume | No | Yes |
| Title display | Manual prop only | From metadata or prop |

## 🚀 Migration Guide

### For AI Prompt Engineers

Update your quiz generation prompts to include:

```json
{
  "quizId": "unique_identifier_here",
  "title": "Quiz Title",
  "category": "Category Name",
  "questions": [
    /* your questions */
  ]
}
```

### For Developers

**No code changes needed!** Both formats work automatically:

```tsx
// Old way - still works
<MultipleChoiceQuiz questions={questions} />

// New way - with metadata
<MultipleChoiceQuiz quizData={parsedQuizJSON} />

// Override title
<MultipleChoiceQuiz quizData={parsedQuizJSON} quizTitle="Custom Title" />
```

## 📊 Benefits

### For Users
- **Auto-resume** - Come back later, continue where you left off
- **Clear titles** - Know what quiz you're taking
- **No duplicates** - Same quiz = same session

### For Developers
- **Backward compatible** - Old format still works
- **Flexible** - Use either or both question arrays
- **Smart** - Automatic duplicate detection
- **Simple** - No manual session management needed

## 🔍 How Content Hash is Generated

```typescript
1. Extract all questions
2. Sort by ID
3. Normalize content:
   - Lowercase all text
   - Trim whitespace
   - Sort options alphabetically
4. Create JSON string
5. Generate SHA-256 hash
6. Store as hex string (64 characters)
```

**Example:**
```
Questions → Normalized → SHA-256 → a3f5b8c2d1e4f6...
```

### Hash Comparison

Two quizzes are considered "the same" if:
- Questions match (text and options)
- Order doesn't matter (sorted by ID)
- Metadata doesn't affect hash (title, category ignored)

## 🎮 User Experience

### First Visit
```
AI generates quiz → Quiz renders → Hash generated → Session created → User takes quiz
```

### Return Visit (Same Quiz)
```
AI generates same quiz → Hash matches → Existing session loaded → User continues
```

### Different Quiz
```
AI generates different quiz → Hash doesn't match → New session created
```

## 🛠️ Advanced Usage

### Check for Existing Session

```typescript
import { findExistingQuizByHash } from '@/components/mardown-display/blocks/quiz';

const existingSession = await findExistingQuizByHash(contentHash);
if (existingSession.data) {
  // Resume this session
}
```

### Generate Hash for Comparison

```typescript
import { generateQuizHash } from '@/components/mardown-display/blocks/quiz';

const hash1 = await generateQuizHash(questions1);
const hash2 = await generateQuizHash(questions2);

if (hash1 === hash2) {
  console.log('Same quiz content!');
}
```

### Validate Quiz Format

```typescript
import { isValidQuizData } from '@/components/mardown-display/blocks/quiz';

if (isValidQuizData(jsonData)) {
  // Safe to use as quiz
}
```

## 📝 Summary

✅ **Two formats supported** - Old and new both work  
✅ **Automatic detection** - System recognizes format  
✅ **Smart hashing** - Content-based duplicate detection  
✅ **Auto-resume** - Continue where you left off  
✅ **Metadata support** - Title, category, quiz ID  
✅ **Backward compatible** - No breaking changes  

The quiz system is now smarter, more flexible, and provides a better user experience with automatic session management!

