# JSON Editor Component

## Imports
```typescript
import { BaseJsonEditor, JsonEditorWithFormatting, FullJsonEditor } from '@/components/ui/JsonEditor';
```

## Components and Props

### BaseJsonEditor
```typescript
interface BaseJsonEditorProps {
  initialData: string;
  onJsonChange?: (data: string) => void;
  validateDelay?: number; // Default: 500ms
  // ... extends TextareaHTMLAttributes<HTMLTextAreaElement>
}
```

### JsonEditorWithFormatting
Extends `BaseJsonEditorProps` with:
```typescript
interface JsonEditorWithFormattingProps {
  onFormat?: () => void;
}
```

### FullJsonEditor
Extends `JsonEditorWithFormattingProps` with:
```typescript
interface FullJsonEditorProps {
  onSave?: (data: string) => void;
  title?: string; // Default: "JSON Editor"
}
```

## Usage

```tsx
<BaseJsonEditor initialData={jsonString} onJsonChange={handleChange} />

<JsonEditorWithFormatting 
  initialData={jsonString} 
  onJsonChange={handleChange}
  onFormat={handleFormat}
/>

<FullJsonEditor
  initialData={jsonString}
  onJsonChange={handleChange}
  onFormat={handleFormat}
  onSave={handleSave}
  title="Custom JSON Editor"
/>

<FullJsonEditor
    initialData={jsonString}
    onJsonChange={handleChange}
    onFormat={handleFormat}
    onSave={handleSave}
    title="Custom JSON Editor"
    className={cn("custom-class", isSpecial && "special-class")}
/>
```

## Notes
- Uses Zod for JSON validation
- Includes real-time validation with customizable delay
- FullJsonEditor provides formatting and save functionality
- Styling uses Tailwind classes and shadcn/ui components
- All support className prop class merging using cn utility 
