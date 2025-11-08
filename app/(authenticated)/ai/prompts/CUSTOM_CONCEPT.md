# Concept for User-Generated components acting to run prompts with mostly server-side controls.

## Key Background
- The writer of this document did not know our actual system
- Did not know the exact structure of 'prompts'
- Did now know we use Socket.io and submit tasks for task submission
- Did not know about the availability of EnhancedChatMarkdown for full handling of responses.


## Recommended: Server Components + Server Actions Pattern

### Architecture Overview

```typescript
// app/prompt/[id]/page.tsx (SERVER COMPONENT)
export default async function PromptPage({ params }) {
  const promptConfig = await db.getPrompt(params.id);
  const uiComponent = await db.getUIComponent(params.id);
  
  return (
    <div>
      <DynamicPromptUI 
        promptConfig={promptConfig}
        uiComponent={uiComponent}
      />
    </div>
  );
}
```

### The Key Pattern: Form with Server Actions

```typescript
// Server Action (server-side only)
'use server'

async function executePrompt(formData: FormData, promptId: string) {
  const variables = extractVariablesFromFormData(formData);
  const additionalInstructions = formData.get('additional_instructions');
  
  const prompt = await db.getPrompt(promptId);
  
  // Execute prompt with LLM
  const response = await runLLM({
    messages: prompt.messages,
    variables,
    additionalInstructions,
    settings: prompt.settings
  });
  
  return { response };
}
```

### Dynamic UI Component (Client Component, but minimal)

```typescript
'use client'

export default function DynamicPromptUI({ 
  promptConfig, 
  uiComponent 
}) {
  const [response, setResponse] = useState(null);
  const [isPending, startTransition] = useTransition();
  
  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await executePrompt(formData, promptConfig.id);
      setResponse(result.response);
    });
  };
  
  // Render the custom UI from database
  return (
    <form action={handleSubmit}>
      {/* LLM-generated UI renders here */}
      <CustomUIFromDatabase config={promptConfig} />
    </form>
  );
}
```

## Better Approach: Hybrid Pattern with Progressive Enhancement

This is what I'd actually recommend:

### 1. **Server Component Page** (Fully SSR)

```typescript
// app/prompt/[id]/page.tsx
import { PromptForm } from './PromptForm';

export default async function PromptPage({ params }) {
  const promptConfig = await db.getPrompt(params.id);
  const uiCode = await db.getUICode(params.id);
  
  return (
    <PromptForm 
      promptConfig={promptConfig}
      uiCode={uiCode}
      executeAction={executePromptAction}
    />
  );
}
```

### 2. **Minimal Client Wrapper** (Handles interactivity)

```typescript
'use client'

export function PromptForm({ promptConfig, uiCode, executeAction }) {
  const [response, setResponse] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // For streaming responses
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsStreaming(true);
    
    const formData = new FormData(formRef.current);
    
    // Stream the response
    const stream = await executeAction(formData);
    
    for await (const chunk of stream) {
      setResponse(prev => prev + chunk);
    }
    
    setIsStreaming(false);
  };
  
  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <DynamicUI 
        config={promptConfig}
        code={uiCode}
        response={response}
        isStreaming={isStreaming}
      />
    </form>
  );
}
```

### 3. **LLM-Generated UI** (Pure Presentational)

The LLM would generate something like:

```typescript
// Stored in database as string, evaluated at runtime
function CustomPromptUI({ config, response, isStreaming }) {
  return (
    <div className="grid gap-4">
      {config.variables.map(variable => (
        <div key={variable.name}>
          <label>{variable.name}</label>
          <input 
            name={variable.name}
            type={getInputType(variable.default_component)}
            defaultValue={variable.default_value}
            required
          />
        </div>
      ))}
      
      {config.showAdditionalInstructions && (
        <textarea 
          name="additional_instructions"
          placeholder="Additional instructions..."
        />
      )}
      
      <button type="submit" disabled={isStreaming}>
        {isStreaming ? 'Running...' : 'Run Prompt'}
      </button>
      
      {response && (
        <div className="response-area">
          {response}
        </div>
      )}
    </div>
  );
}
```

## LLM Instructions Would Be:

```
PROMPT UI GENERATION RULES:

1. Create a function component that accepts: { config, response, isStreaming }
2. Use config.variables array to render inputs
3. Each input MUST have name={variable.name} for form data
4. Use defaultValue (not value) for inputs - no state needed
5. Conditionally render textarea with name="additional_instructions"
6. Submit button should use type="submit" and disabled={isStreaming}
7. Display response in a designated area when available
8. No useState, useEffect, or event handlers needed
9. Pure JSX with Tailwind classes and Lucide icons allowed
```

## Key Benefits of This Approach

### ✅ **Performance**
- Initial render is 100% server-side (instant FCP)
- Zero JavaScript until user interacts
- SEO-friendly, crawlable content
- Smaller client bundle

### ✅ **Simplicity for LLM**
- No hooks to manage
- No state management
- Just render inputs with proper `name` attributes
- Form handles everything automatically

### ✅ **Progressive Enhancement**
- Works without JavaScript (graceful degradation)
- Server action as fallback
- Streaming enhances UX when JS loads

### ✅ **Developer Experience**
- Server actions = type-safe API
- No API routes needed
- Automatic revalidation

## Streaming Pattern (Most Elegant)

For streaming responses:

```typescript
// actions/executePrompt.ts
'use server'

export async function executePromptStream(formData: FormData, promptId: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const variables = Object.fromEntries(formData);
      const prompt = await db.getPrompt(promptId);
      
      // Stream from LLM
      const llmStream = await openai.chat.completions.create({
        messages: buildMessages(prompt, variables),
        stream: true,
      });
      
      for await (const chunk of llmStream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(text));
      }
      
      controller.close();
    }
  });
  
  return new Response(stream);
}
```

Then in the client:

```typescript
'use client'

const handleSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const response = await fetch('/api/prompt-stream', {
    method: 'POST',
    body: formData
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    setResponse(prev => prev + text);
  }
};
```

## Database Schema Addition

```typescript
interface StoredPromptUI {
  id: string;
  prompt_id: string;
  component_code: string; // The function body as string
  created_at: Date;
  updated_at: Date;
}
```

## The Complete Flow

1. **User visits** `/prompt/abc123`
2. **Server fetches** prompt config + UI code (SSR)
3. **Server renders** complete HTML (SEO-friendly)
4. **Client hydrates** form interactivity
5. **User fills** form and submits
6. **Client calls** server action with FormData
7. **Server executes** prompt with LLM
8. **Response streams** back to client
9. **Client updates** UI with response
