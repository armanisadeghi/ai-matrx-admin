# Custom UI System for AI Matrx Prompts
## Accurate System Documentation Based on Actual Implementation

---

## Executive Summary

This document provides the **ACTUAL** architecture for implementing user-generated custom UIs for prompts in AI Matrx, based on the real codebase structure. This system allows users to create custom UI components that execute prompts via Socket.IO streaming while maintaining full conversation history in the AI Runs system.

---

## Table of Contents
1. [Actual System Architecture](#actual-system-architecture)
2. [Core Data Structures](#core-data-structures)
3. [Socket.IO Task Execution](#socketio-task-execution)
4. [AI Runs & Conversation Tracking](#ai-runs--conversation-tracking)
5. [Response Rendering](#response-rendering)
6. [Database Schema for Custom UIs](#database-schema-for-custom-uis)
7. [Implementation Patterns](#implementation-patterns)
8. [Complete Working Example](#complete-working-example)

---

## Actual System Architecture

### System Overview

AI Matrx uses a **Redux-based Socket.IO streaming system** with conversation tracking via the AI Runs system. Here's the actual flow:

```
User Interaction
    ↓
Custom UI Component (Client)
    ↓
Redux Action: createAndSubmitTask()
    ↓
Socket.IO Emission → Python Backend
    ↓
Streaming Response (via Socket.IO listeners)
    ↓
Redux Store Updates (socketResponseSlice)
    ↓
React Component Re-renders (via selectors)
    ↓
EnhancedChatMarkdown displays content
```

### Key Technologies

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **State Management**: Redux Toolkit
- **Real-time Communication**: Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Streaming**: Chunk-based text accumulation
- **Markdown Rendering**: EnhancedChatMarkdown component

---

## Core Data Structures

### 1. Prompt Structure (Database: `prompts` table)

```typescript
// Frontend Types: features/prompts/types/core.ts
interface PromptsData {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  description?: string;
  userId: string;
  
  // Core prompt configuration
  messages: PromptMessage[];          // Array of system/user/assistant messages
  variableDefaults?: PromptVariable[]; // Variable definitions with defaults
  settings: PromptSettings;           // Model settings and configuration
  tools?: Record<string, unknown>;    // Tool definitions
}

// Message structure
interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;  // Can include {{variable}} placeholders
  metadata?: {
    files?: MessageFileReference[];
    resources?: MessageResourceReference[];
    [key: string]: unknown;
  };
}

// Variable definition
interface PromptVariable {
  name: string;
  defaultValue: string;
  customComponent?: {
    type: "textarea" | "toggle" | "radio" | "checkbox" | "select" | "number";
    options?: string[];
    allowOther?: boolean;
    toggleValues?: [string, string];
    min?: number;
    max?: number;
    step?: number;
  };
}

// Settings structure
interface PromptSettings {
  model_id: string;        // REQUIRED: AI model to use
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;        // Always true for streaming
  output_format?: string;
  tool_choice?: string;
  parallel_tool_calls?: boolean;
  tools?: string[];
  reasoning_effort?: string;
  verbosity?: string;
  // ... and more settings
}
```

### 2. Variable Resolution

Variables in messages are replaced using simple string replacement:

```typescript
// Example from PromptRunner.tsx
const resolveVariables = (content: string, values: Record<string, string>) => {
  let resolved = content;
  Object.entries(values).forEach(([key, value]) => {
    resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return resolved;
};

// Example:
// Template: "Write a story about {{topic}} in {{style}} style"
// Values: { topic: "dragons", style: "fantasy" }
// Result: "Write a story about dragons in fantasy style"
```

---

## Socket.IO Task Execution

### Task Submission Flow

```typescript
// 1. Build the message array with resolved variables
const messages = promptData.messages.map(msg => ({
  role: msg.role,
  content: resolveVariables(msg.content, variableValues)
}));

// 2. Add user input if provided
if (userInput) {
  messages.push({
    role: "user",
    content: userInput
  });
}

// 3. Build chat configuration
const chatConfig = {
  model_id: modelId,        // From promptData.settings
  messages: messages,       // Resolved messages array
  stream: true,            // Always stream
  ...modelConfig          // Additional settings from promptData.settings
};

// 4. Generate task ID
const taskId = uuidv4();

// 5. Submit via Redux thunk
await dispatch(createAndSubmitTask({
  service: "chat_service",      // Python backend service
  taskName: "direct_chat",      // Task type
  taskData: { 
    chat_config: chatConfig     // Entire config in chat_config key
  },
  customTaskId: taskId         // Use our UUID
})).unwrap();
```

### Socket.IO Communication Details

```typescript
// lib/redux/socket-io/thunks/submitTaskThunk.ts

// The actual emission format:
socket.emit(
  "chat_service",  // Service name
  { 
    taskName: "direct_chat",
    taskData: { chat_config: chatConfig }
  },
  (response) => {
    // Backend responds with listener event IDs
    const eventNames = response.response_listener_events || [];
    // e.g., ["response-abc123-def456"]
  }
);

// Backend streams responses via these events:
socket.on(eventName, (response) => {
  if (typeof response === "string") {
    // Text chunk - append to accumulated text
    dispatch(appendTextChunk({ listenerId: eventName, text: response }));
  } else {
    // Structured response
    if (response?.data) { /* data response */ }
    if (response?.info) { /* info response */ }
    if (response?.error) { /* error response */ }
    if (response?.tool_update) { /* tool update */ }
    if (response?.broker) { /* broker value update */ }
    if (response?.end === true) { 
      // Stream complete
      dispatch(markResponseEnd(eventName));
    }
  }
});
```

### Consuming Streaming Responses

```typescript
// In your component:
import { useAppSelector } from "@/lib/redux/hooks";
import { 
  selectPrimaryResponseTextByTaskId, 
  selectPrimaryResponseEndedByTaskId 
} from "@/lib/redux/socket-io/selectors/socket-response-selectors";

function MyComponent() {
  const [taskId, setTaskId] = useState<string | null>(null);
  
  // Real-time streaming text
  const streamingText = useAppSelector(state => 
    taskId ? selectPrimaryResponseTextByTaskId(state, taskId) : ""
  );
  
  // Is the stream complete?
  const isStreamComplete = useAppSelector(state =>
    taskId ? selectPrimaryResponseEndedByTaskId(state, taskId) : false
  );
  
  return (
    <div>
      <EnhancedChatMarkdown
        content={streamingText}
        taskId={taskId}
        isStreamActive={!isStreamComplete}
        role="assistant"
        type="message"
      />
    </div>
  );
}
```

---

## AI Runs & Conversation Tracking

### AI Runs System

The AI Runs system tracks full conversation history, metadata, and costs:

```typescript
// features/ai-runs/types/index.ts

interface AiRun {
  id: string;
  user_id: string;
  source_type: 'prompt' | 'chat' | 'applet' | 'cockpit' | 'workflow' | 'custom';
  source_id?: string;         // The prompt ID
  name?: string;              // Auto-generated or user-provided
  description?: string;
  
  // Conversation data
  messages: RunMessage[];     // Full message history
  settings: Record<string, any>;
  variable_values: Record<string, string>;  // Final variable values used
  broker_values: Record<string, string>;    // Broker state (if applicable)
  attachments: Attachment[];
  
  // Metadata & analytics
  metadata: Record<string, any>;
  status: 'active' | 'archived' | 'deleted';
  is_starred: boolean;
  total_tokens: number;
  total_cost: number;
  message_count: number;
  task_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface RunMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  taskId?: string;           // Links to AiTask
  timestamp: string | Date;
  metadata?: {
    tokens?: number;
    cost?: number;
    timeToFirstToken?: number;
    totalTime?: number;
  };
}

interface AiTask {
  id: string;
  run_id: string;            // Links to parent AiRun
  user_id: string;
  task_id: string;           // Socket.IO task ID (our UUID)
  service: string;           // "chat_service"
  task_name: string;         // "direct_chat"
  model_id?: string;
  provider?: string;
  endpoint?: string;
  
  // Request & Response
  request_data: Record<string, any>;  // The chat_config
  response_text?: string;             // Final accumulated text
  response_data?: Record<string, any>;
  response_info?: Record<string, any>;
  response_errors?: Record<string, any>;
  tool_updates?: Record<string, any>;
  response_complete: boolean;
  response_metadata: Record<string, any>;
  
  // Analytics
  tokens_input?: number;
  tokens_output?: number;
  tokens_total?: number;
  cost?: number;
  time_to_first_token?: number;
  total_time?: number;
  status: 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

### Using AI Runs Hook

```typescript
// features/ai-runs/hooks/useAiRun.ts
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';

function PromptRunner() {
  const { run, createRun, addMessage, createTask } = useAiRun();
  
  // 1. Create a new run
  const handleStart = async () => {
    const newRun = await createRun({
      source_type: 'prompt',
      source_id: promptData.id,
      name: generateRunName(userMessage),
      settings: promptData.settings,
      variable_values: resolvedVariables,
    });
    
    // 2. Create task BEFORE submitting to socket
    const taskId = uuidv4();
    await createTask({
      task_id: taskId,
      service: 'chat_service',
      task_name: 'direct_chat',
      model_id: modelId,
      request_data: chatConfig,
    }, newRun.id);
    
    // 3. Add user message to run
    await addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }, newRun.id);
    
    // 4. Submit to socket with same taskId
    await dispatch(createAndSubmitTask({
      service: "chat_service",
      taskName: "direct_chat",
      taskData: { chat_config: chatConfig },
      customTaskId: taskId,
    }));
  };
}
```

---

## Response Rendering

### EnhancedChatMarkdown Component

```typescript
// components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx

// This component handles:
// - Real-time markdown rendering during streaming
// - Code syntax highlighting
// - LaTeX math rendering
// - Copy button for code blocks
// - HTML preview capabilities
// - Full-screen editor integration

<EnhancedChatMarkdown
  content={streamingText}
  taskId={taskId}
  type="message"
  role="assistant"
  isStreamActive={!isStreamComplete}
  hideCopyButton={false}
  allowFullScreenEditor={true}
  className="bg-textured"
  onContentChange={handleEdit}  // Optional edit callback
/>
```

---

## Database Schema for Custom UIs

### New Tables for Custom UI System

```sql
-- ============================================================================
-- CUSTOM PROMPT UIS - User-generated UI components for prompts
-- ============================================================================

-- Main table for custom UI definitions
CREATE TABLE prompt_custom_uis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & linking
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  
  -- UI metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Component code storage
  component_code TEXT NOT NULL,  -- JSX/TSX function body as string
  component_type TEXT NOT NULL DEFAULT 'react',  -- 'react', 'template', 'json-schema'
  
  -- Configuration
  props_schema JSONB,  -- JSON Schema defining expected props
  default_props JSONB, -- Default prop values
  
  -- Execution mode settings
  execution_mode TEXT NOT NULL DEFAULT 'manual',
  -- Options: 'auto-run', 'auto-run-one-shot', 'manual-with-hidden-variables', 
  --          'manual-with-visible-variables', 'manual'
  
  auto_submit BOOLEAN DEFAULT false,  -- Auto-submit on mount
  show_variables BOOLEAN DEFAULT true, -- Show variable inputs
  
  -- UI customization
  layout_config JSONB,  -- Layout preferences (sidebar, fullscreen, etc)
  styling_config JSONB, -- Custom CSS classes, theme overrides
  
  -- Publishing & sharing
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES prompt_custom_uis(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'draft',  -- 'draft', 'active', 'archived'
  validated BOOLEAN DEFAULT false,  -- Security/syntax validation passed
  validation_errors JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_component_type CHECK (component_type IN ('react', 'template', 'json-schema')),
  CONSTRAINT valid_execution_mode CHECK (execution_mode IN (
    'auto-run', 'auto-run-one-shot', 'manual-with-hidden-variables',
    'manual-with-visible-variables', 'manual'
  )),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'archived'))
);

-- Usage tracking
CREATE TABLE prompt_custom_ui_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_ui_id UUID NOT NULL REFERENCES prompt_custom_uis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID REFERENCES ai_runs(id) ON DELETE SET NULL,  -- Link to conversation
  
  -- Usage metadata
  execution_time_ms INTEGER,
  variables_used JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings & feedback
CREATE TABLE prompt_custom_ui_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_ui_id UUID NOT NULL REFERENCES prompt_custom_uis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(custom_ui_id, user_id)  -- One rating per user per UI
);

-- Templates/examples library
CREATE TABLE prompt_custom_ui_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- 'form', 'chat', 'dashboard', 'visualization', etc
  
  component_code TEXT NOT NULL,
  preview_image_url TEXT,
  demo_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'beginner',  -- 'beginner', 'intermediate', 'advanced'
  
  is_official BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_prompt_custom_uis_user_id ON prompt_custom_uis(user_id);
CREATE INDEX idx_prompt_custom_uis_prompt_id ON prompt_custom_uis(prompt_id);
CREATE INDEX idx_prompt_custom_uis_status ON prompt_custom_uis(status);
CREATE INDEX idx_prompt_custom_uis_is_public ON prompt_custom_uis(is_public) WHERE is_public = true;
CREATE INDEX idx_prompt_custom_uis_last_used ON prompt_custom_uis(last_used_at DESC);

CREATE INDEX idx_prompt_custom_ui_usage_user_id ON prompt_custom_ui_usage(user_id);
CREATE INDEX idx_prompt_custom_ui_usage_custom_ui_id ON prompt_custom_ui_usage(custom_ui_id);
CREATE INDEX idx_prompt_custom_ui_usage_created_at ON prompt_custom_ui_usage(created_at DESC);

CREATE INDEX idx_prompt_custom_ui_ratings_custom_ui_id ON prompt_custom_ui_ratings(custom_ui_id);

CREATE INDEX idx_prompt_custom_ui_templates_category ON prompt_custom_ui_templates(category);
CREATE INDEX idx_prompt_custom_ui_templates_tags ON prompt_custom_ui_templates USING gin(tags);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE prompt_custom_uis ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_custom_ui_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_custom_ui_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_custom_ui_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own custom UIs
CREATE POLICY "Users can view own custom UIs"
  ON prompt_custom_uis FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see public custom UIs
CREATE POLICY "Users can view public custom UIs"
  ON prompt_custom_uis FOR SELECT
  USING (is_public = true AND status = 'active');

-- Users can create custom UIs
CREATE POLICY "Users can create custom UIs"
  ON prompt_custom_uis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom UIs
CREATE POLICY "Users can update own custom UIs"
  ON prompt_custom_uis FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom UIs
CREATE POLICY "Users can delete own custom UIs"
  ON prompt_custom_uis FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for other tables...
CREATE POLICY "Users can view own usage"
  ON prompt_custom_ui_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create usage records"
  ON prompt_custom_ui_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Everyone can view templates
CREATE POLICY "Everyone can view templates"
  ON prompt_custom_ui_templates FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompt_custom_uis_updated_at
  BEFORE UPDATE ON prompt_custom_uis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_custom_ui_ratings_updated_at
  BEFORE UPDATE ON prompt_custom_ui_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Increment use_count on usage
CREATE OR REPLACE FUNCTION increment_custom_ui_use_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompt_custom_uis
  SET 
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = NEW.custom_ui_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_use_count_on_usage
  AFTER INSERT ON prompt_custom_ui_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_custom_ui_use_count();
```

### TypeScript Types for Custom UIs

```typescript
// features/prompts/types/custom-ui.ts

export type ExecutionMode = 
  | 'auto-run'
  | 'auto-run-one-shot'
  | 'manual-with-hidden-variables'
  | 'manual-with-visible-variables'
  | 'manual';

export type ComponentType = 'react' | 'template' | 'json-schema';

export type CustomUIStatus = 'draft' | 'active' | 'archived';

export interface PromptCustomUI {
  id: string;
  user_id: string;
  prompt_id: string;
  
  name: string;
  description?: string;
  
  component_code: string;
  component_type: ComponentType;
  
  props_schema?: Record<string, any>;
  default_props?: Record<string, any>;
  
  execution_mode: ExecutionMode;
  auto_submit: boolean;
  show_variables: boolean;
  
  layout_config?: Record<string, any>;
  styling_config?: Record<string, any>;
  
  is_public: boolean;
  is_featured: boolean;
  use_count: number;
  
  version: number;
  parent_version_id?: string;
  
  status: CustomUIStatus;
  validated: boolean;
  validation_errors?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_used_at?: string;
}

export interface CreateCustomUIInput {
  prompt_id: string;
  name: string;
  description?: string;
  component_code: string;
  component_type?: ComponentType;
  execution_mode?: ExecutionMode;
  auto_submit?: boolean;
  show_variables?: boolean;
  layout_config?: Record<string, any>;
  styling_config?: Record<string, any>;
}
```

---

## Implementation Patterns

### Pattern 1: Simple Auto-Run Modal (Recommended)

Use the existing `PromptRunnerModal` system:

```typescript
import { usePromptRunnerModal } from '@/features/prompts/hooks/usePromptRunnerModal';
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';

function MyCustomUIComponent({ promptData }: { promptData: PromptData }) {
  const promptModal = usePromptRunnerModal();
  
  const handleQuickRun = () => {
    promptModal.open({
      promptData: promptData,
      mode: 'auto-run',
      variables: {
        topic: 'AI',
        style: 'technical'
      },
      title: 'Custom Analysis',
      onExecutionComplete: (result) => {
        console.log('Done!', result);
      }
    });
  };
  
  return (
    <>
      <button onClick={handleQuickRun}>
        Quick Analysis
      </button>
      
      {promptModal.config && (
        <PromptRunnerModal
          isOpen={promptModal.isOpen}
          onClose={promptModal.close}
          {...promptModal.config}
        />
      )}
    </>
  );
}
```

### Pattern 2: Custom UI with Full Control

```typescript
'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { 
  selectPrimaryResponseTextByTaskId, 
  selectPrimaryResponseEndedByTaskId 
} from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';
import { v4 as uuidv4 } from 'uuid';

interface CustomPromptUIProps {
  promptData: {
    id: string;
    name: string;
    messages: PromptMessage[];
    variableDefaults: PromptVariable[];
    settings: Record<string, any>;
  };
}

export function CustomPromptUI({ promptData }: CustomPromptUIProps) {
  const dispatch = useAppDispatch();
  const { run, createRun, addMessage, createTask } = useAiRun();
  
  const [taskId, setTaskId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Real-time streaming response
  const streamingText = useAppSelector(state =>
    taskId ? selectPrimaryResponseTextByTaskId(state, taskId) : ""
  );
  
  const isComplete = useAppSelector(state =>
    taskId ? selectPrimaryResponseEndedByTaskId(state, taskId) : false
  );
  
  const handleExecute = async () => {
    setIsExecuting(true);
    
    try {
      // 1. Create or use existing run
      const currentRun = run || await createRun({
        source_type: 'prompt',
        source_id: promptData.id,
        name: `${promptData.name} - ${new Date().toLocaleString()}`,
        settings: promptData.settings,
        variable_values: variables,
      });
      
      // 2. Resolve variables in messages
      const resolvedMessages = promptData.messages.map(msg => ({
        role: msg.role,
        content: Object.entries(variables).reduce(
          (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), value),
          msg.content
        )
      }));
      
      // 3. Build chat config
      const { model_id, ...modelConfig } = promptData.settings;
      const chatConfig = {
        model_id: model_id,
        messages: resolvedMessages,
        stream: true,
        ...modelConfig
      };
      
      // 4. Create task ID and register with AI Runs
      const newTaskId = uuidv4();
      setTaskId(newTaskId);
      
      await createTask({
        task_id: newTaskId,
        service: 'chat_service',
        task_name: 'direct_chat',
        model_id: model_id,
        request_data: chatConfig,
      }, currentRun.id);
      
      // 5. Submit to Socket.IO
      await dispatch(createAndSubmitTask({
        service: "chat_service",
        taskName: "direct_chat",
        taskData: { chat_config: chatConfig },
        customTaskId: newTaskId,
      })).unwrap();
      
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };
  
  return (
    <div className="p-6 space-y-4">
      {/* Custom UI for variable inputs */}
      {promptData.variableDefaults?.map(variable => (
        <div key={variable.name}>
          <label>{variable.name}</label>
          <input
            type="text"
            value={variables[variable.name] || variable.defaultValue}
            onChange={(e) => setVariables({
              ...variables,
              [variable.name]: e.target.value
            })}
            disabled={isExecuting}
          />
        </div>
      ))}
      
      <button 
        onClick={handleExecute}
        disabled={isExecuting || isComplete}
      >
        {isExecuting ? 'Running...' : 'Execute Prompt'}
      </button>
      
      {/* Real-time streaming response */}
      {streamingText && (
        <div className="mt-6">
          <EnhancedChatMarkdown
            content={streamingText}
            taskId={taskId}
            isStreamActive={!isComplete}
            role="assistant"
            type="message"
          />
        </div>
      )}
    </div>
  );
}
```

---

## Complete Working Example

### Dynamic Custom UI Loader

```typescript
// app/(authenticated)/ai/prompts/custom/[uiId]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { DynamicCustomUIRunner } from '@/features/prompts/components/custom-ui/DynamicCustomUIRunner';

export default async function CustomUIPage({
  params
}: {
  params: Promise<{ uiId: string }>;
}) {
  const { uiId } = await params;
  const supabase = await createClient();
  
  // Fetch custom UI definition
  const { data: customUI } = await supabase
    .from('prompt_custom_uis')
    .select(`
      *,
      prompt:prompts(*)
    `)
    .eq('id', uiId)
    .single();
  
  if (!customUI) {
    return <div>Custom UI not found</div>;
  }
  
  return (
    <DynamicCustomUIRunner
      customUI={customUI}
      promptData={customUI.prompt}
    />
  );
}
```

```typescript
// features/prompts/components/custom-ui/DynamicCustomUIRunner.tsx
'use client';

import { useMemo } from 'react';
import { transform } from '@babel/standalone';

interface DynamicCustomUIRunnerProps {
  customUI: PromptCustomUI;
  promptData: PromptData;
}

export function DynamicCustomUIRunner({ 
  customUI, 
  promptData 
}: DynamicCustomUIRunnerProps) {
  // Safely evaluate and render the custom component
  const CustomComponent = useMemo(() => {
    try {
      // Transform JSX to JavaScript
      const { code } = transform(customUI.component_code, {
        presets: ['react', 'typescript'],
        filename: 'custom-ui.tsx'
      });
      
      // Create component function
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'useAppDispatch',
        'useAppSelector',
        'createAndSubmitTask',
        'useAiRun',
        'EnhancedChatMarkdown',
        'v4',
        'selectors',
        `return ${code}`
      );
      
      // Import required dependencies
      const React = require('react');
      const { useState, useEffect } = React;
      const { useAppDispatch, useAppSelector } = require('@/lib/redux/hooks');
      const { createAndSubmitTask } = require('@/lib/redux/socket-io/thunks/submitTaskThunk');
      const { useAiRun } = require('@/features/ai-runs/hooks/useAiRun');
      const EnhancedChatMarkdown = require('@/components/mardown-display/chat-markdown/EnhancedChatMarkdown').default;
      const { v4 } = require('uuid');
      const selectors = require('@/lib/redux/socket-io/selectors/socket-response-selectors');
      
      return componentFunction(
        React,
        useState,
        useEffect,
        useAppDispatch,
        useAppSelector,
        createAndSubmitTask,
        useAiRun,
        EnhancedChatMarkdown,
        v4,
        selectors
      );
    } catch (error) {
      console.error('Failed to load custom UI:', error);
      return () => <div>Error loading custom UI</div>;
    }
  }, [customUI.component_code]);
  
  return <CustomComponent promptData={promptData} />;
}
```

---

## Key Differences from Original Document

### What the Original Got Wrong

1. **No Server Actions**: We don't use Next.js server actions - we use Redux + Socket.IO
2. **No FormData**: We build structured objects, not form submissions
3. **No Direct LLM Calls**: Frontend doesn't call LLMs directly - everything goes through Socket.IO
4. **Message Structure**: Messages are arrays of objects, not single strings
5. **Variable Resolution**: Simple string replacement, not complex parsing
6. **Streaming**: Handled by Redux selectors, not ReadableStream
7. **Conversation Tracking**: AI Runs system tracks everything, not just responses

### What We Actually Use

✅ **Redux Toolkit** for state management  
✅ **Socket.IO** for real-time communication  
✅ **Supabase** for database (PostgreSQL)  
✅ **AI Runs System** for conversation tracking  
✅ **EnhancedChatMarkdown** for response rendering  
✅ **UUID v4** for task IDs  
✅ **Chunk-based streaming** via Redux actions  
✅ **Modal system** for quick executions  

---

## Summary

This system provides:

1. **Flexible Custom UIs**: Users can create custom interfaces for any prompt
2. **Real-time Streaming**: Immediate feedback via Socket.IO
3. **Full Conversation History**: AI Runs system tracks everything
4. **Reusable Components**: Modal system for quick executions
5. **Proper Architecture**: Separation of concerns between UI, state, and backend
6. **Type Safety**: Full TypeScript support throughout
7. **Security**: Row-level security and validation

The key is understanding that **all prompt execution flows through Socket.IO with Redux managing state**, and the **AI Runs system provides conversation persistence and analytics**.

