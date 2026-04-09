# Constraints Editor Tab -- UI Spec

> **Location:** New tab in `features/ai-models/components/AiModelDetailPanel.tsx`
> **Component:** `features/ai-models/components/ConstraintsEditor.tsx` (new file)
> **Pattern to follow:** `ControlsEditor.tsx` in the same directory -- hybrid structured + raw JSON editor

---

## Overview

The Constraints Editor provides a UI-driven way to create, edit, and delete declarative validation constraints on an AI model record. Constraints are stored in the `ai_model.constraints` JSONB column and evaluated at runtime by the validation engine against agent settings.

---

## Data Shape

There are two kinds of constraints. Both share `id`, `severity`, and `message`.

### Unconditional -- single-field checks that always apply

```typescript
type UnconditionalConstraint = {
  id: string;
  rule: "required" | "fixed" | "min" | "max" | "one_of" | "forbidden";
  field: string;
  value?: unknown;
  severity: "error" | "warning" | "info";
  message: string;
};
```

### Conditional -- "require X when Y is true"

```typescript
type ConditionOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "exists" | "not_exists";

type FieldCondition = {
  field: string;
  op: ConditionOp;
  value?: unknown;       // not needed for exists/not_exists
};

type ConditionalConstraint = {
  id: string;
  when: FieldCondition;
  require: FieldCondition;
  severity: "error" | "warning" | "info";
  message: string;
};
```

### Union

```typescript
type ModelConstraint = UnconditionalConstraint | ConditionalConstraint;
```

Discriminated by the presence of `when` + `require` (conditional) vs `rule` + `field` (unconditional).

---

## Rule Reference

### Unconditional rules

| Rule | Value Type | Description | Example |
|------|-----------|-------------|---------|
| `required` | *(none)* | Field must be present and non-null | `{ id: "req-stream", rule: "required", field: "stream", severity: "error", message: "Stream is required" }` |
| `fixed` | `boolean \| number \| string` | Field must equal exactly this value | `{ id: "fix-stream", rule: "fixed", field: "stream", value: true, severity: "error", message: "Stream must be enabled" }` |
| `min` | `number` | Numeric minimum (inclusive) | `{ id: "min-temp", rule: "min", field: "temperature", value: 0, severity: "error", message: "Temperature minimum is 0" }` |
| `max` | `number` | Numeric maximum (inclusive) | `{ id: "max-tokens", rule: "max", field: "max_output_tokens", value: 8192, severity: "warning", message: "Token limit is 8192" }` |
| `one_of` | `array` | Value must be in the list | `{ id: "fmt-opts", rule: "one_of", field: "response_format", value: ["text","json_object"], severity: "error", message: "Only text or json_object supported" }` |
| `forbidden` | *(none)* | Field must not be set | `{ id: "no-topk", rule: "forbidden", field: "top_k", severity: "warning", message: "top_k not supported" }` |

### Conditional operators

| Op | Meaning | Value type |
|----|---------|------------|
| `eq` | Equals | any |
| `neq` | Not equals | any |
| `gt` | Greater than | number |
| `gte` | Greater than or equal | number |
| `lt` | Less than | number |
| `lte` | Less than or equal | number |
| `in` | Value is in array | array |
| `not_in` | Value is not in array | array |
| `exists` | Field is present and non-null | *(none)* |
| `not_exists` | Field is absent or null | *(none)* |

### Conditional example

```json
{
  "id": "anthropic-stream-required-for-high-max-tokens",
  "when": { "field": "max_output_tokens", "op": "gt", "value": 8192 },
  "require": { "field": "stream", "op": "eq", "value": true },
  "severity": "error",
  "message": "Anthropic requires stream: true when max_output_tokens exceeds 8,192"
}
```

---

## UI Layout

### Tab trigger

Add between "Controls" and "Pricing" in `AiModelDetailPanel`:

```tsx
<TabsTrigger value="constraints" className="... (same style as siblings)">
    Constraints
    {(model?.constraints?.length ?? 0) > 0 && (
        <Badge variant="outline" className="ml-1.5 text-xs h-4 px-1">
            {model!.constraints!.length}
        </Badge>
    )}
</TabsTrigger>
```

### Tab content

