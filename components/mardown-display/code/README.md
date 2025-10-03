# Code Editor Components

A collection of Monaco-based code editors with multi-file support.

## Components

### SmallCodeEditor

A fully-featured Monaco editor with formatting, copy, reset, word wrap, and minimap controls.

#### Features

- ✨ **Auto-format on mount** - Clean up code automatically
- 🪄 **Format button** - Format code with one click
- 📋 **Copy to clipboard** - Copy entire code easily
- 🔄 **Reset** - Revert to initial code
- 📝 **Word wrap toggle** - Toggle line wrapping
- 🗺️ **Minimap toggle** - Show/hide minimap
- 🎨 **Theme support** - Light/dark mode
- 📏 **Custom height** - Flexible sizing

#### Props

```typescript
interface CodeEditorProps {
    language?: string;                  // Default: "javascript"
    initialCode?: string;               // Default code content
    path?: string;                      // For multi-model support
    onChange?: (value: string | undefined) => void;
    runCode?: () => void;              // Optional run button
    mode?: "dark" | "light";
    showFormatButton?: boolean;         // Default: true
    showCopyButton?: boolean;           // Default: true
    showResetButton?: boolean;          // Default: true
    showWordWrapToggle?: boolean;       // Default: true
    showMinimapToggle?: boolean;        // Default: true
    autoFormat?: boolean;               // Default: false
    height?: string;                    // Custom height
}
```

#### Basic Usage

```tsx
import SmallCodeEditor from "@/components/mardown-display/code/SmallCodeEditor";

function MyComponent() {
    const [code, setCode] = useState("const x = 1;");
    
    return (
        <SmallCodeEditor
            language="javascript"
            initialCode={code}
            onChange={setCode}
            autoFormat={true}
        />
    );
}
```

#### Multi-Model Usage

When you provide a `path` prop, Monaco will maintain separate models for each path, preserving:
- Undo/redo history
- Cursor position
- Text selection
- Scroll position
- **Auto-syncs external content changes**: When `initialCode` changes, the editor model is automatically updated while preserving cursor position
- View state

```tsx
const [currentFile, setCurrentFile] = useState("app.js");

<SmallCodeEditor
    path={currentFile}                    // Unique identifier
    language="javascript"
    initialCode={files[currentFile]}
    onChange={(content) => updateFile(currentFile, content)}
/>
```

---

### MultiFileCodeEditor

A complete multi-file editor with file sidebar and tab management.

#### Features

- 📁 **File sidebar** - Visual file tree
- 🎨 **File icons** - Color-coded by type
- 🔄 **Model persistence** - Maintains editor state per file
- ✨ **Auto-format on open** - Format when switching files
- 📝 **Full Monaco features** - All SmallCodeEditor features

#### Props

```typescript
interface CodeFile {
    name: string;          // Display name
    path: string;          // Unique identifier (model key)
    language: string;      // Syntax highlighting language
    content: string;       // Initial content
    icon?: React.ReactNode; // Optional custom icon
}

interface MultiFileCodeEditorProps {
    files: CodeFile[];
    onChange?: (path: string, content: string) => void;
    onFileSelect?: (path: string) => void;
    runCode?: () => void;
    autoFormatOnOpen?: boolean;  // Default: false
    showSidebar?: boolean;       // Default: true
    height?: string;             // Default: "600px"
}
```

#### Usage Example

```tsx
import MultiFileCodeEditor, { CodeFile } from "@/components/mardown-display/code/MultiFileCodeEditor";

function MyEditor() {
    const files: CodeFile[] = [
        {
            name: "app.js",
            path: "src/app.js",
            language: "javascript",
            content: "console.log('Hello');"
        },
        {
            name: "styles.css",
            path: "src/styles.css",
            language: "css",
            content: ".container { padding: 20px; }"
        },
        {
            name: "index.html",
            path: "public/index.html",
            language: "html",
            content: "<!DOCTYPE html>..."
        }
    ];

    const handleChange = (path: string, content: string) => {
        console.log(`File ${path} changed:`, content);
        // Update your state/backend
    };

    return (
        <MultiFileCodeEditor
            files={files}
            onChange={handleChange}
            autoFormatOnOpen={true}
            height="700px"
        />
    );
}
```

---

### HtmlPageEditorExample

A complete example showing how to build an HTML page editor with separate CSS/HTML files and combined view.

See `HtmlPageEditor.example.tsx` for full implementation.

#### Key Features

- Separate HTML and CSS editing
- Auto-generated combined view
- Live preview iframe
- File switching with state persistence

---

## Monaco Multi-Model Architecture

### How It Works

Monaco Editor can manage multiple "models" (file buffers) simultaneously. Each model is identified by a unique URI/path:

