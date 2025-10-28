# Adding New Content Blocks

Quick reference for adding new interactive content blocks to the system.

## Prerequisites

- Understanding of React, TypeScript, and the existing codebase
- Familiarity with JSON streaming and markdown processing

## Step-by-Step Guide

### 1. Define Content Type

**File:** `lib/redux/slices/canvasSlice.ts`

Add your type to the `CanvasContentType` union:

```typescript
export type CanvasContentType = 
  | 'quiz'
  | 'your_new_type'  // Add here
  | ...
```

**File:** `types/canvas-social.ts`

Add to `CanvasType` for sharing support:

```typescript
export type CanvasType = 
  | 'quiz'
  | 'your_new_type'  // Add here
  | ...
```

### 2. Content Detection (JSON Streaming)

**File:** `components/mardown-display/markdown-classification/processors/utils/content-splitter.ts`

Add detection function (~line 700):

```typescript
const isYourTypeJson = (jsonContent: string): { isYourType: boolean; isComplete: boolean } => {
    const trimmed = jsonContent.trim();
    
    // Fast check: Must start with your wrapper key
    if (!trimmed.startsWith('{\n  "your_type"') && !trimmed.startsWith('{"your_type"')) {
        return { isYourType: false, isComplete: false };
    }
    
    // Brace counting for streaming resilience
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
        return { isYourType: true, isComplete: false };
    }
    
    const isLikelyComplete = trimmed.endsWith("}") && openBraces === closeBraces;
    
    if (isLikelyComplete) {
        try {
            const parsed = JSON.parse(trimmed);
            const hasYourType = parsed?.your_type?.required_field; // Validate structure
            return { isYourType: hasYourType, isComplete: true };
        } catch (error) {
            return { isYourType: true, isComplete: false };
        }
    }
    
    return { isYourType: true, isComplete: false };
};
```

Update `ContentBlock` type (~line 50):

```typescript
export type ContentBlock = 
  | { type: "your_type"; content: string; complete: boolean }
  | ...
```

Integrate detection in main processing loop (~line 900):

```typescript
// Check for your type
const yourTypeCheck = isYourTypeJson(jsonContent);
if (yourTypeCheck.isYourType) {
    blocks.push({
        type: "your_type",
        content: jsonContent,
        complete: yourTypeCheck.isComplete,
    });
    continue;
}
```

### 3. Create Block Component

**File:** `components/mardown-display/blocks/your-type/YourTypeBlock.tsx`

```typescript
"use client";

import React, { useState } from "react";
import ContentBlockWrapper from "../common/ContentBlockWrapper";
import { YourIcon } from "lucide-react";

interface YourTypeBlockProps {
    yourData: {
        your_type: {
            // Your data structure
            title: string;
            // ... other fields
        };
    };
}

const YourTypeBlock: React.FC<YourTypeBlockProps> = ({ yourData: initialData }) => {
    const [data, setData] = useState(initialData);
    
    // Handlers
    const handleDownload = () => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'your-type.json';
        a.click();
        URL.revokeObjectURL(url);
    };
    
    const handleUpload = async () => {
        // Upload implementation
    };
    
    // Custom actions (optional)
    const customActions = [
        {
            icon: YourIcon,
            tooltip: "Custom action",
            onClick: () => { /* action */ },
            className: "bg-blue-500 text-white hover:bg-blue-600"
        }
    ];
    
    return (
        <ContentBlockWrapper
            title={data.your_type.title}
            subtitle="Your subtitle"
            enableCanvas={true}
            canvasType="your_new_type"
            canvasData={data}
            canvasMetadata={{
                title: data.your_type.title,
                // ... other metadata
            }}
            onDownload={handleDownload}
            onUpload={handleUpload}
            customActions={customActions}
            allowFullscreen={true}
            className="my-4"
            contentClassName="max-w-4xl mx-auto"
        >
            {/* Your content rendering here */}
            <div className="space-y-4">
                {/* Implementation */}
            </div>
        </ContentBlockWrapper>
    );
};

export default YourTypeBlock;
```

### 4. Loading Visualization (Optional)

**File:** `components/mardown-display/blocks/your-type/YourTypeLoadingVisualization.tsx`

```typescript
"use client";

import React from "react";
import { YourIcon } from "lucide-react";
import { motion } from "framer-motion";

const YourTypeLoadingVisualization: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
                <YourIcon className="h-16 w-16 text-blue-500" />
            </motion.div>
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generating your content...
                </p>
                <div className="mt-2 h-1 w-48 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-500"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>
            </div>
        </div>
    );
};

export default YourTypeLoadingVisualization;
```

