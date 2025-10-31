# PromptRunnerModal - Implementation & Testing Guide

## Overview

The `PromptRunnerModal` is a versatile, full-featured modal component for running AI prompts across the application. It supports multiple execution modes and is designed to be both powerful and flexible.

## Features

✅ **Multiple Execution Modes**
- Auto-run with pre-filled variables
- Manual with hidden variables
- Manual with visible variables
- Standard manual mode

✅ **Mobile-First Design**
- Nearly fullscreen on all devices
- Responsive input and message areas
- Mobile-optimized canvas handling

✅ **Canvas Support**
- Side-by-side on desktop
- Full-screen takeover on mobile
- Seamless switching between modes

✅ **Complete Integration**
- Socket.IO streaming
- Redux state management
- AI Runs tracking
- Variable replacement
- Real-time metrics

## Components

### 1. PromptRunnerModal
Main modal component with full functionality.

**Location:** `features/prompts/components/PromptRunnerModal.tsx`

**Props:**
```typescript
interface PromptRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId?: string;              // Fetch prompt by ID
  promptData?: PromptData;        // Or provide full prompt data
  mode?: PromptExecutionMode;     // Execution mode
  variables?: Record<string, string>; // Pre-filled variables
  initialMessage?: string;        // Initial user message
  onExecutionComplete?: (result: ExecutionResult) => void;
  title?: string;                 // Custom title
  runId?: string;                 // Load existing conversation
}
```

### 2. usePromptRunnerModal
Hook for managing modal state.

**Location:** `features/prompts/hooks/usePromptRunnerModal.ts`

**Usage:**
```typescript
const promptModal = usePromptRunnerModal();

// Open modal with configuration
promptModal.open({
  promptId: 'my-prompt-id',
  mode: 'auto-run',
  variables: { text: 'Hello world' }
});

// Close modal
promptModal.close();
```

### 3. PromptRunnerModalTester
Full-featured testing component with variable configuration.

**Location:** `features/prompts/components/PromptRunnerModalTester.tsx`

### 4. PromptRunnerModalSidebarTester
Compact sidebar testing component (integrated into PromptRunner).

**Location:** `features/prompts/components/PromptRunnerModalSidebarTester.tsx`

## Execution Modes

### 1. Auto-Run (`auto-run`)
- Automatically starts execution when modal opens
- Variables must be pre-filled
- User sees streaming response immediately
- Best for: Programmatic execution from context menus, buttons, etc.

**Example:**
```typescript
promptModal.open({
  promptId: 'text-analyzer',
  mode: 'auto-run',
  variables: { text: selectedText }
});
```

### 2. Manual with Hidden Variables (`manual-with-hidden-variables`)
- Variables are pre-filled but hidden from user
- User can add additional instructions
- Variables are applied automatically
- Best for: Simplified UX where users don't need to see/edit variables

**Example:**
```typescript
promptModal.open({
  promptData: myPrompt,
  mode: 'manual-with-hidden-variables',
  variables: { context: currentContext }
});
```

### 3. Manual with Visible Variables (`manual-with-visible-variables`)
- Variables are shown and editable
- User can modify values before running
- Best for: Power users who want full control

**Example:**
```typescript
promptModal.open({
  promptId: 'content-generator',
  mode: 'manual-with-visible-variables',
  variables: { topic: 'AI', style: 'formal' }
});
```

