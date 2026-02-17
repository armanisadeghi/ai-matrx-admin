# MATRX Pattern System - Frontend Integration Guide

This document describes the MATRX pattern syntax that the frontend can embed in messages and system instructions. The backend automatically detects and resolves these patterns before sending content to the AI provider.

---

## How It Works

1. The frontend embeds `<<MATRX>>` patterns in message text or system instruction content.
2. When the backend receives the request, patterns are parsed and replaced with data fetched from the database.
3. The AI model receives the final resolved text -- it never sees the raw pattern syntax.

This works in **all** of the following locations:

- **System instructions** (both string and structured dict formats)
- **User messages** (plain text or `input_text` content blocks)
- **Any TextContent** in the messages array

---

## Pattern Syntax

### Basic Pattern (uses table's default field)

```
<<MATRX>><<TABLE>><<COLUMN>>value<</MATRX>>
```

### Pattern with Specific Field

```
<<MATRX>><<TABLE>><<COLUMN>>value<<FIELDS>>field_name<</MATRX>>
```

### Pattern with Multiple Fields

```
<<MATRX>><<TABLE>><<COLUMN>>value<<FIELDS>>field1,field2<</MATRX>>
```

### Components

| Component | Required | Description |
|-----------|----------|-------------|
| `<<MATRX>>` | Yes | Opening tag -- signals the start of a pattern |
| `<<TABLE>>` | Yes | Database table name (uppercase). Example: `<<CONTENT_BLOCKS>>` |
| `<<COLUMN>>` | Yes | Column to filter by (uppercase). Example: `<<BLOCK_ID>>`, `<<ID>>`, `<<CATEGORY_ID>>` |
| `value` | Yes | The value to search for. Can be a slug, UUID, or any string |
| `<<FIELDS>>` | No | Optional. Specifies which field(s) to return. Comma-separated for multiple |
| `<</MATRX>>` | Yes | Closing tag |

---

## Supported Tables

### CONTENT_BLOCKS

The primary table for reusable content templates.

| Column | Description | Example Value |
|--------|-------------|---------------|
| `BLOCK_ID` | Unique slug identifier | `flashcards` |
| `ID` | UUID primary key | `b46e284e-ccb0-4d32-8a96-07f85d50d134` |
| `CATEGORY_ID` | Category UUID (returns all blocks in category) | `9980e68f-97fc-4f71-bf1d-22583b6cdf38` |

| Field | Description | Default? |
|-------|-------------|----------|
| `template` | The main content template | Yes (returned when no `<<FIELDS>>` specified) |
| `label` | Display name of the block | No |
| `block_id` | The slug identifier | No |
| `category_id` | Category UUID | No |

---

## Examples

### In a System Instruction (structured dict)

```json
{
  "system_instruction": {
    "content": "You are a flashcard generator. Use this template:\n\n<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<</MATRX>>",
    "include_date": true
  }
}
```

### In a System Instruction (plain string via messages)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Generate content using this structure:\n\n<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<</MATRX>>"
    },
    {
      "role": "user",
      "content": "Create flashcards about the solar system"
    }
  ]
}
```

### In a User Message

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Here is the template I want to use:\n\n<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<</MATRX>>\n\nPlease generate 5 flashcards about JavaScript."
    }
  ]
}
```

### Fetching by UUID

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Use this template: <<MATRX>><<CONTENT_BLOCKS>><<ID>>b46e284e-ccb0-4d32-8a96-07f85d50d134<</MATRX>>"
    }
  ]
}
```

### Fetching All Blocks in a Category

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You have access to these content templates:\n\n<<MATRX>><<CONTENT_BLOCKS>><<CATEGORY_ID>>9980e68f-97fc-4f71-bf1d-22583b6cdf38<</MATRX>>"
    }
  ]
}
```

### Fetching a Specific Field

```json
{
  "messages": [
    {
      "role": "user",
      "content": "The template name is: <<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<<FIELDS>>label<</MATRX>>"
    }
  ]
}
```

