# AI UI Builder Guidelines
## Instructions for AI Agents Building Custom Prompt App UIs

---

## Overview

You are building a **custom React component** that will become a public web app for executing AI prompts. Your component will be transformed from JSX/TSX to JavaScript and rendered dynamically. Follow these guidelines exactly to ensure your component works correctly.

---

## Component Structure

### Required Format

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CustomPromptApp({
  onExecute,
  response,
  isStreaming,
  isExecuting,
  error,
  rateLimitInfo,
  appName,
  appTagline,
  appCategory
}) {
  const [variables, setVariables] = useState({
    // Initialize with default values
    topic: '',
    style: 'professional',
    length: 'medium'
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await onExecute(variables);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Your custom UI here */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={variables.topic}
          onChange={(e) => setVariables({...variables, topic: e.target.value})}
          placeholder="Enter topic"
          disabled={isExecuting}
        />
        
        <Button type="submit" disabled={isExecuting || isStreaming}>
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : 'Generate'}
        </Button>
      </form>
      
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error.message}
        </div>
      )}
      
      {response && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <div className="prose max-w-none">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Props You Receive

Your component **automatically receives** these props:

### `onExecute: (variables: Record<string, any>) => Promise<void>`
- **Required**: Call this function to execute the prompt
- Pass an object with all variable values
- Example: `await onExecute({ topic: 'AI', style: 'casual' })`

### `response: string`
- Real-time streaming response from the AI
- Updates live as the AI generates text
- Use directly in your UI

### `isStreaming: boolean`
- `true` while AI is actively generating response
- `false` when complete
- Use to show "Streaming..." indicators

### `isExecuting: boolean`
- `true` while request is being submitted
- `false` after submission (before streaming starts)
- Use to disable buttons

### `error: { type: string, message: string } | null`
- Contains error info if execution fails
- Always check and display to user

### `rateLimitInfo: { allowed: boolean, remaining: number, reset_at: string, is_blocked: boolean } | null`
- Shows remaining free executions
- Display to encourage signup after 2-3 uses

### `appName: string`
- The name of the app (metadata)

### `appTagline: string | undefined`
- Short description (metadata)

### `appCategory: string | undefined`
- Category (metadata)

---

## Allowed Imports

You can ONLY import from these libraries:

### React Core
```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
```

### Lucide Icons
```typescript
import { IconName } from 'lucide-react';
// Examples: Loader2, Send, Sparkles, CheckCircle, AlertCircle
```

### ShadCN UI Components
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
```

### ❌ NOT Allowed
- No `next/router` or `next/navigation`
- No `axios` or custom HTTP libraries
- No external npm packages
- No `@/lib/*` imports
- No Redux imports (handled by wrapper)
- No custom hooks from codebase

---

## Required Patterns

### 1. Variable Management

Always use `useState` to manage variables:

```typescript
const [variables, setVariables] = useState({
  topic: '',           // Text input
  tone: 'professional', // Select/dropdown
  length: 3,           // Slider/number
  includeExamples: true // Checkbox
});
```

### 2. Form Submission

```typescript
const handleSubmit = async (e?: React.FormEvent) => {
  e?.preventDefault();
  await onExecute(variables);
};
```

### 3. Error Display

```typescript
{error && (
  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
    <p className="text-destructive font-semibold">{error.type}</p>
    <p className="text-sm text-destructive/80">{error.message}</p>
  </div>
)}
```

### 4. Loading States

```typescript
<Button disabled={isExecuting || isStreaming}>
  {isExecuting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {isExecuting ? 'Generating...' : 'Generate'}
</Button>
```

### 5. Response Display

```typescript
{response && (
  <div className="mt-6 p-6 bg-card border border-border rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Result</h3>
    <div className="prose max-w-none dark:prose-invert">
      {response}
    </div>
  </div>
)}
```

### 6. Rate Limit Warning

```typescript
{rateLimitInfo && rateLimitInfo.remaining <= 2 && (
  <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
    <p className="text-sm text-warning">
      ⚠️ Only {rateLimitInfo.remaining} free uses remaining.
      <a href="/sign-up" className="underline ml-1">Sign up</a> for unlimited access.
    </p>
  </div>
)}
```

---

## Styling Guidelines

### Use Tailwind CSS

All styling must use Tailwind classes:

```typescript
<div className="p-6 space-y-4 max-w-2xl mx-auto">
  <Card className="bg-card border-border">
    <CardContent className="pt-6">
      {/* Content */}
    </CardContent>
  </Card>