### 4. Manual (`manual`)
- Standard prompt runner behavior
- All variables shown (if conversation hasn't started)
- No pre-filled values
- Best for: Admin/testing interface

**Example:**
```typescript
promptModal.open({
  promptData: myPrompt,
  mode: 'manual'
});
```

## Testing Guide

### Setup

1. Navigate to any prompt run page: `/ai/prompts/run/[id]`
2. Look at the left sidebar (desktop only)
3. At the bottom, you'll see a "Test Modal" collapsible section
4. Click to expand the testing controls

### Test Scenarios

#### Test 1: Auto-Run Mode
1. Expand "Test Modal" in sidebar
2. Click "Auto-Run" button
3. **Expected:** Modal opens and immediately starts streaming
4. **Verify:**
   - Modal is nearly fullscreen
   - Response streams in real-time
   - Input is stuck to bottom
   - Can continue conversation after first response

#### Test 2: Hidden Variables Mode
1. Click "Hidden Vars" button
2. **Expected:** Modal opens with input ready
3. Type a message and send
4. **Verify:**
   - Variables section is hidden
   - Input shows "Type your message..."
   - Message sends with variables applied in background

#### Test 3: Visible Variables Mode
1. Click "Visible Vars" button
2. **Expected:** Modal opens with variables shown
3. Edit variable values if desired
4. Add message and send
5. **Verify:**
   - Variables are editable
   - Changes persist in conversation
   - Can expand variables with Maximize button

#### Test 4: Manual Mode
1. Click "Manual" button
2. **Expected:** Standard prompt runner in modal
3. **Verify:**
   - Variables shown (until first message)
   - Works like normal PromptRunner
   - All features available

### Mobile Testing

#### Test 1: Basic Modal
1. Resize browser to mobile width (< 768px)
2. Open modal in any mode
3. **Verify:**
   - Modal takes up full screen height
   - Input is accessible and stuck to bottom
   - Messages scroll properly
   - Keyboard doesn't break layout

#### Test 2: Canvas on Mobile
1. Open modal on mobile
2. Click canvas button in header
3. **Expected:** Canvas takes over screen
4. **Verify:**
   - Canvas is fullscreen (except input)
   - Can return to messages
   - Input still accessible
   - Switching is smooth

### Desktop Testing

#### Test 1: Canvas Side-by-Side
1. Open modal on desktop
2. Click canvas button
3. **Expected:** Canvas opens beside messages
4. **Verify:**
   - Canvas width is ~600px
   - Messages area shrinks appropriately
   - Input remains centered and functional
   - Both areas scroll independently

#### Test 2: Canvas Resizing
1. With canvas open, resize browser
2. **Expected:** Layout adapts smoothly
3. **Verify:**
   - Canvas disappears at mobile breakpoint
   - No layout breaks during transition
   - Canvas state persists

### Edge Cases

#### Test 1: Long Variables
1. Create prompt with long variable values
2. Open in "Visible Vars" mode
3. **Verify:**
   - Variables show inline with truncation
   - Click Maximize to edit in popover
   - Popover is properly sized
   - Changes save correctly

#### Test 2: No Variables
1. Open prompt with no variables
2. Try all modes
3. **Verify:**
   - No errors occur
   - Input works normally
   - Modes adapt correctly

#### Test 3: Streaming Interruption
1. Start auto-run mode
2. Close modal during streaming
3. Reopen modal
4. **Verify:**
   - State resets cleanly
   - No lingering stream data
   - Can start fresh conversation

#### Test 4: Error Handling
1. Use invalid promptId
2. **Expected:** Error state shown
3. **Verify:**
   - Clear error message
   - Can close modal
   - No console errors

### Integration Testing

#### Test 1: Programmatic Usage
Create a test button somewhere in the app:

```typescript
import { usePromptRunnerModal } from '@/features/prompts';

function MyComponent() {
  const promptModal = usePromptRunnerModal();
  
  const handleClick = () => {
    promptModal.open({
      promptId: 'my-prompt',
      mode: 'auto-run',
      variables: { data: 'test' },
      onExecutionComplete: (result) => {
        console.log('Done!', result);
        // Handle result
      }
    });
  };
  
  return (
    <>
      <button onClick={handleClick}>Test Modal</button>
      <PromptRunnerModal
        isOpen={promptModal.isOpen}
        onClose={promptModal.close}
        {...promptModal.config}
      />
    </>
  );
}
```

#### Test 2: With Existing Run
1. Start a conversation in normal PromptRunner
2. Note the runId from URL
3. Open modal with that runId
4. **Verify:**
   - Previous messages load
   - Can continue conversation
   - History is maintained

## Known Limitations & Future Improvements

### Current Limitations
- Canvas width is fixed at 600px (could be resizable)
- Mobile canvas and messages can't be side-by-side
- No canvas history/back button
- Auto-run requires all variables filled

### Potential Improvements
1. **Resizable Canvas:** Allow user to drag canvas divider
2. **Canvas Tabs:** Multiple canvas panels with tabs
3. **Partial Auto-Run:** Allow auto-run with some variables empty
4. **Templates:** Save common variable configurations
5. **Keyboard Shortcuts:** ESC to close, CMD+Enter to send, etc.
6. **Export:** Export conversation as markdown/JSON
7. **Share:** Generate shareable link to conversation

## API Reference

### Types

All types are exported from `@/features/prompts`:

```typescript
import type {
  PromptRunnerModalProps,
  PromptExecutionMode,
  PromptData,
  PromptRunnerModalConfig,
  UsePromptRunnerModalReturn,
} from '@/features/prompts';
```

### Exports

```typescript
// Hook
export { usePromptRunnerModal } from '@/features/prompts';

// Component
export { PromptRunnerModal } from '@/features/prompts';

// Testing Components
export { PromptRunnerModalTester } from '@/features/prompts';
export { PromptRunnerModalSidebarTester } from '@/features/prompts';
```

## Troubleshooting

### Modal doesn't open
- Check that `isOpen` prop is `true`
- Verify promptId or promptData is provided
- Check browser console for errors
- Ensure Dialog component is properly imported

### Variables not replacing
- Verify variable names match exactly (case-sensitive)
- Check that variables object has string values
- Look for `{{variable_name}}` syntax in prompt

### Streaming not working
- Check Socket.IO connection
- Verify model configuration
- Ensure Redux store is properly set up
- Check network tab for API errors

### Canvas not showing
- Verify canvas is opened via toggle button
- Check that canvas content is provided
- Ensure Redux canvas slice is working
- Try on desktop first (mobile has different behavior)

### Mobile layout issues
- Check viewport meta tag
- Test on actual device (not just browser resize)
- Verify CSS breakpoints are working
- Check for conflicting z-index values

## Support & Feedback

For issues or improvements:
1. Check this guide first
2. Review component source code
3. Test in isolation (PromptRunnerModalTester)
4. Check console for errors
5. Verify all dependencies are installed

---

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Component Status:** ✅ Production Ready

