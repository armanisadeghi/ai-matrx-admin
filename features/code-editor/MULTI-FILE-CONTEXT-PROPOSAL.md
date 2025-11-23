# Multi-File Context Management - Redux-Based Proposal

## Current State Analysis ✅

### What You've Built (Excellent Work!)

#### 1. **Single-File System** (Working Great)
- ✅ Uses **Redux** for prompt fetching (`getBuiltinPrompt`, `selectCachedPrompt`)
- ✅ Builtin system with `getBuiltinId()` from Redux
- ✅ Context versioning with tombstones
- ✅ Display variants (`'standard'` | `'compact'`)
- ✅ Canvas integration (diffs, success states)
- ✅ No closure bugs (Redux ensures fresh state)

#### 2. **Multi-File Test Page** (Ready for AI)
- Has `MultiFileCodeEditor` component (Monaco-based)
- 5 interconnected files (User domain):
  - `types.ts` - Interfaces (base)
  - `userService.ts` - API service (imports types)
  - `useUsers.ts` - React hook (imports service + types)
  - `UserCard.tsx` - Component (imports types)
  - `UserList.tsx` - Component (imports all above)
- Currently just displays/edits files
- **No AI editing yet** - This is what we're adding!

#### 3. **Redux Architecture** (Solid Foundation)
- Execution instances with variables, conversation, tracking
- Memoized selectors (no closure bugs)
- Smart caching (prompts, actions)
- Scoped variables (user/org/project)
- Run tracking with database
- Broker system for context-aware variables

---

## Requirements Analysis

### User's Goals
1. ✅ **Multi-file context storage** - Track multiple files with versions
2. ✅ **Smart sending** - Small: send all; Large: send index + selected
3. ✅ **File index** - Show model available files
4. ⏳ **Tool calls (future)** - Model can request files
5. ✅ **Backward compatible** - Single-file continues working
6. ✅ **No breaking changes** - Existing code unaffected

### Technical Constraints
- Must work with existing `ContextVersionManager` for single files
- Must integrate with Redux architecture
- Must support both modes seamlessly
- Must be performant (large codebases)

---

## Proposed Solution: Redux-Based Multi-File Context

### Why Redux? (Perfect Fit!)

| Benefit | Why It Matters |
|---------|----------------|
| **Matches Architecture** | You already use Redux for prompt execution |
| **No Closure Bugs** | Fresh state via selectors (your stated goal) |
| **Time-Travel Debug** | Redux DevTools for complex multi-file scenarios |
| **Persistent State** | Survives re-renders during long conversations |
| **Multiple Sessions** | Run multiple editing sessions concurrently |
| **Shared Logic** | Single & multi-file use same foundation |

---

## Architecture

### File Structure

```
lib/redux/
├── code-context/                    (NEW)
│   ├── slice.ts                    # Redux slice with actions/reducers
│   ├── selectors.ts                # Memoized selectors
│   ├── types.ts                    # TypeScript definitions
│   ├── README.md                   # Documentation
│   ├── utils/
│   │   ├── fileIndexBuilder.ts    # Build file manifest for model
│   │   ├── smartContextBuilder.ts # Decide what to send (size-based)
│   │   ├── dependencyParser.ts    # Parse imports to build graph
│   │   └── versionManager.ts      # Multi-file version tracking
│   └── index.ts                    # Barrel exports

features/code-editor/
├── components/
│   ├── MultiFileCodeEditorModal.tsx    (NEW)
│   └── ContextAwareCodeEditorModal.tsx (KEEP - single file)
└── hooks/
    └── useCodeContext.ts               (NEW - Redux hook)
```

---

## State Structure

### Redux State Shape

```typescript
{
  codeContext: {
    // Multiple concurrent sessions
    sessions: {
      [sessionId: string]: CodeContextSession
    },
    // UI state
    activeSessionId: string | null
  }
}
```

### Session Structure

