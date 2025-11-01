# Complete Resource System Documentation

## 🎉 What We Built

A comprehensive, unified resource management system for the PromptInput component that allows users to attach and reference multiple types of content including notes, tasks, files, tables, and webpage content.

---

## 📦 Components Overview

### 1. Resource Pickers (7 Total)

All pickers follow the same 400px height, space-efficient design pattern:

| Picker | Status | Description |
|--------|--------|-------------|
| **NotesResourcePicker** | ✅ Complete | Browse folders, search notes, view tags |
| **TasksResourcePicker** | ✅ Complete | Select tasks or entire projects with priorities |
| **FilesResourcePicker** | ✅ Complete | Browse Supabase storage buckets (existing files) |
| **TablesResourcePicker** | ✅ Complete | 4 modes: full table/row/column/cell |
| **WebpageResourcePicker** | ✅ Complete | Scrape URL content with preview modal |
| **UploadResourcePicker** | ✅ Complete | Drag-drop or browse to upload new files |
| **BrokersResourcePicker** | ⏳ Pending | Coming soon |

### 2. Resource Display

**ResourceChips Component**
- Universal chip display for ALL resource types
- Color-coded by resource type
- Hover states
- Click for preview (ready for full sheet implementation)
- Remove functionality
- Animated with Framer Motion
- Displays inside PromptInput container

### 3. Paste Image Support

- Automatic clipboard detection
- Upload on paste (Ctrl+V / Cmd+V)
- Integrates with file upload system
- Uploads to Supabase storage

---

## 🎨 Resource Types & Visual Design

Each resource type has unique styling:

```typescript
type Resource = 
    | { type: "note"; data: Note }          // 🟠 Orange
    | { type: "task"; data: Task }          // 🔵 Blue  
    | { type: "project"; data: Project }    // 🟣 Purple
    | { type: "file"; data: FileData }      // ⚫ Gray (varies by file type)
    | { type: "table"; data: TableRef }     // 🟢 Green
    | { type: "webpage"; data: WebContent } // 🔷 Teal
```

---

## 🚀 Quick Start Guide

### Basic Integration

```tsx
import { useState } from "react";
import { ResourcePickerButton } from "./resource-picker";
import { ResourceChips, type Resource } from "./resource-display";

function MyPromptInput() {
    const [resources, setResources] = useState<Resource[]>([]);

    return (
        <div>
            {/* Display resources as chips */}
            <ResourceChips
                resources={resources}
                onRemove={(index) => setResources(prev => 
                    prev.filter((_, i) => i !== index)
                )}
            />

            {/* Textarea here */}

            {/* Resource picker button */}
            <ResourcePickerButton
                onResourceSelected={(resource) => 
                    setResources(prev => [...prev, resource])
                }
            />
        </div>
    );
}
```

### With Paste Support

```tsx
import { useRef, useCallback } from "react";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";

function MyPromptInputWithPaste() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(
        "userContent",
        "prompt-attachments"
    );

    const handlePasteImage = useCallback(async (file: File) => {
        const results = await uploadMultipleToPrivateUserAssets([file]);
        if (results?.[0]) {
            setResources(prev => [...prev, { 
                type: "file", 
                data: results[0] 
            }]);
        }
    }, []);

    useClipboardPaste({
        textareaRef,
        onPasteImage: handlePasteImage,
        disabled: false
    });

    return <textarea ref={textareaRef} />;
}
```

---

## 📋 Complete Example

See `INTEGRATION_EXAMPLE.tsx` for a full working example with:
- ✅ Resource state management
- ✅ Paste image support
- ✅ Resource display inside PromptInput
- ✅ Resource removal
- ✅ Message submission with resources
- ✅ Debug output

---

## 🔍 Resource Data Structures

### Notes
```typescript
{
  type: "note",
  data: {
    id: string,
    label: string,
    content: string,
    folder_name: string,
    tags: string[]
  }
}
```

### Tasks
```typescript
{
  type: "task",
  data: {
    id: string,
    title: string,
    description: string,
    status: 'incomplete' | 'completed',
    priority: 'low' | 'medium' | 'high',
    due_date: string
  }
}
```

### Projects
```typescript
{
  type: "project",
  data: {
    id: string,
    name: string,
    tasks: Task[]
  }
}
```

### Files
```typescript
{
  type: "file",
  data: {
    url: string,
    type: string,
    details?: {
      filename: string,
      extension: string,
      size: number,
      icon: LucideIcon,
      color: string
    }
  }
}
```

