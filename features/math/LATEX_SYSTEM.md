# Unified LaTeX System

This document describes the consolidated LaTeX rendering system used across the application.

## Architecture

All LaTeX processing and rendering is centralized in `/features/math/` to ensure consistency and maintainability.

### Core Files

#### 1. **`/features/math/utils/latex-normalizer.ts`**
Central utility for LaTeX normalization and preprocessing.

**Functions:**
- `fixLatexEscapeSequences(content)` - Fixes corrupted escape sequences from JSON
  - Repairs: `\t` → `\text`, `\n` → `\nabla`, etc.
- `normalizeLaTeX(text, options?)` - Main normalization function
  - Fixes escape sequences
  - Converts fractions: `1/2` → `\frac{1}{2}`
  - Normalizes spacing
  - Fixes notation: `**` → `^`
- `normalizeLatexInObject(obj)` - Recursively normalizes all strings in an object
- `normalizeMathProblemLatex(problem)` - Specialized for math problems

#### 2. **`/features/math/components/InlineLatexRenderer.tsx`**
Unified React component for rendering inline LaTeX.

**Features:**
- Uses ReactMarkdown + remarkMath + rehypeKatex
- Automatically calls `normalizeLaTeX()` by default
- Supports both inline (`$...$`) and display (`$$...$$`) math
- Configurable normalization via props

**Usage:**
```tsx
import { InlineLatexRenderer } from '@/features/math/components';

<InlineLatexRenderer content="Water ($\text{H}_2\text{O}$) is essential" />
```

#### 3. **`/features/math/components/InlineMathText.tsx`**
Alternative lightweight renderer using react-katex directly.

**When to use:**
- Need very lightweight rendering
- Don't need full markdown support
- Already have clean LaTeX (no normalization needed)

## Used By

### Quiz System
**Location:** `/components/mardown-display/blocks/quiz/MultipleChoiceQuiz.tsx`

Uses `InlineLatexRenderer` for:
- Question text
- Answer options
- Explanations

### Math Problem Blocks
**Location:** `/components/mardown-display/blocks/math/MathProblemBlock.tsx`

Uses `normalizeMathProblemLatex()` to preprocess all content.

### Basic Markdown Content
**Location:** `/components/mardown-display/chat-markdown/BasicMarkdownContent.tsx`

Uses ReactMarkdown with remarkMath/rehypeKatex for full markdown documents.

## Common Issues Fixed

### 1. JSON Escape Sequence Corruption
**Problem:** JSON with single backslashes interprets them as escape sequences
```json
{
  "text": "$\text{H}_2\text{O}$"  // \t becomes tab character
}
```
**Solution:** `fixLatexEscapeSequences()` automatically repairs corrupted commands

### 2. Fraction Notation
**Problem:** AI writes `1/2` instead of `\frac{1}{2}`
**Solution:** `convertFractionsToLatex()` auto-converts

### 3. Spacing Issues
**Problem:** AI writes `x=2` instead of `x = 2`
**Solution:** `normalizeEqualsSpacing()` adds proper spacing

## Safety & Error Handling

**CRITICAL FEATURE**: This system is designed to NEVER crash your application.

### Multi-Layer Protection:

1. **Error Boundary** in `InlineLatexRenderer`
   - Catches React rendering errors
   - Falls back to plain text display

2. **Try-Catch in Normalization**
   - Each normalization step is wrapped
   - Failed steps are skipped, not crashed

3. **Graceful Degradation**
   - If LaTeX rendering fails → shows plain text
   - If normalization fails → uses original text
   - If entire component fails → shows raw content

### Result:
**Your UI will NEVER break due to LaTeX issues.** Users always see content, even if rendering fails.

## Best Practices

### ✅ DO
- Import from `/features/math/components` or `/features/math/utils`
- Use `InlineLatexRenderer` for text with LaTeX
- Let normalization run by default (it's smart, fast, and safe)
- Add new normalizations to `latex-normalizer.ts`
- Trust the error handling - it will always show something

### ❌ DON'T
- Create new LaTeX renderers elsewhere in the codebase
- Duplicate escape sequence fixes
- Skip normalization unless you have a specific reason
- Use raw KaTeX/react-katex without error handling
- Worry about LaTeX crashing your app (it won't!)

## Future Enhancements

If you need to add new LaTeX features:

1. **New normalization rules** → Add to `latex-normalizer.ts`
2. **New rendering options** → Extend `InlineLatexRenderer` props
3. **New component needs** → Use existing components or discuss with team

## Testing

Test with these common cases:
- Chemical formulas: `$\text{H}_2\text{O}$`
- Fractions: `1/2` or `\frac{1}{2}`
- Superscripts/subscripts: `x^2`, `a_n`
- Greek letters: `\alpha`, `\beta`
- Complex expressions: `\frac{-b \pm \sqrt{b^2-4ac}}{2a}`

All should render correctly with normalization enabled.

