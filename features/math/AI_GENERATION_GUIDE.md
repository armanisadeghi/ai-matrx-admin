# Math Problem Generation Guide for AI

## Instructions

Generate **ONE** math problem per request as a JSON object. Focus on clear educational content and accurate mathematics.

## Required JSON Structure

**Important**: Wrap your problem in a `math_problem` object for proper detection and rendering.

```json
{
  "math_problem": {
    "title": "Problem Title*",
    "course_name": "Mathematics*",
    "topic_name": "Topic Name*",
    "module_name": "Module Name*",
    "description": "Brief description of what this problem teaches",
    "intro_text": "Introduction explaining the problem context",
    "final_statement": "Concluding remarks after solving",
    "difficulty_level": "easy|medium|hard",
    "problem_statement": {
    "text": "Given the equation:*",
    "equation": "LaTeX equation string*",
    "instruction": "Solve for x.*"
  },
  "solutions": [
    {
      "task": "Description of what we're solving for*",
      "steps": [
        {
          "title": "Step 1: Action taken*",
          "equation": "LaTeX equation after this step*",
          "explanation": "Why we do this step",
          "simplified": "Simplified form (optional)"
        }
      ],
      "solutionAnswer": "Final LaTeX answer*",
      "transitionText": "Text before next solution approach (null if last solution)"
    }
  ],
    "hint": "Optional hint for students",
    "resources": ["resource1", "resource2"],
    "related_content": ["uuid-of-related-problem"]
  }
}
```

## Field Specifications

### Basic Information
- **title**: Clear, descriptive title (e.g., "Solving Two-Step Equations")
- **course_name**: Always "Mathematics"
- **topic_name**: "Algebra", "Geometry", "Calculus", etc.
- **module_name**: Specific module within the topic
- **description**: 1-2 sentences explaining the learning objective
- **intro_text**: 2-3 sentences introducing the problem
- **final_statement**: Encouraging conclusion about the concept
- **difficulty_level**: "easy", "medium", or "hard" (optional, defaults to medium)

### Problem Statement (required)
```json
"problem_statement": {
  "text": "Contextual text introducing the equation",
  "equation": "3x + 4 = 19",
  "instruction": "What you're asking the student to do"
}
```

### Solutions Array (required, min 1 solution)

Each solution represents one approach to solving the problem.

**Typical structure**: 
- Solution 1: Detailed with explanations
- Solution 2: Simplified/streamlined version

```json
{
  "task": "We want to isolate x on one side of the equation",
  "steps": [
    {
      "title": "Step 1: Subtract 4 from both sides",
      "equation": "3x + 4 - 4 = 19 - 4",
      "explanation": "To isolate the term with x, we eliminate the constant",
      "simplified": "3x = 15"
    },
    {
      "title": "Step 2: Divide both sides by 3",
      "equation": "\\frac{3x}{3} = \\frac{15}{3}",
      "explanation": "Divide to solve for x",
      "simplified": "x = 5"
    }
  ],
  "solutionAnswer": "x = 5",
  "transitionText": "Now let's solve without all the details..."
}
```

### LaTeX Formatting

**Block Equations** (for `equation` fields):
```json
"equation": "2x + 5 = 13"
```

**Inline Math** (for titles, explanations, descriptions):
Use `\\(` and `\\)` delimiters for math within text:
```json
"title": "Step 3: Write all possible rational roots as \\( \\frac{p}{q} \\)",
"explanation": "The ratio \\( \\frac{p}{q} \\) must be in reduced form."
```

**Standard LaTeX Syntax**:
- Fractions: `\\frac{a}{b}`
- Exponents: `x^2` or `x^{10}`
- Subscripts: `x_1`
- Square roots: `\\sqrt{x}`
- Multiplication: `\\cdot`
- Greek letters: `\\alpha`, `\\beta`
- Parentheses: `\\left( \\right)`

### Optional Fields
- **hint**: Single sentence hint (not shown by default)
- **resources**: Array of helpful resource names/links
- **related_content**: Array of UUIDs for related problems

## Examples

### Simple Two-Step Equation