### Tables
```typescript
{
  type: "table",
  data: {
    type: 'full_table' | 'table_row' | 'table_column' | 'table_cell',
    table_id: string,
    table_name: string,
    row_id?: string,
    column_name?: string,
    description: string
  }
}
```

### Webpage
```typescript
{
  type: "webpage",
  data: {
    url: string,
    title: string,
    textContent: string,
    charCount: number,
    scrapedAt: string
  }
}
```

---

## 🎯 Message Submission Example

```typescript
function handleSendMessage() {
    const messageData = {
        content: chatInput,
        resources: resources.map(resource => ({
            type: resource.type,
            // Process based on type
            ...(resource.type === "note" && {
                content: resource.data.content,
                note_id: resource.data.id
            }),
            ...(resource.type === "file" && {
                url: resource.data.url,
                filename: resource.data.details?.filename
            }),
            ...(resource.type === "webpage" && {
                url: resource.data.url,
                content: resource.data.textContent
            }),
            ...(resource.type === "table" && {
                table_reference: resource.data
            })
        })),
        timestamp: new Date().toISOString()
    };

    // Send to your API
    await sendMessage(messageData);
}
```

---

## 📊 Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Notes Selection | ✅ | Folders, search, tags |
| Task Selection | ✅ | Individual or project |
| File Storage Browse | ✅ | Recursive tree, signed URLs |
| File Upload | ✅ | Drag-drop, browse, paste |
| Table References | ✅ | 4 selection modes |
| Webpage Scraping | ✅ | With preview modal |
| Resource Chips Display | ✅ | Universal, color-coded |
| Paste Image Support | ✅ | Automatic upload |
| Remove Resources | ✅ | Click X button |
| Preview on Hover | 🚧 | Basic (expand for full) |
| Full Preview Sheet | ⏳ | TODO |
| YouTube Videos | ⏳ | TODO |
| Brokers | ⏳ | TODO |

---

## 🔄 Next Steps

### Immediate TODOs:

1. **Create ResourcePreviewSheet Component**
   - Like `FilePreviewSheet` but handles all resource types
   - Show full note content
   - Show complete task/project details
   - Show table data preview
   - Show webpage content
   - Use existing file preview for files

2. **Add YouTube Video Support**
   - Create YouTubeResourcePicker
   - Extract video ID
   - Fetch transcript if available
   - Show thumbnail in chips

3. **Implement Brokers**
   - Define broker structure
   - Create BrokersResourcePicker
   - Integration logic

4. **Enhanced Features**
   - Drag to reorder resources
   - Resource count badge on picker button
   - Keyboard shortcuts (Del to remove, etc.)
   - Undo/redo resource actions

---

## 🎨 Design Principles

All components follow these principles:

1. **Space Efficiency** - 9px-12px fonts, minimal padding
2. **Consistent Height** - 400px for all pickers
3. **Color Coding** - Unique colors per resource type
4. **Dark Mode** - Full theme support
5. **Loading States** - Spinners and progress indicators
6. **Error Handling** - User-friendly error messages
7. **Search** - Real-time search in all pickers
8. **Navigation** - Back button through all levels

---

## 📦 File Structure

```
features/prompts/components/
├── resource-picker/
│   ├── NotesResourcePicker.tsx       ✅
│   ├── TasksResourcePicker.tsx       ✅
│   ├── FilesResourcePicker.tsx       ✅
│   ├── TablesResourcePicker.tsx      ✅
│   ├── WebpageResourcePicker.tsx     ✅
│   ├── UploadResourcePicker.tsx      ✅
│   ├── ResourcePickerButton.tsx      ✅
│   ├── ResourcePickerMenu.tsx        ✅
│   └── index.ts                      ✅
│
├── resource-display/
│   ├── ResourceChips.tsx             ✅
│   └── index.ts                      ✅
│
├── INTEGRATION_EXAMPLE.tsx           ✅
└── RESOURCE_SYSTEM_README.md         ✅ (this file)
```

---

## 🎉 Summary

You now have a **complete, production-ready resource management system** that:

- ✅ Supports 6 resource types (7 with brokers)
- ✅ Unified, elegant UI/UX
- ✅ Paste image support
- ✅ File upload with drag-drop
- ✅ Color-coded visual system
- ✅ Type-safe TypeScript
- ✅ Dark mode support
- ✅ Mobile responsive
- ✅ Clean, maintainable code

Just integrate the chips display into your PromptInput and you're ready to go! 🚀

