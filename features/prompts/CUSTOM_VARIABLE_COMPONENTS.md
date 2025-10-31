# Custom Variable Components System

## Overview

A flexible system for custom input components in prompt variables. All components ultimately return text values that are used in prompts.

## Architecture

```
features/prompts/
├── types/
│   └── variable-components.ts        # Type definitions
├── components/
│   ├── variable-inputs/
│   │   ├── ToggleInput.tsx          # Toggle component
│   │   ├── RadioGroupInput.tsx      # Radio group component
│   │   ├── CheckboxGroupInput.tsx   # Checkbox group component
│   │   ├── SelectInput.tsx          # Select dropdown component
│   │   ├── NumberInput.tsx          # Number input component
│   │   ├── TextareaInput.tsx        # Textarea component (default)
│   │   ├── index.tsx                # Component router & exports
│   │   ├── README.md                # Component documentation
│   │   └── TEST_PROMPT_EXAMPLE.json # Test data
│   └── PromptRunnerInput.tsx        # Updated to use custom components
```

## How It Works

### 1. Variable Definition

Variables can now include an optional `customComponent` field:

```typescript
{
  name: "priority",
  defaultValue: "Medium",
  customComponent: {
    type: "radio",
    options: ["Low", "Medium", "High", "Critical"]
  }
}
```

### 2. Component Types

- **textarea** - Default multi-line text (no config needed)
- **toggle** - Boolean with custom labels (e.g., Yes/No, True/False)
- **radio** - Single select from options
- **checkbox** - Multi-select (returns newline-separated values)
- **select** - Dropdown single select
- **number** - Numeric input with optional min/max/step

### 3. User Experience

**Inline View:**
- Shows variable name on the left
- Shows current value in the center
- ChevronRight icon on the right indicates expandability

**Expanded View (Popover):**
- Opens when user clicks chevron or on expanded item
- Shows appropriate component based on `customComponent.type`
- Handles edge cases (values not matching options)
- Updates value when user interacts

### 4. Value Handling

All components handle "non-matching values" gracefully:

**Example:** A toggle component with Yes/No options, but current value is "OK"
- Shows warning: "Current value: OK"
- Displays the toggle options below
- When user interacts, replaces with Yes or No

This allows:
- Manual text editing
- Component-based selection
- Hybrid workflows

## Testing

### Step 1: Create Test Prompt

Use the `TEST_PROMPT_EXAMPLE.json` file to create a test prompt in your database.

**SQL Example:**
```sql
INSERT INTO prompts (name, description, messages, variable_defaults, settings, user_id)
VALUES (
  'Variable Components Test',
  'Test all custom component types',
  '[{"role":"system","content":"..."},{"role":"user","content":"..."}]',
  '[
    {
      "name": "enabled",
      "defaultValue": "Yes",
      "customComponent": {"type": "toggle", "toggleValues": ["No", "Yes"]}
    },
    {
      "name": "priority",
      "defaultValue": "Medium",
      "customComponent": {"type": "radio", "options": ["Low", "Medium", "High"]}
    },
    ...
  ]',
  '{"model_id": "anthropic/claude-3.5-sonnet"}',
  'your-user-id'
);
```

### Step 2: Test Each Component

1. Open the test prompt in PromptRunner or PromptRunnerModal
2. For each variable:
   - View inline display
   - Click chevron to expand
   - Test the component interaction
   - Verify the value updates correctly
   - Check that value displays properly when collapsed

### Step 3: Test Edge Cases

1. **Manual edit**: Edit a variable directly in the database with a value not in options
2. **Empty values**: Test with empty defaultValue
3. **Invalid numbers**: Test number component with non-numeric text
4. **Checkbox multiselect**: Select multiple, verify newline separation

## Next Steps

### 1. Update VariablesManager.tsx

Location: `features/prompts/components/configuration/VariablesManager.tsx`

Add UI to configure `customComponent` when creating/editing variables:

**Needed Features:**
- Component type selector
- Options editor (for radio/checkbox/select)
- Toggle labels editor
- Number min/max/step inputs

**UI Suggestion:**
```tsx
<Select value={componentType} onChange={...}>
  <option value="">Text (default)</option>
  <option value="toggle">Toggle</option>
  <option value="radio">Radio Group</option>
  <option value="checkbox">Checkbox Group</option>
  <option value="select">Select</option>
  <option value="number">Number</option>
</Select>

{/* Show relevant config based on selected type */}
{componentType === 'radio' && <OptionsEditor />}
{componentType === 'toggle' && <ToggleLabelsEditor />}
{componentType === 'number' && <NumberConfigEditor />}
```

### 2. Update Database Schema (if needed)

The `variable_defaults` field should already support this as it's JSONB. No schema changes needed!

### 3. Update API/Services

Ensure all places that handle `variable_defaults` preserve the `customComponent` field:
- Prompt creation API
- Prompt update API  
- Prompt duplication
- Variable import/export

### 4. Type Updates

Update other files that use `PromptVariable` to support the extended type:

**Files to check:**
- `features/prompts/components/PromptRunner.tsx`
- `features/prompts/components/modal/PromptRunnerModal.tsx`
- `features/prompts/components/PromptBuilder.tsx`

**Change:**
```typescript
// From:
export interface PromptVariable {
  name: string;
  defaultValue: string;
}

// To:
export interface PromptVariable {
  name: string;
  defaultValue: string;
  customComponent?: VariableCustomComponent;
}
```

## Benefits

1. **Better UX**: Users can select from dropdowns instead of typing
2. **Data consistency**: Predefined options reduce typos
3. **Flexibility**: Still allows manual text editing
4. **Extensibility**: Easy to add new component types
5. **Simple**: All components just return text - no complex state management

## Future Enhancements

Potential additions:
- **Date/Time picker** - Returns ISO date string
- **Color picker** - Returns hex color code
- **Code editor** - Syntax highlighting for code snippets
- **File selector** - Returns file path or content
- **Tag input** - Comma-separated tags
- **Slider** - Visual range selector
- **Multi-step wizard** - Complex multi-field inputs

