# Quiz JSON Format

## Structure

All quizzes must follow this exact structure:

```json
{
  "quiz_title": "Quiz Title Here",
  "category": "Category Here (optional)",
  "multiple_choice": [
    {
      "id": 1,
      "question": "question text here",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "explanation": "brief explanation"
    }
  ]
}
```

## Field Descriptions

### Required Fields

- **`quiz_title`** (string): The title of the quiz
  - This field is used for detection and identification
  - Must be present at the root level
  - Example: `"Fundamentals of Proteins"`

- **`multiple_choice`** (array): Array of question objects
  - Must contain at least one question
  - Each question must have all required fields

### Optional Fields

- **`category`** (string): The category of the quiz
  - Example: `"Biology"`, `"Mathematics"`, `"History"`
  - Used for organizing and filtering quizzes

### Question Object Fields

Each question in the `multiple_choice` array must have:

- **`id`** (number): Unique identifier for the question
- **`question`** (string): The question text
- **`options`** (array of strings): Array of answer choices
- **`correctAnswer`** (number): Index of the correct answer (0-based)
- **`explanation`** (string): Explanation of the correct answer

## Detection

The system detects quizzes by looking for JSON objects that:
1. Start with `"quiz_title"` as the first key
2. Contain a valid `multiple_choice` array

## Content Hashing

- Quizzes are identified by a SHA-256 hash of their content
- The hash is generated from the questions only (not title or category)
- This prevents duplicate quizzes from being created
- When a quiz with the same content is loaded, the existing session is automatically resumed

## Example

```json
{
  "quiz_title": "Basic JavaScript Concepts",
  "category": "Programming",
  "multiple_choice": [
    {
      "id": 1,
      "question": "What keyword is used to declare a variable in JavaScript?",
      "options": ["var", "let", "const", "All of the above"],
      "correctAnswer": 3,
      "explanation": "JavaScript supports var, let, and const for variable declaration."
    },
    {
      "id": 2,
      "question": "Which operator is used for strict equality?",
      "options": ["==", "===", "=", "!="],
      "correctAnswer": 1,
      "explanation": "The === operator checks both value and type equality."
    }
  ]
}
```

## Notes

- **No backward compatibility**: Only this format is supported
- **No AI-generated IDs**: The system generates its own content hash
- **Single format**: Simplifies parsing and reduces complexity
- **Automatic randomization**: Answer options are randomized at runtime

