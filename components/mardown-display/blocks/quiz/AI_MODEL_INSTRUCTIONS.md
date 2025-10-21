# Quiz Generation Instructions for AI Models

## Required Format

When generating a quiz, always use this exact structure:

```json
{
  "quiz_title": "Your Quiz Title Here",
  "category": "Subject Category (optional)",
  "multiple_choice": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}
```

## Field Requirements

### REQUIRED Fields

1. **`quiz_title`** (string)
   - Must be the first field in the JSON
   - This is how the system detects a quiz
   - Make it descriptive and engaging
   - Example: `"JavaScript ES6 Features"`

2. **`multiple_choice`** (array)
   - Must contain at least one question object
   - Each question must have all required subfields

### OPTIONAL Fields

3. **`category`** (string)
   - Subject area or topic
   - Examples: `"Programming"`, `"Biology"`, `"History"`, `"Mathematics"`
   - Helps users organize and filter quizzes

### Question Object Requirements

Each question in `multiple_choice` must have:

- **`id`** (number): Sequential number starting from 1
- **`question`** (string): Clear, unambiguous question text
- **`options`** (array of strings): 2-6 answer choices
- **`correctAnswer`** (number): Index of correct answer (0-based)
- **`explanation`** (string): Why the answer is correct

## Important Rules

### ❌ DO NOT Include

- **No `quizId` field** - The system generates content hashes automatically
- **No `id` at root level** - Not needed
- **No `questions` array** - Use `multiple_choice` only
- **No `title` field** - Use `quiz_title` instead

### ✅ DO Include

- **Always start with `quiz_title`** - First field in JSON
- **Use `multiple_choice`** - Only this array name
- **Sequential question IDs** - Start at 1, increment by 1
- **Clear explanations** - Help users learn from mistakes
- **Appropriate difficulty** - Match the user's level

## Answer Randomization

- **Don't worry about randomizing answers yourself**
- The system automatically randomizes options at runtime
- You can place the correct answer anywhere in the options
- The system tracks which option is correct regardless of position

## Examples

### Minimal Quiz (2 questions)

```json
{
  "quiz_title": "Quick Math Check",
  "multiple_choice": [
    {
      "id": 1,
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "explanation": "2 + 2 equals 4"
    },
    {
      "id": 2,
      "question": "What is 10 × 10?",
      "options": ["100", "1000", "10", "110"],
      "correctAnswer": 0,
      "explanation": "10 multiplied by 10 equals 100"
    }
  ]
}
```

### Quiz with Category

```json
{
  "quiz_title": "World Capitals",
  "category": "Geography",
  "multiple_choice": [
    {
      "id": 1,
      "question": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctAnswer": 2,
      "explanation": "Paris has been the capital of France since the 12th century."
    },
    {
      "id": 2,
      "question": "What is the capital of Japan?",
      "options": ["Tokyo", "Kyoto", "Osaka", "Hiroshima"],
      "correctAnswer": 0,
      "explanation": "Tokyo became the capital of Japan in 1868."
    }
  ]
}
```

## Best Practices

### Question Design

1. **Be Specific**: Avoid ambiguous wording
2. **One Correct Answer**: Only one option should be clearly correct
3. **Plausible Distractors**: Wrong answers should seem reasonable
4. **Avoid "All of the above"**: Can be confusing with randomization
5. **Consistent Length**: Keep options similar in length

### Explanation Quality

1. **Educational**: Teach, don't just confirm
2. **Concise**: 1-2 sentences usually sufficient
3. **Context**: Add interesting facts when appropriate
4. **References**: Mention sources for complex topics

### Difficulty Progression

1. **Start Easy**: Build confidence with early questions
2. **Gradual Increase**: Progress to harder material
3. **Mix It Up**: Vary question types and difficulty
4. **End Strong**: Finish with a challenging but fair question

## Common Mistakes to Avoid

❌ Using `title` instead of `quiz_title`
❌ Adding a `quizId` field
❌ Using `questions` instead of `multiple_choice`
❌ Forgetting the `explanation` field
❌ Using 1-based indexing for `correctAnswer` (use 0-based)
❌ Making options too similar or obvious
❌ Writing unclear or trick questions

## Validation

The system will validate:
- ✅ Presence of `quiz_title` field
- ✅ Presence of `multiple_choice` array
- ✅ At least one question exists
- ✅ Each question has all required fields
- ✅ `correctAnswer` is within bounds of `options` array
- ✅ All fields are correct types (string, number, array)

If validation fails, the quiz will be displayed as a code block instead.

## Technical Notes

- **Content Hashing**: The system generates a SHA-256 hash from questions
- **Duplicate Detection**: Identical content won't create duplicate sessions
- **Auto-Save**: User progress is automatically saved to database
- **Randomization**: Options are shuffled while maintaining correct answer tracking
- **Persistence**: Users can resume quizzes across sessions

