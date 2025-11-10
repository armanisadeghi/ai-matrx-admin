# AI Code Editor - Debugging Guide

## 🚨 Most Common Issue: Parsing Failures

### Problem: "No valid SEARCH/REPLACE blocks found"

**Symptom**: The AI responds, but the parser can't extract any code changes. AI explanatory text gets mixed into the code.

**Root Cause**: Delimiters (`<<<`, `>>>`) are not on their own lines, or the AI is putting text after delimiters.

**Examples of WRONG formatting** ❌:

```
SEARCH: <<< const foo = 1; >>>       // Delimiters on same line as code
REPLACE: <<< const foo = 2; >>>

SEARCH:
<<<
const bar = 1;
>>> This is the end                  // Text after delimiter

SEARCH:
<<<
function test() { }
>>                                   // Wrong delimiter (should be >>>)
```

**CORRECT formatting** ✅:

```
SEARCH:
<<<
const foo = 1;
>>>

REPLACE:
<<<
const foo = 2;
>>>
```

**Solution**: Update your AI prompt to emphasize:
1. Delimiters MUST be on their own lines
2. No text before/after delimiters
3. Opening and closing delimiters must match (`<<<` pairs with `>>>`)

---

## Understanding Validation Errors

When the AI generates code changes that don't match your current code, you'll now see **extremely detailed** error messages that help you understand exactly what went wrong.

---

## New Error Message Format

### Overview Section
```
⚠️ VALIDATION FAILED

The AI generated 6 edits, but some SEARCH patterns don't match the current code.

This usually means:
• The AI's search pattern has different whitespace/indentation
• The AI is trying to edit code that doesn't exist in this file
• The code structure is different than what the AI expects
```

### Per-Edit Details

For each failed edit, you'll see:

```
━━━ Edit 2 of 6 ━━━
❌ SEARCH pattern not found in code

📝 Search Pattern (5 lines, 245 chars):
   First line: "<Button"
   Last line:  "</Button>"

✓ First line DOES exist in the code
⚠️  But the full pattern doesn't match exactly
💡 Likely issue: Whitespace, indentation, or surrounding code differs

📍 First line found near:
```
          <Button 
            type="submit" 
            disabled={!isFormValid || isExecuting}
            className="h-12 px-8"
          >
```

📋 Full SEARCH pattern:
────────────────────────────────────────────────────────────
          <Button 
            type="submit" 
            disabled={!isFormValid || isExecuting || isStreaming}
            className={`${hasResults ? 'h-11 px-6' : 'h-12 px-8'} font-semibold`}
            size={hasResults ? 'default' : 'lg'}
          >
────────────────────────────────────────────────────────────
```

---

## What Each Section Means

### 📝 Search Pattern Summary
Shows the size and key identifiers of what the AI is looking for:
- **Lines**: Number of lines in the search pattern
- **Chars**: Total character count
- **First line**: The opening line (helps identify the section)
- **Last line**: The closing line (helps confirm the block)

### Diagnosis Indicators

#### ✓ First line DOES exist
```
✓ First line DOES exist in the code
⚠️  But the full pattern doesn't match exactly
💡 Likely issue: Whitespace, indentation, or surrounding code differs
```

**Meaning**: The AI found the right general area, but the exact match failed.

**Common causes**:
- Extra/missing spaces or tabs
- Different indentation levels
- Surrounding code changed since the AI saw it
- Template literals vs strings
- Comments added/removed

**What to do**:
1. Check the context shown - it's where the first line appears
2. Compare whitespace carefully
3. Look for differences in surrounding code
4. Consider manually applying the REPLACE code

---

#### 🔍 Similar content found
```
🔍 Similar content found: "const handleSubmit = async (e) => {..."
💡 The AI's search pattern might not match the actual code exactly
```

**Meaning**: Found something similar but not an exact match.

**Common causes**:
- Variable names changed
- Function signature modified
- Comments or formatting differences

**What to do**:
1. Review the similar content
2. Determine if it's the same logical block
3. Manually apply changes if appropriate

---

#### ❌ First line not found anywhere
```
❌ First line not found anywhere in the code
💡 The AI might be editing code that doesn't exist in this file
```

**Meaning**: The AI is hallucinating or referencing wrong code.

**Common causes**:
- AI generated changes for the wrong file
- AI invented code that doesn't exist
- Current code is completely different structure
- AI saw an outdated version

