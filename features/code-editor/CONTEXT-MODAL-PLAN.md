# Context-Aware Iterative Editor Modal - Implementation Plan

## Overview

Create a specialized modal component for iterative editing that maintains a **single, always-current version** of content while preserving conversation history WITHOUT bloating the context window.

## The Problem

Current approach with `onExecutionComplete`:
- ✅ Works for multi-turn conversations
- ❌ `current_code` variable set once at start
- ❌ AI relies on conversation memory (fragile)
- ❌ No guaranteed sync between ref and AI's understanding

## The Solution: Version-Aware Context Modal

### Core Concept

```
Message 1: [CURRENT_CODE v1: full code]
  User: "Add error handling"
  AI: [makes edits]

Message 2: [VERSION v1 REMOVED - See current] [CURRENT_CODE v2: full code with error handling]
  User: "Add logging"
  AI: [makes edits]

Message 3: [VERSION v1 REMOVED] [VERSION v2 REMOVED] [CURRENT_CODE v3: full code with error handling + logging]
  User: "Optimize performance"
  AI: [makes edits]
```

**Key**: Only ONE full code version exists in context at any time.

## Architecture

### 1. New Component: `ContextAwarePromptRunner`

Location: `features/prompts/components/results-display/ContextAwarePromptRunner.tsx`

**Purpose**: Specialized version of `PromptRunner` that:
- Manages a versioned context (code, text, JSON, etc.)
- Replaces old versions with tombstones
- Injects current version before each user message
- Tracks changes and provides apply/discard UI

**Props**:
```typescript
interface ContextAwarePromptRunnerProps {
  promptId?: string;
  promptData?: PromptData;
  
  // The dynamic context being edited
  initialContext: {
    content: string;
    type: 'code' | 'text' | 'json' | 'other';
    language?: string;
    metadata?: Record<string, any>;
  };
  
  // Execution config
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  
  // Callbacks
  onContextChange: (newContent: string, version: number) => void;
  onClose?: () => void;
  
  // Context variable name (default: 'current_code')
  contextVariableName?: string;
  
  // Other standard props
  variables?: Record<string, string>;
  title?: string;
  className?: string;
  isActive?: boolean;
}
```

### 2. Core Logic: Context Version Manager

```typescript
interface ContextVersion {
  version: number;
  content: string;
  timestamp: Date;
  changesSummary?: string;  // Optional AI-generated summary
  isCurrent: boolean;
}

class ContextVersionManager {
  private versions: ContextVersion[] = [];
  private currentVersion: number = 1;
  
  // Initialize with first version
  initialize(content: string): ContextVersion {
    const version = {
      version: 1,
      content,
      timestamp: new Date(),
      isCurrent: true,
    };
    this.versions.push(version);
    return version;
  }
  
  // Add new version, mark old as stale
  addVersion(content: string, changesSummary?: string): ContextVersion {
    // Mark all previous versions as not current
    this.versions.forEach(v => v.isCurrent = false);
    
    const version = {
      version: ++this.currentVersion,
      content,
      timestamp: new Date(),
      changesSummary,
      isCurrent: true,
    };
    this.versions.push(version);
    return version;
  }
  
  // Get current version
  getCurrentVersion(): ContextVersion {
    return this.versions.find(v => v.isCurrent)!;
  }
  
  // Build context string for AI
  buildContextString(contextVariableName: string): string {
    const staleVersions = this.versions.filter(v => !v.isCurrent);
    const current = this.getCurrentVersion();
    
    let context = '';
    
    // Add tombstones for old versions
    if (staleVersions.length > 0) {
      context += staleVersions.map(v => 
        `[VERSION ${v.version} - REMOVED FOR BREVITY]\n` +
        `Timestamp: ${v.timestamp.toISOString()}\n` +
        `${v.changesSummary ? `Changes: ${v.changesSummary}\n` : ''}` +
        `(See current version below)\n`
      ).join('\n');
    }
    
    // Add current version
    context += `\n=== CURRENT ${contextVariableName.toUpperCase()} (v${current.version}) ===\n`;
    context += current.content;
    context += `\n=== END ${contextVariableName.toUpperCase()} ===\n`;
    
    return context;
  }
}
```

### 3. Message Interception

**Key Innovation**: Intercept user messages and prepend context automatically.

```typescript
const handleSendMessage = async (userInput: string) => {
  // Build current context string
  const contextString = versionManager.buildContextString(contextVariableName);
  
  // Prepend to user message (invisible to user in UI)
  const enhancedInput = `${contextString}\n\n${userInput}`;
  
  // Send to AI
  await executeMessage(enhancedInput);
};
```

### 4. Edit Detection & Application

**After each AI response:**

