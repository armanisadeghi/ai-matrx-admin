# Math Education Feature

Interactive mathematics learning platform with step-by-step problem solving for algebra and other mathematical concepts.

## Overview

This feature provides:
- **Server-Side Rendered** pages for optimal SEO and performance
- **Interactive Learning** with step-by-step equation solving
- **Public Access** - no authentication required
- **LaTeX Rendering** for mathematical equations using KaTeX
- **Progress Tracking** through multi-step solutions

## Structure

```
features/math/
├── components/
│   ├── ControlPanel.tsx       # Navigation controls for problems
│   ├── MathProblem.tsx         # Main interactive problem component
│   └── EquationDisplay.tsx     # LaTeX equation rendering
├── hooks/
│   └── useStepReveal.ts        # Hook for step-by-step reveals
├── utils/
│   ├── import-math-problems.ts # AI import utilities
│   └── index.ts                # Exports
├── types.ts                     # TypeScript definitions
├── service.ts                   # Database service layer
├── AI_GENERATION_GUIDE.md      # Guide for AI to generate problems
├── USAGE_EXAMPLES.md           # Import utility examples
└── README.md                    # This file
```

## Database Schema

Problems are stored in the `math_problems` table with JSON fields for flexible data structures:

- `problem_statement`: Problem text, equation, and instructions (JSONB)
- `solutions`: Array of solution approaches with steps (JSONB)
- Organization: `course_name`, `topic_name`, `module_name`
- Metadata: `difficulty_level`, `hint`, `resources`, `related_content`

## Routes

### Public Routes (SSR)
- `/education/math` - List of all math problems, grouped by module
- `/education/math/[id]` - Individual problem with interactive solver

Both routes include:
- ✅ Full SEO metadata (title, description, Open Graph, Twitter)
- ✅ Server-side data fetching
- ✅ ISR with 1-hour revalidation
- ✅ Responsive design with dark mode support

## Data Migration

### Initial Setup

1. Ensure your Supabase database has the required tables (see SQL schema in project docs)
2. Make sure environment variables are set in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

### Running the Migration

The migration script pushes math problem data to the database.

**Option 1: Using Node.js (recommended)**
```powershell
node scripts/migrate-math-problems.mjs
```

**Option 2: Using ts-node**
```powershell
pnpm exec ts-node --esm scripts/migrate-math-problems.ts
```

The script will:
- Check for existing problems (by ID)
- Update existing or insert new problems
- Provide detailed progress and error reporting
- Show a summary at the end

### Migration Output Example

```
🚀 Starting math problems migration...

📊 Total problems to migrate: 12

[1/12] ✅ Inserted: Solve equation with multiple variables on both sides
[2/12] ✅ Inserted: Introduction to Two-Step Equations
...

====================================
📈 Migration Summary
====================================
✅ Successful: 12
❌ Failed: 0
📊 Total: 12
====================================

🎉 Migration completed successfully!

✨ You can now access the problems at: https://yoursite.com/education/math
```

## Usage Example

### Fetching Problems (Server-Side)

```typescript
import { getAllMathProblems, getMathProblemById } from '@/features/math/service';

// Get all problems
const problems = await getAllMathProblems();

// Get specific problem
const problem = await getMathProblemById('some-uuid');
```

### Rendering a Problem

```typescript
import MathProblem from '@/features/math/components/MathProblem';

export default async function Page({ params }) {
  const problem = await getMathProblemById(params.id);
  
  return <MathProblem {...problem} />;
}
```

## Component Props

### MathProblem Component

```typescript
type MathProblemProps = {
  id: string;
  title: string;
  course_name: string;
  topic_name: string;
  module_name: string;
  description: string | null;
  intro_text: string | null;
  final_statement: string | null;
  problem_statement: ProblemStatement;
  solutions: Solution[];
};
```

## Features

### Interactive Problem Solving
- Step-by-step equation reveals
- Multiple solution approaches
- Detailed explanations for each step
- Transition text between solutions
- Final summary and congratulations

### Navigation
- **Next**: Advance to the next step/solution
- **Back**: Return to previous step/solution
- **Reset**: Start over from the beginning

### Stages
1. **Overview**: Problem metadata and description
2. **Intro**: Problem introduction text
3. **Solution**: Step-by-step solving with multiple approaches

## SEO Features

All pages include:
- Dynamic titles and descriptions based on problem content
- Relevant keywords (topic, module, difficulty)
- Open Graph meta tags for social sharing
- Twitter Card meta tags
- Canonical URLs
- ISR for optimal performance

## Development

### Adding New Problems

1. **Via AI Generation**: Use `AI_GENERATION_GUIDE.md` and import utilities
2. **Via Database**: Insert directly into `math_problems` table
3. **Via Migration**: Re-run migration script with new data
4. **Via Service**: Use `insertMathProblem()` function

### AI-Generated Problems

See `AI_GENERATION_GUIDE.md` for complete instructions. Key points:
- Generate **ONE problem at a time** (not arrays)
- **Wrap in `math_problem` object** for proper detection
- **Do not include "id"** field (auto-generated)
- Focus on educational content and accurate LaTeX
- Use `\(...\)` for inline math in text fields (titles, explanations)
- Output in code block: \`\`\`json { "math_problem": {...} } \`\`\`
- **System auto-corrects**: Plain fractions, exponents, spacing

**Import AI-generated problems:**
```typescript
import { importFromJSON } from '@/features/math/utils';

// AI outputs single problem wrapped in math_problem key
const aiOutput = `{
  "math_problem": {
    "title": "...",
    "course_name": "...",
    ...
  }
}`;
const result = await importFromJSON(aiOutput);

if (result.success) {
  console.log(`✓ Imported ${result.inserted} problem(s)`);
} else {
  console.error('Errors:', result.errors);
}
```

Full examples in `USAGE_EXAMPLES.md`.

### Problem Structure

AI-generated problems should be wrapped in `math_problem` key and omit the `id` field:

```typescript
{
  math_problem: {
    title: "Problem Title",
    course_name: "Mathematics",
    topic_name: "Algebra",
    module_name: "Foundations of Algebra",
    description: "What this problem teaches",
    intro_text: "Introduction to the problem",
    problem_statement: {
      text: "Given the equation:",
      equation: "S = \\frac{1}{2}PL + B",
      instruction: "Solve for P."
    },
    solutions: [{
      task: "Isolate P on one side",
      steps: [{
        title: "Step 1: Write the equation",
        equation: "S = \\frac{1}{2}PL + B",
        explanation: "Starting point",
        simplified: "S = \\frac{1}{2}PL + B" // optional
      }],
      solutionAnswer: "P = \\frac{2(S - B)}{L}",
      transitionText: "Now let's solve it another way..." // optional
    }],
    final_statement: "Concluding remarks",
    difficulty_level: "medium" // optional: easy, medium, hard
  }
}
```

## Future Enhancements

- [ ] User progress tracking (requires authentication)
- [ ] Practice mode with randomly generated values
- [ ] Hints system with progressive reveals
- [ ] Achievement badges
- [ ] Related problems recommendations
- [ ] Print-friendly version
- [ ] Mobile app integration
- [ ] Multi-language support

## Dependencies

- **react-katex**: LaTeX rendering
- **katex**: Mathematical typesetting
- **framer-motion**: Smooth animations
- **@supabase/supabase-js**: Database client
- **next**: React framework with SSR/ISR

## Notes

- Problems are publicly accessible (no auth required)
- All data fetching is server-side for SEO
- ISR ensures fast page loads with fresh content
- LaTeX equations are rendered client-side
- Responsive design works on all devices