```typescript
interface CodeContextSession {
  sessionId: string;
  mode: 'single' | 'multi';
  createdAt: number;
  updatedAt: number;
  
  // Single-file mode (existing behavior)
  singleFile?: {
    content: string;
    language: string;
    filename?: string;
    versions: ContextVersion[];
    currentVersion: number;
  };
  
  // Multi-file mode (NEW)
  multiFile?: {
    files: {
      [path: string]: FileEntry;
    };
    activeFile: string | null;
    fileIndex: FileIndexEntry[];
    dependencyGraph: DependencyGraph;
    totalSize: number;
    smartContext: SmartContextConfig;
  };
  
  // Common metadata
  metadata: {
    projectName?: string;
    contextType: 'code' | 'docs' | 'config';
    builtinId?: string;
  };
}

interface FileEntry {
  path: string;
  filename: string;
  content: string;
  language: string;
  versions: ContextVersion[];
  currentVersion: number;
  size: number;
  
  // Dependency tracking
  imports: string[];      // Files this file imports
  importedBy: string[];   // Files that import this file
  
  // Metadata
  description?: string;
  isEntry?: boolean;      // Main file?
}

interface FileIndexEntry {
  path: string;
  filename: string;
  language: string;
  size: number;
  description?: string;
  dependencies: string[];
}

interface SmartContextConfig {
  strategy: 'all' | 'index-plus-active' | 'index-plus-deps' | 'index-only';
  maxSize: number;        // Bytes threshold
  includeIndex: boolean;
  includeDependencies: boolean;
}
```

---

## Smart Context Building Strategy

### Size-Based Decisions

```typescript
function determineStrategy(totalSize: number): ContextStrategy {
  if (totalSize < 10_000) {
    // < 10KB: Send everything
    return {
      strategy: 'all',
      includeIndex: false,
      includeDependencies: true,
      reason: 'Small codebase - include all files'
    };
  }
  
  if (totalSize < 50_000) {
    // 10-50KB: Send index + active + dependencies
    return {
      strategy: 'index-plus-deps',
      includeIndex: true,
      includeDependencies: true,
      reason: 'Medium codebase - include related files'
    };
  }
  
  if (totalSize < 200_000) {
    // 50-200KB: Send index + active file only
    return {
      strategy: 'index-plus-active',
      includeIndex: true,
      includeDependencies: false,
      reason: 'Large codebase - active file only'
    };
  }
  
  // > 200KB: Send index only, model must request files
  return {
    strategy: 'index-only',
    includeIndex: true,
    includeDependencies: false,
    reason: 'Very large codebase - index only, await requests'
  };
}
```

### Context Building Example

```typescript
// For UserList.tsx in your test page:

// Strategy: index-plus-deps (let's say 30KB total)
const context = buildSmartContext(session, {
  activeFile: '/UserList.tsx',
  strategy: 'index-plus-deps'
});

// Generates:
`
=== PROJECT FILES (5 files, ~30KB total) ===

types.ts (TypeScript, 1.2KB)
  - TypeScript type definitions for User domain
  - No dependencies

userService.ts (TypeScript, 2.5KB)
  - API service for user operations
  - Imports: types.ts

useUsers.ts (TypeScript, 1.8KB)
  - Custom React hook for fetching users
  - Imports: userService.ts, types.ts

UserCard.tsx (TypeScript, 3.2KB)
  - User card component displaying user info
  - Imports: types.ts

UserList.tsx (TypeScript, 4.3KB) ← ACTIVE FILE
  - User list component with filtering
  - Imports: useUsers.ts, UserCard.tsx, types.ts

=== END FILE INDEX ===

=== ACTIVE FILE: UserList.tsx (v2) ===
File: /UserList.tsx
Language: typescript
Dependencies: useUsers.ts, UserCard.tsx, types.ts

\`\`\`typescript
// [Full content of UserList.tsx]
\`\`\`
=== END ACTIVE FILE ===

=== DEPENDENCIES ===

--- useUsers.ts ---
\`\`\`typescript
// [Full content of useUsers.ts]
\`\`\`

--- UserCard.tsx ---
\`\`\`typescript
// [Full content of UserCard.tsx]
\`\`\`

--- types.ts ---
\`\`\`typescript
// [Full content of types.ts]
\`\`\`

=== END DEPENDENCIES ===

Previous versions of files replaced with tombstones (see v1)
`
```

---

## Redux Actions & Selectors

### Actions

```typescript
// Create session
createSession({ mode: 'single' | 'multi', metadata })

