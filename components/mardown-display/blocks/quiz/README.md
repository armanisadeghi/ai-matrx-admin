# Multiple Choice Quiz System

A comprehensive quiz system with answer randomization, state management, progress tracking, and export/import functionality.

## Features

### 🎲 Answer Randomization
- **True Randomization**: Uses Fisher-Yates shuffle algorithm to ensure answers are truly randomized
- **Correct Answer Tracking**: Maintains which answer is correct even after shuffling
- **Unique Per Quiz**: Each quiz instance gets a unique randomization

### 💾 State Management
- **Centralized State**: All quiz state managed through a single `QuizState` object
- **Progress Tracking**: Tracks current question, answers, time spent, and more
- **Results Calculation**: Automatic calculation of score, correct/incorrect counts, etc.

### 📥 Export/Import Functionality
- **Download Progress**: Export complete quiz state including randomization and progress
- **Download Results**: Export results with detailed answer review
- **Resume Later**: Import saved progress to continue exactly where you left off
- **Results Review**: Import results files to review past quiz attempts

### 🔄 Retake Missed Questions
- **Smart Retry**: After completing a quiz, retake only the questions you got wrong
- **New Randomization**: Answers are re-randomized for the retake
- **Mode Indicator**: Clear visual indicator when in retake mode

### ⏱️ Time Tracking
- **Per Question**: Tracks time spent on each individual question
- **Total Time**: Tracks total time for the entire quiz
- **Time Display**: Human-readable time format (e.g., "5m 23s")

### 📊 Performance Feedback
- **Score Percentage**: Overall percentage score
- **Performance Messages**: Contextual feedback based on score
- **Detailed Stats**: Total, correct, incorrect, and skipped questions

## Usage

### Basic Usage

```tsx
import MultipleChoiceQuiz from '@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz';

const questions = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctAnswer: 1, // Index of "Paris"
    explanation: "Paris is the capital and largest city of France."
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1, // Index of "Mars"
    explanation: "Mars is called the Red Planet due to its reddish appearance."
  }
];

function MyQuizPage() {
  return <MultipleChoiceQuiz questions={questions} />;
}
```

### Question Format

Each question must follow this structure:

```typescript
type Question = {
  id: number;              // Unique identifier
  question: string;        // The question text
  options: string[];       // Array of answer options
  correctAnswer: number;   // Index of correct answer (0-based)
  explanation: string;     // Explanation shown after answering
};
```

## How Randomization Works

1. **On Quiz Start**: When the quiz component initializes, it creates a randomized version of all questions
2. **Shuffle Process**: Each question's options are shuffled using the Fisher-Yates algorithm
3. **Answer Mapping**: The system maintains a mapping between shuffled and original indices
4. **Correct Answer**: The correct answer index is updated to match the shuffled position

Example:
```typescript
// Original question
{
  options: ["Paris", "London", "Berlin", "Madrid"],
  correctAnswer: 0  // Paris is at index 0
}

// After randomization (example)
{
  options: ["Berlin", "Madrid", "Paris", "London"],
  correctAnswerIndex: 2,  // Paris is now at index 2
  originalCorrectAnswer: 0,
  shuffleMap: [2, 3, 0, 1]  // Maps shuffled to original
}
```

## State Management

### Quiz State Structure

```typescript
type QuizState = {
  quizId: string;                      // Unique ID for this quiz instance
  originalQuestions: OriginalQuestion[]; // Original questions from AI
  randomizedQuestions: RandomizedQuestion[]; // Shuffled versions
  progress: QuizProgress;              // Current progress
  results: QuizResults | null;         // Results when completed
  mode: 'normal' | 'retake';          // Quiz mode
  retakeQuestionIds?: number[];       // IDs for retake mode
};
```

### Progress Tracking

```typescript
type QuizProgress = {
  currentQuestionIndex: number;
  answers: Record<number, QuizAnswer>;
  startTime: number;
  lastUpdated: number;
  totalTimeSpent: number;
};

type QuizAnswer = {
  questionId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  timestamp: number;
  timeSpent?: number;
};
```

## Export/Import

### Export Formats

#### 1. Complete Progress Export
Includes everything needed to restore quiz state:
- Original questions
- Randomized questions (maintains same answer order)
- Progress and answers
- Time tracking
- Results (if completed)

**Use case**: Save progress to continue later