```json
{
  "math_problem": {
    "title": "Basic Two-Step Equation",
    "course_name": "Mathematics",
    "topic_name": "Algebra",
    "module_name": "Foundations of Algebra",
    "description": "Learn to solve simple two-step equations using inverse operations.",
    "intro_text": "Two-step equations require two operations to isolate the variable. Let's work through an example together.",
    "final_statement": "With practice, two-step equations become second nature. Remember: reverse order of operations!",
    "difficulty_level": "easy",
    "problem_statement": {
    "text": "Given the equation:",
    "equation": "2x + 5 = 13",
    "instruction": "Solve for x."
  },
  "solutions": [
    {
      "task": "We want to isolate x by using inverse operations.",
      "steps": [
        {
          "title": "Step 1: Subtract 5 from both sides",
          "equation": "2x + 5 - 5 = 13 - 5",
          "explanation": "We subtract 5 to eliminate the constant term on the left side.",
          "simplified": "2x = 8"
        },
        {
          "title": "Step 2: Divide both sides by 2",
          "equation": "\\frac{2x}{2} = \\frac{8}{2}",
          "explanation": "Dividing by 2 isolates x.",
          "simplified": "x = 4"
        }
      ],
      "solutionAnswer": "x = 4",
      "transitionText": "Now here's the streamlined version:"
    },
    {
      "task": "Solve using minimal steps.",
      "steps": [
        {
          "title": "Step 1: Subtract 5 from both sides",
          "equation": "2x = 8"
        },
        {
          "title": "Step 2: Divide by 2",
          "equation": "x = 4"
        }
      ],
      "solutionAnswer": "x = 4",
      "transitionText": null
    }
  ],
    "hint": "Start by removing the constant term, then deal with the coefficient.",
    "resources": null,
    "related_content": null
  }
}
```

## Validation Rules

1. **Generate ONE problem per request** (not an array)
2. **Required fields** must not be null or empty
3. **solutions** array must have at least 1 solution
4. Each solution must have at least 1 step
5. **difficulty_level** (if provided) must be: "easy", "medium", or "hard"
6. **course_name** should be "Mathematics"
7. LaTeX equations must be valid syntax
8. **transitionText** should be null for the last solution
9. **Do not include an "id" field** - it will be auto-generated

## Tips for Quality Content

1. **Progressive difficulty**: Start with basic examples, add complexity
2. **Clear explanations**: Each step should explain the "why"
3. **Multiple approaches**: Show detailed then simplified solutions
4. **Encouraging tone**: Use positive, supportive language
5. **Real-world context**: When applicable, relate to practical scenarios
6. **Consistent notation**: Use standard mathematical conventions

## Common Mistakes to Avoid

❌ Generating multiple problems (only generate ONE)
❌ Including an "id" field (not needed)
❌ Missing required fields (especially `problem_statement` and `solutions`)
❌ Empty arrays or null values for required fields
❌ Invalid LaTeX syntax (missing backslashes, unclosed brackets)
❌ Using non-null `transitionText` on the last solution
❌ Steps without equations
❌ Solutions without a final `solutionAnswer`

## Focus on Content

Your job is to create excellent educational content with:
- Clear, accurate mathematical explanations
- Proper LaTeX formatting
- Logical step-by-step progressions
- Encouraging, supportive language
- Multiple solution approaches when appropriate

The technical details (IDs, database fields, etc.) are handled automatically.

## Output Format

Return **only** the JSON object wrapped in a code block:

\`\`\`json
{
  "math_problem": {
    ...
  }
}
\`\`\`

The key to this system is to make sure you explain each step and never skip any steps or make assumptions. The more individual steps, the more the students will learn.

## Automatic Corrections

The system automatically corrects common formatting issues:
- **Fractions**: Plain `1/2` → `\frac{1}{2}`, `-3/2` → `-\frac{3}{2}`
- **Exponents**: `x**2` → `x^{2}`
- **Spacing**: Adds proper spacing around equals signs

However, for **inline math in text** (titles, explanations), use proper LaTeX delimiters `\(...\)` for best results.