### 5. Integrate with Chat Markdown

**File:** `components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx`

Import your components (~line 30):

```typescript
import YourTypeBlock from "../blocks/your-type/YourTypeBlock";
import YourTypeLoadingVisualization from "../blocks/your-type/YourTypeLoadingVisualization";
```

Add render case in `renderBlock` function (~line 200):

```typescript
case "your_type":
    if (!block.complete) {
        return (
            <div key={index} className="my-4">
                <YourTypeLoadingVisualization />
            </div>
        );
    }
    try {
        const parsed = JSON.parse(block.content);
        return (
            <div key={index}>
                <YourTypeBlock yourData={parsed} />
            </div>
        );
    } catch (error) {
        console.error("Failed to parse your type:", error);
        return (
            <div key={index} className="my-4 p-4 border border-red-500 rounded">
                <p className="text-red-500">Failed to render content</p>
            </div>
        );
    }
```

### 6. Canvas Support

**File:** `components/layout/adaptive-layout/CanvasRenderer.tsx`

Import component (~line 35):

```typescript
import YourTypeComponent from "@/path/to/YourTypeComponent";
```

Add to title/subtitle helpers (~line 185):

```typescript
function getDefaultTitle(type: string): string {
  const titles: Record<string, string> = {
    your_new_type: 'Your Type',
    // ...
  };
  return titles[type] || 'Canvas View';
}

function getSubtitle(type: string): string | undefined {
  const subtitles: Record<string, string> = {
    your_new_type: 'Your description',
    // ...
  };
  return subtitles[type];
}
```

Add render case in `renderContent` (~line 320):

```typescript
case 'your_new_type':
  return (
    <div className="h-full p-4">
      <YourTypeComponent {...data.your_type} />
    </div>
  );
```

## AI Generation Guide Template

Create an AI generation guide for your content type:

**File:** `features/your-feature/AI_GENERATION_GUIDE.md`

```markdown
# AI Generation Guide: Your Type

## Output Format

```json
{
  "your_type": {
    "title": "...",
    "field1": "...",
    "field2": [...],
    // ... complete structure
  }
}
```

## Field Specifications

- `title`: (required) Brief, descriptive title
- `field1`: (required) Description
- ...

## Validation Rules

1. Rule 1
2. Rule 2
...

## Example

[Provide complete example]
```

## Testing Checklist

- [ ] JSON detection works during streaming
- [ ] Loading visualization displays correctly
- [ ] Complete content renders properly
- [ ] Download/Upload functionality works
- [ ] Canvas integration functional
- [ ] Fullscreen mode works
- [ ] Dark mode support
- [ ] Error handling tested
- [ ] Type safety verified

## Common Patterns

### Persistence Utilities

Create reusable download/upload utilities:

**File:** `features/your-feature/utils/persistence.ts`

```typescript
export function downloadYourType(data: YourTypeData) {
    const json = JSON.stringify({ your_type: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function uploadYourType(): Promise<YourTypeData> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const parsed = JSON.parse(e.target?.result as string);
                        resolve(parsed.your_type || parsed);
                    } catch {
                        reject(new Error('Invalid JSON'));
                    }
                };
                reader.readAsText(file);
            } else {
                reject(new Error('No file selected'));
            }
        };
        input.click();
    });
}
```

### Data Normalization

If AI output needs correction:

**File:** `features/your-feature/utils/normalizer.ts`

```typescript
export function normalizeYourType<T>(data: T): T {
    // Apply automatic corrections
    // Return normalized data
}
```

## File Structure Summary

```
features/your-feature/
├── components/
│   └── YourTypeComponent.tsx
├── utils/
│   ├── persistence.ts
│   ├── normalizer.ts
│   └── index.ts
├── types.ts
├── service.ts
└── AI_GENERATION_GUIDE.md

components/mardown-display/blocks/your-type/
├── YourTypeBlock.tsx
└── YourTypeLoadingVisualization.tsx
```

## Key Files to Modify

1. `lib/redux/slices/canvasSlice.ts` - Add type
2. `types/canvas-social.ts` - Add type
3. `content-splitter.ts` - Add detection
4. `EnhancedChatMarkdown.tsx` - Add rendering
5. `CanvasRenderer.tsx` - Add canvas support

## Notes

- **Streaming Resilience**: Use brace counting, not just `endsWith("}")`
- **Type Safety**: Always validate JSON structure before assuming fields exist
- **Error Handling**: Gracefully handle parse failures and missing data
- **Dark Mode**: Test all visual elements in both themes
- **Performance**: Avoid unnecessary re-renders with `useMemo` and `useCallback`