// Single-file actions (existing - backward compatible)
updateSingleFileContent({ sessionId, content, summary })
getSingleFileContext({ sessionId }) // Returns context string

// Multi-file actions (NEW)
addFile({ sessionId, path, content, language, description })
updateFile({ sessionId, path, content, summary })
deleteFile({ sessionId, path })
setActiveFile({ sessionId, path })
buildFileIndex({ sessionId })
parseFileDependencies({ sessionId })

// Context building
buildSmartContext({ sessionId, strategyOverride? })
getFileByPath({ sessionId, path })
getActiveDependencies({ sessionId })
```

### Selectors

```typescript
// Session selectors
selectSession(state, sessionId)
selectAllSessions(state)
selectActiveSession(state)

// Single-file selectors (backward compatible)
selectSingleFileContent(state, sessionId)
selectSingleFileContext(state, sessionId)
selectSingleFileVersions(state, sessionId)

// Multi-file selectors (NEW)
selectAllFiles(state, sessionId)
selectFileByPath(state, sessionId, path)
selectActiveFile(state, sessionId)
selectFileIndex(state, sessionId)
selectDependencyGraph(state, sessionId)
selectFileDependencies(state, sessionId, path)
selectSmartContextStrategy(state, sessionId)

// Context building selectors
selectBuildContext(state, sessionId) // Memoized context string
selectContextStats(state, sessionId) // Size, file count, etc.
```

---

## Component Integration

### Single-File Modal (No Changes!)

```typescript
// features/code-editor/components/ContextAwareCodeEditorModal.tsx
// Existing component - continues to work exactly as before

export function ContextAwareCodeEditorModal({
  code,
  language,
  ...props
}: ContextAwareCodeEditorModalProps) {
  // Behind the scenes: uses Redux session with mode: 'single'
  // Everything else stays the same!
  // ✅ NO BREAKING CHANGES
}
```

### Multi-File Modal (NEW)

```typescript
// features/code-editor/components/MultiFileCodeEditorModal.tsx

export interface MultiFileCodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CodeFile[];
  builtinId?: string;
  onFilesChange: (files: CodeFile[]) => void;
  title?: string;
  displayVariant?: 'standard' | 'compact';
}

