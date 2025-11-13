# Unified Context Menu

**The ultimate 3-in-1 right-click menu** for your entire application!

## What It Combines

1. **Content Blocks** - Insert pre-defined text templates
2. **AI Tools** - Database-driven AI prompts for text manipulation  
3. **Quick Actions** - Fast access to Notes, Tasks, Chat, Data, Files

---

## Usage

### Basic Example (Textarea)

```tsx
import { UnifiedContextMenu } from '@/components/unified';

<UnifiedContextMenu
  getTextarea={() => document.querySelector('textarea')}
  uiContext={{ context: textContent }}
  isEditable={true}
  onTextReplace={(newText) => handleReplace(newText)}
  onTextInsertBefore={(text) => handleInsert('before', text)}
  onTextInsertAfter={(text) => handleInsert('after', text)}
>
  <textarea value={content} onChange={setContent} />
</UnifiedContextMenu>
```

### Rich Text Editor

```tsx
<UnifiedContextMenu
  editorId="my-editor"
  uiContext={{ context: editorContent }}
  onContentInserted={() => console.log('Content added!')}
>
  <RichTextEditor id="my-editor" />
</UnifiedContextMenu>
```

### Read-Only Display Text

```tsx
<UnifiedContextMenu
  uiContext={{ context: pageContent }}
  enableContentBlocks={false} // Hide content blocks for read-only
>
  <div className="article-content">
    {pageContent}
  </div>
</UnifiedContextMenu>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Element to wrap with context menu |
| `editorId` | `string` | - | For rich text editors (uses `insertTextAtCursor`) |
| `getTextarea` | `() => HTMLTextAreaElement \| null` | - | For textareas (uses `insertTextAtTextareaCursor`) |
| `uiContext` | `UIContext` | `{}` | Context for AI Tools (selection, content, etc.) |
| `onContentInserted` | `() => void` | - | Callback after content block inserted |
| `onTextReplace` | `(newText: string) => void` | - | Callback to replace selected text |
| `onTextInsertBefore` | `(text: string) => void` | - | Callback to insert before selection |
| `onTextInsertAfter` | `(text: string) => void` | - | Callback to insert after selection |
| `isEditable` | `boolean` | `false` | Enable replace/insert modals for AI Tools |
| `enableContentBlocks` | `boolean` | `true` | Show/hide Content Blocks section |
| `enableAITools` | `boolean` | `true` | Show/hide AI Tools section |
| `enableQuickActions` | `boolean` | `true` | Show/hide Quick Actions section |
| `className` | `string` | - | Additional CSS classes |

---

## Features

### 📝 Content Blocks
- **Structure**: Headings, lists, paragraphs
- **Formatting**: Code blocks, quotes, dividers
- **Special**: Tables, dates, timestamps, notes
- Dynamically loaded from database or config

### ✨ AI Tools  
- **Text Manipulation**: Explain, expand, summarize, translate
- **Code Actions**: Fix linter errors, refactor, document
- **Custom**: Database-driven system prompts
- Automatically resolves variables from UI context
- Debug modal (enable debug mode in admin settings)

### ⚡ Quick Actions
- **Notes**: Quick note capture sheet
- **Tasks**: Task management sheet
- **Chat**: AI conversation assistant
- **Data**: User-generated table viewer
- **Files**: File browser and uploader

---

## Menu Structure

```
Right-Click Menu
├── Content Blocks
│   ├── Structure
│   ├── Formatting
│   └── Special
├── AI Tools
│   ├── Text Actions
│   ├── Code Actions
│   └── Explanations
└── Quick Actions
    ├── Notes
    ├── Tasks
    ├── Chat
    ├── Data
    └── Files
```

---

## Non-Breaking Integration

The UnifiedContextMenu **does NOT replace** existing menus. It's an additional option:

- `EditorContextMenu` - Still works for rich text editors only
- `PromptEditorContextMenu` - Still works for prompt editor textareas
- `DynamicContextMenu` - Still works for AI Tools only
- `UnifiedContextMenu` - **NEW!** Combines all three

Use whichever fits your needs.

---

## Advanced: Conditional Sections

```tsx
// Only show AI Tools and Quick Actions (hide Content Blocks)
<UnifiedContextMenu
  enableContentBlocks={false}
  enableAITools={true}
  enableQuickActions={true}
  uiContext={{ context: readOnlyText }}
>
  <div>{readOnlyText}</div>
</UnifiedContextMenu>

// Only show Content Blocks (for simple templates)
<UnifiedContextMenu
  enableContentBlocks={true}
  enableAITools={false}
  enableQuickActions={false}
  editorId="simple-editor"
>
  <Editor id="simple-editor" />
</UnifiedContextMenu>
```

---

## App-Wide Integration

To make this available everywhere:

1. **Wrap your main layout**:
```tsx
// app/(authenticated)/layout.tsx
import { UnifiedContextMenu } from '@/components/unified';

export default function Layout({ children }) {
  return (
    <UnifiedContextMenu uiContext={{ context: 'app-wide' }}>
      {children}
    </UnifiedContextMenu>
  );
}
```

2. **Or wrap specific sections**:
```tsx
<UnifiedContextMenu uiContext={{ context: pageContent }}>
  <main className="container">
    {/* All text in here gets the unified menu */}
    {pageContent}
  </main>
</UnifiedContextMenu>
```

---

## For Replace/Insert to Work

You MUST provide:
1. `isEditable={true}`
2. `onTextReplace` callback
3. `onTextInsertBefore` and/or `onTextInsertAfter` callbacks

Example:
```tsx
const [content, setContent] = useState('');

<UnifiedContextMenu
  getTextarea={() => document.querySelector('textarea')}
  uiContext={{ context: content }}
  isEditable={true}
  onTextReplace={(newText) => {
    const textarea = document.querySelector('textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    setContent(before + newText + after);
  }}
  onTextInsertBefore={(text) => {
    const textarea = document.querySelector('textarea');
    const pos = textarea.selectionStart;
    setContent(content.substring(0, pos) + text + '\n\n' + content.substring(pos));
  }}
  onTextInsertAfter={(text) => {
    const textarea = document.querySelector('textarea');
    const pos = textarea.selectionEnd;
    setContent(content.substring(0, pos) + '\n\n' + text + content.substring(pos));
  }}
>
  <textarea value={content} onChange={(e) => setContent(e.target.value)} />
</UnifiedContextMenu>
```

---

## Demo

Visit: **http://localhost:3000/ai/prompts/experimental/execution-demo**

Tab: **"Text Editor"** - Shows the unified menu with all three sections working together!

---

**Status**: ✅ Production ready - No breaking changes to existing menus