**What to do**:
1. Check if you're editing the correct file
2. Review the full AI response to see if it makes sense
3. Try rephrasing your request with more specific context
4. Make changes manually

---

## Example Real Error

Based on your recent error, here's what you would see:

```
⚠️ VALIDATION FAILED

The AI generated 6 edits, but some SEARCH patterns don't match the current code.

This usually means:
• The AI's search pattern has different whitespace/indentation
• The AI is trying to edit code that doesn't exist in this file
• The code structure is different than what the AI expects

══════════════════════════════════════════════════════════════════════

━━━ Edit 2 of 6 ━━━
❌ SEARCH pattern not found in code

📝 Search Pattern (14 lines, 478 chars):
   First line: "<Button"
   Last line:  "</Button>"

✓ First line DOES exist in the code
⚠️  But the full pattern doesn't match exactly
💡 Likely issue: Whitespace, indentation, or surrounding code differs

📍 First line found near:
```
          <Button 
            type="submit" 
            disabled={!isFormValid || isExecuting}
            className="h-12 px-8 font-semibold"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
```

📋 Full SEARCH pattern:
────────────────────────────────────────────────────────────
          <Button 
            type="submit" 
            disabled={!isFormValid || isExecuting || isStreaming}
            className={`${hasResults ? 'h-11 px-6' : 'h-12 px-8'} font-semibold`}
            size={hasResults ? 'default' : 'lg'}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate LSIs
              </>
            )}
          </Button>
────────────────────────────────────────────────────────────

━━━ Edit 6 of 6 ━━━
❌ SEARCH pattern not found in code

📝 Search Pattern (180 lines, 6234 chars):
   First line: "import { Button } from '@/components/ui/button';"
   Last line: "}"

❌ First line not found anywhere in the code
💡 The AI might be editing code that doesn't exist in this file

📋 Full SEARCH pattern:
────────────────────────────────────────────────────────────
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
  ... (180 lines total)
────────────────────────────────────────────────────────────
```

---

## Common Patterns & Solutions

### Pattern: "disabled={!isFormValid || isExecuting}"
**AI tries**: `disabled={!isFormValid || isExecuting || isStreaming}`
**Actual**: `disabled={!isFormValid || isExecuting}`

**Issue**: Code evolved, but AI has outdated version

**Solution**: 
1. Manually update the line
2. Or tell AI: "The disabled prop currently doesn't include isStreaming, add it"

---

### Pattern: Template Literals
**AI tries**: 
```jsx
className={`${hasResults ? 'h-11' : 'h-12'}`}
```

**Actual**:
```jsx
className="h-12"
```

**Issue**: AI is adding dynamic behavior that doesn't exist yet

**Solution**: 
1. This is likely a good change - manually apply it
2. Or ask AI to generate the full changes including adding the hasResults logic

---

### Pattern: Imports
**AI tries**: Full file replacement starting with imports
**Actual**: Component code without imports visible

**Issue**: AI is treating this like a full file when it's just a component

**Solution**:
1. Tell AI: "Only modify the component body, not imports"
2. Extract just the relevant REPLACE parts and apply manually

---

## Tips for Better AI Edits

### 1. Be Specific About Scope
❌ "Add a clear button"
✅ "Add a clear button next to the submit button in the form"

### 2. Reference Existing Code
❌ "Fix the button"
✅ "In the Button component around line 50 with 'Generate LSIs' text, add..."

### 3. One Change at a Time
❌ "Add clear button, fix validation, update imports, add aria labels"
✅ "Add a clear button next to the submit button"
(Then do the rest separately)

### 4. Provide Context
❌ "Update the form"
✅ "In the form that has the primary_keyword input and Generate LSIs button, ..."

---

## Still Getting Errors?

If the detailed errors don't help:

1. **Check the Full AI Response** - Always visible on error now
2. **Look at Browser Console** - Parser logs everything
3. **Try Manual Edit** - Sometimes faster than debugging AI
4. **Simplify Request** - Ask for one specific change
5. **Use "Try Again"** - Rephrase with more specific details

---

## Future Improvements

Planned enhancements:
- [ ] Auto-suggest fixes for common whitespace issues
- [ ] Show side-by-side comparison of expected vs actual
- [ ] AI retry with error context
- [ ] Partial application (apply successful edits, skip failed ones)
- [ ] Smart indentation normalization