```typescript
// Create/access model by path
<Editor path="src/app.js" ... />  // Model 1
<Editor path="src/utils.js" ... /> // Model 2
<Editor path="src/styles.css" ... /> // Model 3
```

When you change the `path` prop:
1. Monaco checks if a model exists for that path
2. If yes → loads existing model (with full state)
3. If no → creates new model with provided content

### Benefits

- **Zero Performance Cost**: Switching files is instant
- **Full State Preservation**: Undo history, cursor, selection all preserved
- **Memory Efficient**: Models are reused, not recreated
- **Scalable**: Support hundreds of files without issues

---

## Supported Languages

Monaco supports many languages out of the box:

### Web
- `html`, `css`, `scss`, `less`
- `javascript`, `typescript`, `json`

### Backend
- `python`, `ruby`, `php`, `go`, `rust`
- `java`, `csharp`, `cpp`, `c`

### Data
- `sql`, `yaml`, `xml`, `markdown`

### Other
- `shell`, `dockerfile`, `plaintext`

---

## Advanced Usage

### Custom File Icons

```tsx
import { Database, Code } from "lucide-react";

const files: CodeFile[] = [
    {
        name: "schema.sql",
        path: "db/schema.sql",
        language: "sql",
        content: "CREATE TABLE users...",
        icon: <Database className="h-4 w-4 text-purple-500" />
    },
    {
        name: "api.ts",
        path: "src/api.ts",
        language: "typescript",
        content: "export function api() {}",
        icon: <Code className="h-4 w-4 text-blue-500" />
    }
];
```

### Programmatic Formatting

```tsx
const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

// Format current content
const formatCode = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
};

// In your component
<SmallCodeEditor
    onMount={(editor) => {
        editorRef.current = editor;
    }}
    ...
/>
```

### Dynamic File Loading

```tsx
function DynamicEditor() {
    const [files, setFiles] = useState<CodeFile[]>([]);
    
    useEffect(() => {
        // Load files from API
        fetch('/api/files')
            .then(res => res.json())
            .then(data => setFiles(data));
    }, []);
    
    return <MultiFileCodeEditor files={files} />;
}
```

---

## Integration Examples

### With HTML Pages Feature

```tsx
import MultiFileCodeEditor from "@/components/mardown-display/code/MultiFileCodeEditor";
import { useHtmlPreviewState } from "@/features/html-pages/components/useHtmlPreviewState";

function HtmlEditorTab({ htmlContent, cssContent }: Props) {
    const files: CodeFile[] = [
        { name: "index.html", path: "index.html", language: "html", content: htmlContent },
        { name: "styles.css", path: "styles.css", language: "css", content: cssContent },
    ];
    
    return <MultiFileCodeEditor files={files} onChange={handleChange} />;
}
```

### User Codebase Support (Future)

```tsx
function UserCodebaseEditor({ userId }: { userId: string }) {
    const { files } = useUserFiles(userId);
    
    return (
        <MultiFileCodeEditor
            files={files}
            onChange={(path, content) => saveFile(userId, path, content)}
            onFileSelect={(path) => trackFileView(path)}
        />
    );
}
```

---

## Keyboard Shortcuts

Monaco Editor supports many built-in shortcuts:

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Format Document | Shift+Alt+F | Shift+Option+F |
| Find | Ctrl+F | Cmd+F |
| Replace | Ctrl+H | Cmd+Option+F |
| Go to Line | Ctrl+G | Cmd+G |
| Toggle Word Wrap | Alt+Z | Option+Z |
| Command Palette | F1 | F1 |
| Multi-cursor | Ctrl+Alt+↑/↓ | Cmd+Option+↑/↓ |

---

## Best Practices

1. **Always provide unique paths** for multi-file editing
2. **Use `autoFormat`** for AI-generated or pasted code
3. **Set appropriate height** for your use case
4. **Handle onChange** to persist changes
5. **Use proper language names** for syntax highlighting
6. **Consider minimap** for larger files only

---

## Troubleshooting

### Auto-format not working
- Ensure the language supports formatting (JavaScript, TypeScript, HTML, CSS, JSON)
- Wait for initial mount (auto-format has 300ms delay)
- Check console for errors

### Files not switching properly
- Make sure each file has a unique `path`
- Verify `path` prop is actually changing
- Check that `files` array is stable (use `useMemo` if needed)

### Performance issues
- Use `showMinimapToggle={false}` for many small files
- Consider lazy loading files if you have 100+
- Use `React.memo` for the MultiFileCodeEditor

---

## Future Enhancements

- [ ] File creation/deletion UI
- [ ] Folder structure support
- [ ] Search across all files
- [ ] Git diff view
- [ ] Collaborative editing
- [ ] File upload/download
- [ ] Syntax error indicators in file list