</div>
```

### Color Classes

- **Backgrounds**: `bg-background`, `bg-card`, `bg-muted`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Borders**: `border-border`
- **Accent**: `text-primary`, `bg-primary`
- **Status**: `text-destructive`, `text-success`, `text-warning`

### Spacing

- Container: `p-4` to `p-6`
- Stacks: `space-y-4` or `space-x-4`
- Gaps: `gap-4`
- Max width: `max-w-2xl` or `max-w-4xl`

---

## Common UI Patterns

### Simple Text Input

```typescript
<div className="space-y-2">
  <Label htmlFor="topic">Topic</Label>
  <Input
    id="topic"
    value={variables.topic}
    onChange={(e) => setVariables({...variables, topic: e.target.value})}
    placeholder="Enter your topic..."
    disabled={isExecuting}
  />
</div>
```

### Textarea

```typescript
<Textarea
  value={variables.content}
  onChange={(e) => setVariables({...variables, content: e.target.value})}
  placeholder="Enter your content..."
  rows={6}
  disabled={isExecuting}
/>
```

### Select Dropdown

```typescript
<Select 
  value={variables.style}
  onValueChange={(value) => setVariables({...variables, style: value})}
  disabled={isExecuting}
>
  <SelectTrigger>
    <SelectValue placeholder="Select style" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="casual">Casual</SelectItem>
    <SelectItem value="professional">Professional</SelectItem>
    <SelectItem value="academic">Academic</SelectItem>
  </SelectContent>
</Select>
```

### Number Slider

```typescript
<div className="space-y-2">
  <Label>Length: {variables.length} paragraphs</Label>
  <Slider
    value={[variables.length]}
    onValueChange={([value]) => setVariables({...variables, length: value})}
    min={1}
    max={10}
    step={1}
    disabled={isExecuting}
  />
</div>
```

### Multiple Buttons

```typescript
<div className="flex gap-2">
  {['short', 'medium', 'long'].map(option => (
    <Button
      key={option}
      variant={variables.length === option ? 'default' : 'outline'}
      onClick={() => setVariables({...variables, length: option})}
      disabled={isExecuting}
    >
      {option}
    </Button>
  ))}
</div>
```

---

## Advanced Patterns

### Multi-Step Form

```typescript
const [step, setStep] = useState(1);

return (
  <div className="space-y-6">
    {step === 1 && (
      <div>
        {/* Step 1 inputs */}
        <Button onClick={() => setStep(2)}>Next</Button>
      </div>
    )}
    
    {step === 2 && (
      <div>
        {/* Step 2 inputs */}
        <Button onClick={() => setStep(1)}>Back</Button>
        <Button onClick={handleSubmit}>Generate</Button>
      </div>
    )}
  </div>
);
```

### Dynamic Field Array

```typescript
const [items, setItems] = useState(['']);

const addItem = () => setItems([...items, '']);
const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
const updateItem = (index, value) => {
  const newItems = [...items];
  newItems[index] = value;
  setItems(newItems);
};

