# Quick Start Guide - Integrated Resource System

## 🎉 What's Ready Now

The resource system is **fully integrated** into PromptInput! Users can now:

✅ Click Database icon to add resources  
✅ See resource chips above the textarea  
✅ Click chips to preview full content  
✅ Click X to remove resources  
✅ Paste images (Ctrl+V / Cmd+V)  
✅ View all resource types in preview sheet  

---

## 🚀 How to Use in Your Component

### Basic Usage (No Resources)

```tsx
import { PromptInput } from "@/features/prompts/components/PromptInput";

// Existing usage works exactly the same
<PromptInput
    variableDefaults={variables}
    onVariableValueChange={handleVariableChange}
    chatInput={input}
    onChatInputChange={setInput}
    onSendMessage={handleSend}
    // ... other props
/>
```

### With Resources (Add 3 Props)

```tsx
import { PromptInput } from "@/features/prompts/components/PromptInput";
import { type Resource } from "@/features/prompts/components/resource-display";
import { useState } from "react";

function MyComponent() {
    const [resources, setResources] = useState<Resource[]>([]);
    
    return (
        <PromptInput
            // ... existing props
            
            // Add these 3 props for resources:
            resources={resources}
            onResourcesChange={setResources}
            enablePasteImages={true}
            
            // Optional: customize upload location
            uploadBucket="userContent"
            uploadPath="my-custom-path"
        />
    );
}
```

### Access Resources on Submit

```tsx
const handleSendMessage = () => {
    const messageData = {
        content: chatInput,
        resources: resources,  // Array of all attached resources
        timestamp: new Date().toISOString()
    };
    
    // Send to your API
    console.log("Message with resources:", messageData);
    
    // Clear after sending
    setChatInput("");
    setResources([]);
};
```

---

## 📦 Resource Data Structures

Each resource in the array has this shape:

```typescript
type Resource = 
    | { type: "note"; data: { id, label, content, folder_name, tags } }
    | { type: "task"; data: { id, title, description, status, priority, due_date } }
    | { type: "project"; data: { id, name, tasks[] } }
    | { type: "file"; data: { url, type, details: { filename, size, ... } } }
    | { type: "table"; data: { type, table_id, table_name, row_id?, column_name? } }
    | { type: "webpage"; data: { url, title, textContent, charCount } }
```

---

## 🎨 What Users See

### 1. Resource Picker Button
- Database icon next to send button
- Click to open resource menu
- 7 resource types to choose from

### 2. Resource Chips
- Small colored chips above textarea
- Each chip shows resource name
- Click chip → Full preview
- Click X → Remove resource

### 3. Preview Sheet
- Slides in from right
- Shows full resource content
- Formatted based on resource type:
  - **Notes**: Full content, folder, tags
  - **Tasks**: Description, priority, due date, status
  - **Projects**: List of all tasks
  - **Tables**: Reference type, row/column info
  - **Webpage**: Full scraped content
  - **Files**: Uses existing FilePreviewSheet (images, PDFs, etc.)

### 4. Paste Images
- User pastes image (Ctrl+V / Cmd+V)
- Automatically uploads to Supabase
- Appears as file chip instantly
- No extra clicks needed!

---

## 🔥 Example: Complete Integration

```tsx
"use client";

import React, { useState } from "react";
import { PromptInput } from "@/features/prompts/components/PromptInput";
import type { Resource } from "@/features/prompts/components/resource-display";

export function MyPromptComponent() {
    const [input, setInput] = useState("");
    const [resources, setResources] = useState<Resource[]>([]);
    const [variables, setVariables] = useState([
        { name: "context", defaultValue: "" }
    ]);

    const handleSend = () => {
        if (!input.trim() && resources.length === 0) return;

        // Your message submission logic
        const message = {
            content: input,
            variables: variables,
            resources: resources,
            timestamp: new Date()
        };

        console.log("Sending:", message);

        // TODO: Send to your API
        // - Notes: resource.data.content is ready to use
        // - Tasks/Projects: resource.data has all the data
        // - Files: resource.data.url is ready to use
        // - Tables: Use resource.data reference to fetch actual data
        // - Webpage: resource.data.textContent is ready to use

        // Clear after sending
        setInput("");
        setResources([]);
    };

    return (
        <PromptInput
            variableDefaults={variables}
            onVariableValueChange={(name, value) => {
                setVariables(prev => 
                    prev.map(v => v.name === name ? { ...v, defaultValue: value } : v)
                );
            }}
            expandedVariable={null}
            onExpandedVariableChange={() => {}}
            chatInput={input}
            onChatInputChange={setInput}
            onSendMessage={handleSend}
            isTestingPrompt={false}
            submitOnEnter={true}
            onSubmitOnEnterChange={() => {}}
            messages={[]}
            
            // Resource props
            resources={resources}
            onResourcesChange={setResources}
            enablePasteImages={true}
            
            // UI customization
            showVariables={true}
            placeholder="Type your message..."
            sendButtonVariant="blue"
        />
    );
}
```

---

## 💡 Tips & Best Practices

### 1. State Management
- Store resources in parent component
- Pass down as props to PromptInput
- Access on message submission

### 2. Resource Validation
```typescript
const hasContent = input.trim() || resources.length > 0;
const canSend = hasContent && !isLoading;
```

### 3. Clear After Send
```typescript
const handleSend = async () => {
    await sendMessage({ content: input, resources });
    setInput("");
    setResources([]); // Important!
};
```

### 4. Resource Limits
```typescript
// Optional: Limit number of resources
const handleResourcesChange = (newResources: Resource[]) => {
    if (newResources.length <= 10) {
        setResources(newResources);
    } else {
        toast.error("Maximum 10 resources allowed");
    }
};
```

### 5. Auto-save Resources
```typescript
useEffect(() => {
    // Save to localStorage for recovery
    if (resources.length > 0) {
        localStorage.setItem('draft-resources', JSON.stringify(resources));
    }
}, [resources]);
```

---

## 🎯 What's Working NOW

| Feature | Status | Notes |
|---------|--------|-------|
| Resource Picker | ✅ Works | All 6 types available |
| Resource Chips | ✅ Works | Displays above textarea |
| Remove Resources | ✅ Works | Click X button |
| Preview Notes | ✅ Works | Shows full content |
| Preview Tasks | ✅ Works | Status, priority, dates |
| Preview Projects | ✅ Works | Lists all tasks |
| Preview Tables | ✅ Works | Shows reference info |
| Preview Webpage | ✅ Works | Full scraped content |
| Preview Files | ✅ Works | Uses FilePreviewSheet |
| Paste Images | ✅ Works | Auto-uploads on paste |
| File Upload | ✅ Works | Drag-drop or browse |
| Dark Mode | ✅ Works | Full theme support |

---

## 🔜 Optional Enhancements

These are NOT required but nice to have:

1. **Resource Count Badge**
```tsx
<ResourcePickerButton 
    badge={resources.length > 0 ? resources.length : undefined}
    onResourceSelected={handleResourceSelected}
/>
```

2. **Keyboard Shortcuts**
- Delete key to remove focused chip
- Cmd/Ctrl + K to open resource picker

3. **Drag to Reorder**
- Allow users to reorder resource chips

4. **Resource Templates**
- Save common resource combinations

5. **YouTube Videos** (Coming next)
- Add video transcript support

---

## 🎉 You're Done!

The system is **production-ready**! Just add the 3 props (`resources`, `onResourcesChange`, `enablePasteImages`) to your existing PromptInput and everything works! 🚀