```typescript
// Triggered by "Download Progress" button
{
  exportVersion: "1.0.0",
  exportDate: 1234567890,
  quizId: "quiz_123_abc",
  quizData: { ... },
  progress: { ... },
  results: { ... }
}
```

#### 2. Results Export
Lightweight export focused on results:
- Results summary
- Answers given
- Detailed question review (questions, answers, explanations)

**Use case**: Save results for record-keeping or review

```typescript
// Triggered by "Download Results" button
{
  exportVersion: "1.0.0",
  exportDate: 1234567890,
  quizId: "quiz_123_abc",
  results: { ... },
  questionsReview: [
    {
      questionId: 1,
      question: "What is...",
      selectedAnswer: "Paris",
      correctAnswer: "Paris",
      isCorrect: true,
      explanation: "..."
    }
  ]
}
```

### Import Functionality

Click the "Import" button in the quiz header to load a previously saved quiz state. The system will:
1. Validate the export version
2. Restore the exact quiz state
3. Resume at the same question (if incomplete)
4. Show results screen (if completed)

## Retake Missed Questions

After completing a quiz with incorrect answers:

1. Click "Retake Missed Questions (X)" button on results screen
2. A new quiz is created with only the missed questions
3. Answers are randomized again (different order than first attempt)
4. Visual indicator shows you're in "Retake Mode"
5. Complete the retake to see improved results

## User Flow

### Normal Quiz Flow
1. Start quiz → Questions loaded and randomized
2. Answer questions → Progress tracked, time recorded
3. Navigate freely → Back/Next buttons available
4. Complete quiz → View results screen
5. Actions available:
   - Review Answers
   - Retry Quiz (full restart with new randomization)
   - Retake Missed Questions
   - Download Progress
   - Download Results

### Resume Flow
1. Click "Import" button
2. Select previously saved progress file
3. Resume exactly where you left off
4. Answer order remains the same (no re-randomization on resume)

### Retake Flow
1. Complete quiz with some incorrect answers
2. Click "Retake Missed Questions"
3. New quiz with only incorrect questions
4. Answers re-randomized
5. Complete to see new results

## Technical Details

### Utility Functions

All utility functions are in `quiz-utils.ts`:

- `randomizeQuestion()` - Randomizes a single question
- `randomizeQuestions()` - Randomizes all questions
- `initializeQuizState()` - Creates new quiz state
- `updateProgress()` - Updates progress with new answer
- `calculateResults()` - Computes results from progress
- `exportQuizState()` - Exports complete state to JSON
- `exportQuizResults()` - Exports results to JSON
- `importQuizState()` - Imports and validates state from JSON
- `downloadQuizState()` - Downloads state as file
- `downloadQuizResults()` - Downloads results as file
- `uploadQuizState()` - Opens file picker and imports state
- `createRetakeQuizState()` - Creates retake mode state
- `formatTime()` - Formats seconds to readable string
- `getPerformanceMessage()` - Returns performance feedback

### Type Definitions

All types are in `quiz-types.ts`:

- `OriginalQuestion` - AI-generated question format
- `RandomizedQuestion` - Shuffled question with mapping
- `QuizAnswer` - User's answer for a question
- `QuizProgress` - Progress tracking data
- `QuizResults` - Results and statistics
- `QuizState` - Complete quiz state
- `QuizExport` - Export format for progress
- `QuizResultsExport` - Export format for results

## Future Enhancements

When you're ready to add database support:

1. Create a `quiz_sessions` table to store quiz state
2. Create a `quiz_results` table to store completed results
3. Add save/load functions that use the existing export/import format
4. The JSON structure is already designed to be database-friendly

Example tables:
```sql
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  quiz_id VARCHAR,
  state JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  quiz_id VARCHAR,
  results JSONB,
  completed_at TIMESTAMP
);
```

## Tips for AI Model Integration

When using AI models to generate questions:

1. **Vary the correct answer position** in your prompt:
   - ❌ "Always put the correct answer first"
   - ✅ "Randomize the correct answer position"

2. **But don't worry** - This system will re-randomize anyway! The built-in randomization ensures truly random answer order regardless of AI output.

3. **Focus on quality** - Spend your effort on quality questions and explanations rather than worrying about answer order.

## Accessibility

- Keyboard navigation supported
- Clear visual feedback for answered/correct/incorrect
- Color contrast meets WCAG standards
- Screen reader friendly labels
- Focus states for all interactive elements

## Browser Support

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

Requires JavaScript enabled for file download/upload functionality.