```
+------------------------------------------------------------+
|  [+ Add Simple]  [+ Add Conditional]        [Raw JSON <->] |  <- toolbar
+------------------------------------------------------------+
|                                                            |
|  +-- Simple Constraint --------------------------------+   |
|  |  ID: [ req-stream                               ]  |   |
|  |  Rule: [ required       v]   Field: [ stream  v ]  |   |
|  |  Value: (hidden -- not applicable for "required")   |   |
|  |  Severity: [ error  v]                              |   |
|  |  Message: [ Stream is required for this model     ] |   |
|  |                                        [X Delete]   |   |
|  +-----------------------------------------------------+   |
|                                                            |
|  +-- Conditional Constraint ----------------------------+   |
|  |  ID: [ anthropic-stream-required-for-high-max-to  ] |   |
|  |                                                     |   |
|  |  WHEN:                                              |   |
|  |    Field: [ max_output_tokens  v]                   |   |
|  |    Op:    [ gt                 v]                   |   |
|  |    Value: [ 8192                ]                   |   |
|  |                                                     |   |
|  |  REQUIRE:                                           |   |
|  |    Field: [ stream             v]                   |   |
|  |    Op:    [ eq                 v]                   |   |
|  |    Value: [ true                ]                   |   |
|  |                                                     |   |
|  |  Severity: [ error  v]                              |   |
|  |  Message: [ Anthropic requires stream: true wh... ] |   |
|  |                                        [X Delete]   |   |
|  +-----------------------------------------------------+   |
|                                                            |
|                                     [Save Constraints]     |
+------------------------------------------------------------+
```

### Raw JSON toggle

`[Raw JSON <->]` toggles between the structured card editor and `EnhancedEditableJsonViewer`. Same pattern as `ControlsEditor.tsx` (`Code2`/`Table2` icon toggle).

---

## Dynamic inputs

### Simple constraint value input by rule

| Rule | Input | Notes |
|------|-------|-------|
| `required` | Hidden | No value needed |
| `forbidden` | Hidden | No value needed |
| `fixed` | Auto-detect: Switch for booleans, number Input for numbers, text Input for strings | Infer from the field's known control type if available |
| `min` | Number Input | |
| `max` | Number Input | |
| `one_of` | Tag/chip input (type + Enter to add, click to remove) | Display as removable badges |

### Conditional value input by op

| Op | Input | Notes |
|----|-------|-------|
| `exists` | Hidden | No value needed |
| `not_exists` | Hidden | No value needed |
| `eq` / `neq` | Auto-detect by field's known type (boolean Switch, number Input, string Input) | |
| `gt` / `gte` / `lt` / `lte` | Number Input | |
| `in` / `not_in` | Tag/chip input | |

---

## Field selection

All "Field" dropdowns should be comboboxes that:
1. Show keys from `KNOWN_CONTROLS` (from `ControlsEditor.tsx`) as suggestions with their labels
2. Allow typing arbitrary keys (not limited to known controls)

---

## Component interface

```typescript
interface ConstraintsEditorProps {
    constraints: ModelConstraint[] | null;
    onSave: (constraints: ModelConstraint[]) => Promise<void>;
}
```

---

## Save behavior

Same pattern as `ControlsEditor` and `ModelPricingEditor`:
- Local state tracks edits
- "Save Constraints" calls `onSave(constraints)` -> `aiModelService.update(model.id, { constraints })`
- Saved flash indicator on success

---

## Wiring in AiModelDetailPanel

```tsx
<TabsContent value="constraints" className="flex-1 m-0 overflow-auto p-3 min-h-0">
    <ConstraintsEditor
        constraints={model?.constraints ?? null}
        onSave={async (constraints) => {
            if (!model) return;
            const updated = await aiModelService.update(model.id, { constraints });
            onSaved(updated);
        }}
    />
</TabsContent>
```

---

## Files to create/modify

| File | Action |
|------|--------|
| `features/ai-models/components/ConstraintsEditor.tsx` | **CREATE** |
| `features/ai-models/components/AiModelDetailPanel.tsx` | **MODIFY** -- add tab trigger + tab content |

## Imports

- Types: `ModelConstraint`, `UnconditionalConstraint`, `ConditionalConstraint`, `ConditionOp`, `UnconditionalRule`, `isConditionalConstraint` from `../types`
- `EnhancedEditableJsonViewer` from `@/components/ui/JsonComponents/JsonEditor`
- `Badge`, `Button`, `Input`, `Select`, `Switch`, `Label`, `Separator` from `@/components/ui`
- `Plus`, `Trash2`, `Code2`, `Table2` from `lucide-react`
- `KNOWN_CONTROLS` from `ControlsEditor` (export if not already exported, or duplicate the key list)

## Existing patterns to reference

- `ControlsEditor.tsx` -- structured + raw JSON toggle, known keys catalog, per-item card layout, save button
- `ModelPricingEditor.tsx` -- add/remove rows, local state, save callback pattern