### Fetching Multiple Fields

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Template details:\n\n<<MATRX>><<CONTENT_BLOCKS>><<CATEGORY_ID>>9980e68f-97fc-4f71-bf1d-22583b6cdf38<<FIELDS>>label,template<</MATRX>>"
    }
  ]
}
```

### Multiple Patterns in One Message

Patterns can appear anywhere in the text and multiple patterns can coexist:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "# Content Generation Guide\n\n## Template\n<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<</MATRX>>\n\n## Template Name\n<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<<FIELDS>>label<</MATRX>>\n\n## All Available Templates\n<<MATRX>><<CONTENT_BLOCKS>><<CATEGORY_ID>>9980e68f-97fc-4f71-bf1d-22583b6cdf38<<FIELDS>>label<</MATRX>>"
    }
  ]
}
```

---

## Error Handling

If a pattern fails to fetch (invalid ID, table not configured, DB error), the pattern is replaced with an error marker:

```
[FETCH_ERROR: <error message>]
```

This ensures the request still proceeds -- it does not block or fail the entire API call.

---

## Regex Specification (Backend + Frontend Must Match)

The backend and frontend **must** use identical pattern recognition. The regexes below are the authoritative source of truth. If either side changes its regex, the other must update to match.

### Quick Check (Does text contain any patterns?)

Use this first to avoid running the full regex on text that has no patterns.

**Python (backend -- source of truth):**

```python
import re

MATRX_QUICK_CHECK = re.compile(r'<<MATRX>>')

def has_matrx_patterns(text: str) -> bool:
    return bool(MATRX_QUICK_CHECK.search(text))
```

**TypeScript (frontend -- must match):**

```typescript
const MATRX_QUICK_CHECK = /<<MATRX>>/;

function hasMatrxPatterns(text: string): boolean {
  return MATRX_QUICK_CHECK.test(text);
}
```

### Full Pattern Regex (Parse and extract components)

This regex captures all four components: table, column, value, and optional fields.

**Python (backend -- source of truth):**

Source: `ai/instructions/pattern_parser.py` line 49

```python
import re

MATRX_PATTERN = re.compile(
    r'<<MATRX>>'                              # Opening tag
    r'<<([^>]+)>>'                            # Group 1: table (e.g. CONTENT_BLOCKS)
    r'<<([^>]+)>>'                            # Group 2: column (e.g. BLOCK_ID)
    r'((?:(?!<<FIELDS>>|<</MATRX>>).)*?)'    # Group 3: value (lazy, stops at <<FIELDS>> or <</MATRX>>)
    r'(?:<<FIELDS>>([^<]+))?'                 # Group 4: fields (optional, e.g. template,label)
    r'<</MATRX>>',                            # Closing tag
    re.DOTALL | re.MULTILINE
)
```

Composed single-line pattern:

```
<<MATRX>><<([^>]+)>><<([^>]+)>>((?:(?!<<FIELDS>>|<</MATRX>>).)*?)(?:<<FIELDS>>([^<]+))?<</MATRX>>
```

Flags: `DOTALL` (`.` matches `\n`) + `MULTILINE`

**TypeScript (frontend -- must match):**

```typescript
const MATRX_PATTERN = /<<MATRX>><<([^>]+)>><<([^>]+)>>((?:(?!<<FIELDS>>|<<\/MATRX>>).)*?)(?:<<FIELDS>>([^<]+))?<<\/MATRX>>/gms;
```

> **Critical difference:** In JavaScript regex literals, the forward slash `/` inside the pattern must be escaped as `\/`. This applies to `<</MATRX>>` which becomes `<<\/MATRX>>`. The Python raw string does not require this escape. The actual matched text is identical: `<</MATRX>>`.