export function MultiFileCodeEditorModal({
  files,
  onFilesChange,
  ...props
}: MultiFileCodeEditorModalProps) {
  const dispatch = useAppDispatch();
  const sessionId = useRef(generateId()).current;
  
  // Create multi-file session
  useEffect(() => {
    dispatch(createSession({
      sessionId,
      mode: 'multi',
      metadata: { contextType: 'code' }
    }));
    
    // Add all files
    files.forEach(file => {
      dispatch(addFile({
        sessionId,
        path: file.path,
        content: file.content,
        language: file.language,
        description: file.description
      }));
    });
    
    // Build file index & dependencies
    dispatch(buildFileIndex({ sessionId }));
    dispatch(parseFileDependencies({ sessionId }));
  }, []);
  
  // Get smart context via selector
  const contextString = useAppSelector(state => 
    selectBuildContext(state, sessionId)
  );
  
  // Use context-aware prompt runner
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ContextAwarePromptRunner
          initialContext={contextString}
          contextType="code"
          promptData={promptData}
          onResponseComplete={handleCodeEdits}
          // Context updates automatically via Redux!
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## Usage Examples

### Single-File (Existing - Still Works!)

```typescript
// app/(authenticated)/demo/.../ai-code-editor-v3/page.tsx
// NO CHANGES NEEDED!

<ContextAwareCodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  code={currentCode}
  language={language}
  onCodeChange={handleCodeChange}
  // ✅ Works exactly as before
/>
```

### Multi-File (NEW)

```typescript
// app/(authenticated)/demo/.../code-block-tests/page.tsx

function CodeBlockTestPage() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [multiFiles, setMultiFiles] = useState<CodeFile[]>([...]);
  
  return (
    <>
      <MultiFileCodeEditor
        files={multiFiles}
        onChange={handleMultiFileChange}
      />
      
      <Button onClick={() => setIsAIOpen(true)}>
        Edit with AI
      </Button>
      
      <MultiFileCodeEditorModal
        open={isAIOpen}
        onOpenChange={setIsAIOpen}
        files={multiFiles}
        onFilesChange={setMultiFiles}
        title="AI Multi-File Editor"
        displayVariant="standard"
      />
    </>
  );
}
```

---

## Future: Tool Calls for File Requests

### When Context is Too Large

```typescript
// Model receives index-only context:
`
=== PROJECT FILES (50 files, ~500KB total) ===
[File index here]
=== END FILE INDEX ===

To request a file's content, use the get_file tool with the file path.
`

// Model can then make tool call:
{
  "tool": "get_file",
  "path": "/components/UserList.tsx"
}

// System responds with file content:
{
  "tool_result": {
    "path": "/components/UserList.tsx",
    "content": "...",
    "dependencies": ["types.ts", "useUsers.ts"]
  }
}
```

### Implementation (Future)

```typescript
// In PromptRunner - detect tool call in AI response
if (response.includes('"tool": "get_file"')) {
  const toolCall = parseToolCall(response);
  
  if (toolCall.tool === 'get_file') {
    // Get file from Redux
    const file = selectFileByPath(state, sessionId, toolCall.path);
    
    // Inject into conversation
    dispatch(addToolResult({
      sessionId,
      toolCall,
      result: {
        path: file.path,
        content: file.content,
        dependencies: file.imports
      }
    }));
    
    // Continue execution with file content
    dispatch(executeMessage({ sessionId }));
  }
}
```

---

## Migration Path (Zero Breaking Changes)

### Phase 1: Add Redux Slice (Weeks 1-2)
- Create `lib/redux/code-context/` structure
- Implement single-file mode (matches existing behavior)
- Add selectors
- Write tests

### Phase 2: Integrate Single-File Modal (Week 3)
- Update `ContextAwareCodeEditorModal` to use Redux internally
- Ensure backward compatibility
- Test all existing features
- **No API changes** - component props stay the same

### Phase 3: Add Multi-File Support (Weeks 4-5)
- Implement multi-file state management
- Add file index builder
- Add dependency parser
- Add smart context builder
- Write tests

### Phase 4: Create Multi-File Modal (Week 6)
- Create `MultiFileCodeEditorModal` component
- Integrate with test page
- Test with User domain files
- Verify diff viewing, applying works

### Phase 5: Tool Calls (Future)
- Add tool call detection
- Implement file request handling
- Test with large codebases

---

## Benefits Summary

### For You (Developer)
✅ **One system** - Single & multi-file share code  
✅ **No closure bugs** - Redux guarantees fresh state  
✅ **Time-travel debug** - Redux DevTools for complex scenarios  
✅ **Testable** - Redux makes testing easy  
✅ **Scalable** - Handles small & large codebases  

### For Users
✅ **Works with existing features** - No disruption  
✅ **Smart context** - Only send what's needed  
✅ **Multi-file editing** - Edit related files together  
✅ **Dependency aware** - Sees imported files  
✅ **Fast** - Efficient context building  

### For Maintenance
✅ **One state system** - Easy to understand  
✅ **Memoized selectors** - Performance optimized  
✅ **Well-typed** - TypeScript throughout  
✅ **Documented** - Clear architecture  

---

## Next Steps

1. **Review this proposal** - Discuss any concerns
2. **Validate approach** - Confirm Redux is the right fit
3. **Start Phase 1** - Create Redux slice
4. **Test incrementally** - Each phase tested before next
5. **No breaking changes** - Existing code continues working

---

## Questions to Discuss

1. Do you agree Redux is the right home for this?
2. Are the size thresholds (10KB, 50KB, 200KB) reasonable?
3. Should we support custom strategies per project?
4. How should we handle binary files (images, etc.)?
5. Should file index include line counts, complexity metrics?

---

**This proposal maintains backward compatibility while adding powerful multi-file support, all built on your solid Redux foundation!** 🚀