return (
  <div className="space-y-2">
    {items.map((item, index) => (
      <div key={index} className="flex gap-2">
        <Input
          value={item}
          onChange={(e) => updateItem(index, e.target.value)}
        />
        <Button variant="outline" onClick={() => removeItem(index)}>
          Remove
        </Button>
      </div>
    ))}
    <Button variant="outline" onClick={addItem}>Add Item</Button>
  </div>
);
```

### Conditional Execution

```typescript
useEffect(() => {
  // Auto-execute on mount if desired
  if (variables.autoRun) {
    handleSubmit();
  }
}, []); // Empty deps = run once on mount
```

---

## Testing Checklist

Before finalizing, ensure:

- ✅ All variables are collected in `onExecute()` call
- ✅ Buttons are disabled during `isExecuting` or `isStreaming`
- ✅ Error messages are displayed clearly
- ✅ Response text is shown properly
- ✅ Rate limit warning appears when `remaining <= 2`
- ✅ No console errors
- ✅ Mobile responsive (use responsive Tailwind classes)
- ✅ Dark mode compatible (use semantic color classes)
- ✅ Loading states are clear (spinners, disabled states)

---

## Example: Complete Story Generator

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function StoryGenerator({
  onExecute,
  response,
  isStreaming,
  isExecuting,
  error,
  rateLimitInfo
}) {
  const [variables, setVariables] = useState({
    genre: 'fantasy',
    protagonist: '',
    setting: '',
    conflict: '',
    length: 3
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await onExecute(variables);
  };
  
  const isFormValid = variables.protagonist && variables.setting && variables.conflict;
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Rate Limit Warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning">
            ⚠️ Only {rateLimitInfo.remaining} free generations remaining.
            <a href="/sign-up" className="underline ml-1 font-semibold">Sign up</a> for unlimited access.
          </p>
        </div>
      )}
      
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Story Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Genre */}
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select 
                value={variables.genre}
                onValueChange={(value) => setVariables({...variables, genre: value})}
                disabled={isExecuting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="scifi">Sci-Fi</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Protagonist */}
            <div className="space-y-2">
              <Label htmlFor="protagonist">Protagonist *</Label>
              <Input
                id="protagonist"
                value={variables.protagonist}
                onChange={(e) => setVariables({...variables, protagonist: e.target.value})}
                placeholder="e.g., A young wizard discovering their powers"
                disabled={isExecuting}
                required
              />
            </div>
            
            {/* Setting */}
            <div className="space-y-2">
              <Label htmlFor="setting">Setting *</Label>
              <Input
                id="setting"
                value={variables.setting}
                onChange={(e) => setVariables({...variables, setting: e.target.value})}
                placeholder="e.g., A mystical academy hidden in the mountains"
                disabled={isExecuting}
                required
              />
            </div>
            
            {/* Conflict */}
            <div className="space-y-2">
              <Label htmlFor="conflict">Main Conflict *</Label>
              <Textarea
                id="conflict"
                value={variables.conflict}
                onChange={(e) => setVariables({...variables, conflict: e.target.value})}
                placeholder="e.g., Must save the academy from an ancient evil awakening"
                rows={3}
                disabled={isExecuting}
                required
              />
            </div>
            
            {/* Length */}
            <div className="space-y-2">
              <Label>Story Length: {variables.length} paragraphs</Label>
              <Slider
                value={[variables.length]}
                onValueChange={([value]) => setVariables({...variables, length: value})}
                min={1}
                max={10}
                step={1}
                disabled={isExecuting}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={!isFormValid || isExecuting || isStreaming}
              className="w-full"
            >
              {isExecuting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isExecuting ? 'Generating Story...' : 'Generate Story'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">{error.type}</p>
                <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Your Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none dark:prose-invert">
              {response}
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Streaming...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// Don't make HTTP calls directly
fetch('/some-api').then(...)

// Don't use Router
const router = useRouter();

// Don't use external state management
import { useAppDispatch } from '@/lib/redux';

// Don't import from lib
import { something } from '@/lib/utils';

// Don't use any custom hooks
import { useCustomHook } from '@/hooks/useCustomHook';
```

### ✅ Do This Instead

```typescript
// Use provided onExecute function
await onExecute(variables);

// Use built-in React hooks
const [state, setState] = useState(initialValue);

// Use allowed UI components
import { Button } from '@/components/ui/button';

// Use provided props
const { response, isStreaming, error } = props;
```

---

## Final Notes

- **Keep it simple**: Focus on collecting variables and displaying results
- **Mobile-first**: Use responsive Tailwind classes (`sm:`, `md:`, `lg:`)
- **Accessibility**: Use proper labels, ARIA attributes when needed
- **Performance**: Avoid heavy computations, keep renders fast
- **User Experience**: Clear instructions, helpful placeholders, good error messages

Your component is the **face of the AI app** - make it beautiful, intuitive, and reliable! 🎨✨