```typescript
const handleResponseComplete = (response: string) => {
  // Try to parse edits
  const parsed = parseCodeEdits(response);
  
  if (parsed.success && parsed.edits.length > 0) {
    // Apply edits
    const result = applyCodeEdits(
      versionManager.getCurrentVersion().content,
      parsed.edits
    );
    
    if (result.success) {
      // Show in canvas for review
      openCanvas({
        type: 'code_preview',
        data: {
          originalCode: versionManager.getCurrentVersion().content,
          modifiedCode: result.code,
          onApply: () => {
            // Create new version
            versionManager.addVersion(
              result.code,
              parsed.explanation || 'Code updated'
            );
            
            // Notify parent
            onContextChange(result.code, versionManager.currentVersion);
            
            // Close canvas, keep conversation open
            closeCanvas();
          },
          onDiscard: () => closeCanvas(),
        },
      });
    }
  }
};
```

## Implementation Steps

### Phase 1: Core Component (2-3 hours)

1. **Duplicate `PromptRunner.tsx`** → `ContextAwarePromptRunner.tsx`
2. **Add `ContextVersionManager` class** to manage versions
3. **Modify message sending** to prepend context
4. **Add edit detection** with canvas integration
5. **Test with code editing** scenario

### Phase 2: UI Enhancements (1-2 hours)

1. **Version indicator** in header (e.g., "v3 - 2 changes applied")
2. **Version history dropdown** (optional - show past versions)
3. **Better tombstone messages** in conversation (show user they were replaced)

### Phase 3: Wrapper Modal (1 hour)

1. **Create `ContextAwareCodeEditorModal`**
   - Thin wrapper around `ContextAwarePromptRunner`
   - Handles open/close state
   - Manages initial code and language
   - Simpler API than current V2

```typescript
interface ContextAwareCodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  language: string;
  onCodeChange: (newCode: string) => void;
  builtinId?: string;
  title?: string;
}
```

### Phase 4: Integration (30 mins)

1. **Add to CodeBlock** header as "V3" option
2. **Export from features/code-editor**
3. **Update documentation**

## File Structure

```
features/
├── prompts/
│   └── components/
│       └── results-display/
│           ├── PromptRunner.tsx (existing)
│           └── ContextAwarePromptRunner.tsx (NEW)
│
├── code-editor/
│   ├── components/
│   │   ├── AICodeEditorModal.tsx (V1)
│   │   ├── AICodeEditorModalV2.tsx (V2)
│   │   └── ContextAwareCodeEditorModal.tsx (NEW - V3)
│   ├── utils/
│   │   └── ContextVersionManager.ts (NEW)
│   └── hooks/
│       └── useContextVersioning.ts (NEW - optional)
```

## Benefits

### 1. **Constant Context Size**
- Always ONE full version in context
- Tombstones are tiny (~50 characters each)
- Can do 100+ edits without bloating

### 2. **Guaranteed Sync**
- AI always sees current version
- No reliance on memory
- Explicit version tracking

### 3. **Clear History**
- Conversation shows what happened
- Tombstones provide audit trail
- User can see progression

### 4. **Reusable**
- Works for code, text, JSON, any content
- Can be used for:
  - Code editing (current use case)
  - Document iteration
  - Config file editing
  - API response refinement
  - Prompt engineering
  - Any iterative editing workflow

## Example Usage

```typescript
<ContextAwareCodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  code={currentCode}
  language="typescript"
  onCodeChange={(newCode) => {
    setCurrentCode(newCode);
    console.log('Code updated to version', version);
  }}
  builtinId="87efa869-9c11-43cf-b3a8-5b7c775ee415"
  title="AI Code Editor (Context-Aware)"
/>
```

## Comparison: V1 vs V2 vs V3 (Context-Aware)

| Feature | V1 | V2 | V3 (Proposed) |
|---------|----|----|---------------|
| **Context Management** | Manual ref | Ref + memory | Version-tracked |
| **Code Sync** | Manual | Ref-based | Automatic |
| **Context Bloat** | N/A (no multi-turn) | Potential issue | **Solved with tombstones** |
| **Conversation** | Limited | Full | Full |
| **Infrastructure** | Custom | Existing system | Existing + enhanced |
| **Audit Trail** | None | Conversation only | Version history |
| **Reusability** | Code only | Code only | **Any content type** |

## Decision

**Recommendation: BUILD V3**

Why:
1. ✅ Solves the context bloat problem elegantly
2. ✅ Guarantees sync between AI and actual code
3. ✅ Reusable for many use cases beyond code
4. ✅ Builds on existing infrastructure
5. ✅ Clean, maintainable architecture
6. ✅ Can coexist with V1/V2 (no breaking changes)

**Estimated Time**: 4-6 hours total

**Next Steps**:
1. Create `ContextVersionManager` utility class
2. Duplicate `PromptRunner` → `ContextAwarePromptRunner`
3. Implement message interception
4. Add edit detection + canvas integration
5. Create thin wrapper modal
6. Test thoroughly
7. Add to CodeBlock as "V3"

---

This approach gives you the **best of both worlds**: full conversation continuity with guaranteed context freshness, without any bloat. It's elegant, maintainable, and solves the problem at its core.