Flags:
- `g` -- global (find all matches, not just first)
- `m` -- multiline (`^`/`$` match line boundaries; included for parity)
- `s` -- dotAll (`.` matches `\n`; equivalent to Python's `re.DOTALL`)

### Capture Groups (identical for both)

| Group | Name | Description | Example |
|-------|------|-------------|---------|
| 1 | table | Table/group name | `CONTENT_BLOCKS` |
| 2 | column | Column/identifier | `BLOCK_ID` |
| 3 | value | The lookup value | `flashcards` or a UUID |
| 4 | fields | Field(s) to return (optional, may be undefined) | `template` or `label,template` |

### TypeScript Usage Example

```typescript
interface MatrxPattern {
  table: string;
  column: string;
  value: string;
  fields: string | null;
  raw: string;
  startIndex: number;
  endIndex: number;
}

function parseMatrxPatterns(text: string): MatrxPattern[] {
  const MATRX_PATTERN = /<<MATRX>><<([^>]+)>><<([^>]+)>>((?:(?!<<FIELDS>>|<<\/MATRX>>).)*?)(?:<<FIELDS>>([^<]+))?<<\/MATRX>>/gms;

  const patterns: MatrxPattern[] = [];
  let match: RegExpExecArray | null;

  while ((match = MATRX_PATTERN.exec(text)) !== null) {
    patterns.push({
      table: match[1].trim(),
      column: match[2].trim(),
      value: match[3].trim(),
      fields: match[4]?.trim() ?? null,
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return patterns;
}
```

### Validation: Confirming a String Is a Valid Pattern

To check whether a specific string is a complete, valid MATRX pattern (not just that it contains one), anchor the regex:

**Python:**

```python
MATRX_EXACT = re.compile(
    r'^<<MATRX>><<([^>]+)>><<([^>]+)>>((?:(?!<<FIELDS>>|<</MATRX>>).)*?)(?:<<FIELDS>>([^<]+))?<</MATRX>>$',
    re.DOTALL
)

def is_valid_matrx_pattern(text: str) -> bool:
    return bool(MATRX_EXACT.match(text.strip()))
```

**TypeScript:**

```typescript
const MATRX_EXACT = /^<<MATRX>><<([^>]+)>><<([^>]+)>>((?:(?!<<FIELDS>>|<<\/MATRX>>).)*?)(?:<<FIELDS>>([^<]+))?<<\/MATRX>>$/s;

function isValidMatrxPattern(text: string): boolean {
  return MATRX_EXACT.test(text.trim());
}
```

### Test Vectors

Both implementations **must** produce identical results for these inputs:

| Input | Valid? | Table | Column | Value | Fields |
|-------|--------|-------|--------|-------|--------|
| `<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<</MATRX>>` | Yes | `CONTENT_BLOCKS` | `BLOCK_ID` | `flashcards` | `null` |
| `<<MATRX>><<CONTENT_BLOCKS>><<ID>>b46e284e-ccb0-4d32-8a96-07f85d50d134<</MATRX>>` | Yes | `CONTENT_BLOCKS` | `ID` | `b46e284e-ccb0-4d32-8a96-07f85d50d134` | `null` |
| `<<MATRX>><<CONTENT_BLOCKS>><<BLOCK_ID>>flashcards<<FIELDS>>label<</MATRX>>` | Yes | `CONTENT_BLOCKS` | `BLOCK_ID` | `flashcards` | `label` |
| `<<MATRX>><<CONTENT_BLOCKS>><<CATEGORY_ID>>9980e68f<<FIELDS>>label,template<</MATRX>>` | Yes | `CONTENT_BLOCKS` | `CATEGORY_ID` | `9980e68f` | `label,template` |
| `<<MATRX>><<MY_TABLE>><<NAME>>hello world<</MATRX>>` | Yes | `MY_TABLE` | `NAME` | `hello world` | `null` |
| `<<MATRX>><<T>><<C>>line1\nline2<</MATRX>>` | Yes | `T` | `C` | `line1\nline2` | `null` |
| `<<MATRX>><<CONTENT_BLOCKS>><</MATRX>>` | No | -- | -- | -- | -- |
| `<<MATRX>>flashcards<</MATRX>>` | No | -- | -- | -- | -- |
| `<<MATRX>><<TABLE>><<COL>>value` | No (missing closing tag) | -- | -- | -- | -- |
| `plain text with no patterns` | No | -- | -- | -- | -- |

---

## Important Notes

- **Table names must be UPPERCASE** in the pattern: `<<CONTENT_BLOCKS>>`, not `<<content_blocks>>`
- **Column names must be UPPERCASE** in the pattern: `<<BLOCK_ID>>`, not `<<block_id>>`
- **Field names in `<<FIELDS>>` are lowercase**: `<<FIELDS>>template,label`
- **No spaces** inside the `<<` `>>` delimiters
- **Patterns can span multiple lines** -- the value portion supports newlines
- **Patterns are resolved once** at request time -- the AI model never sees the raw `<<MATRX>>` syntax
- **Patterns in assistant messages** loaded from conversation history are also resolved, but they should not contain patterns since they are AI-generated text
- **Performance**: If no `<<MATRX>>` tag is found in the text, the resolver skips entirely (fast-path regex check)
