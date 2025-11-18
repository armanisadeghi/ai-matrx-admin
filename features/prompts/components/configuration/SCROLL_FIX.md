# Scroll Position Fix

## Problem
When clicking display text to enter edit mode (div → textarea), browser auto-scrolls to bring the newly focused textarea into view, causing jarring scroll jumps (often to top of container).

## Root Cause
Browser's native "scroll-into-view" behavior on textarea focus during React state change and DOM swap.

## Solution (2 Parts)

### 1. Click Handler (SystemMessage.tsx, PromptMessages.tsx)
```typescript
onClick={(e) => {
    // Save scroll position BEFORE state change
    const savedScrollPosition = scrollContainer?.scrollTop || 0;
    
    // Calculate click position for cursor placement
    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    // ... calculate clickPosition ...
    
    onIsEditingChange(true); // Trigger React re-render
    
    // CRITICAL: Double requestAnimationFrame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollContainer.scrollTop = savedScrollPosition; // Restore
            textarea.setSelectionRange(clickPosition, clickPosition); // Cursor
        });
    });
}}
```

**Why double RAF?**
- First RAF: Browser has painted the DOM change (div removed, textarea mounted)
- Second RAF: Browser has fully processed layout/reflow for the new textarea
- Only then can we safely restore scroll without it being overridden

### 2. Textarea Ref (SystemMessage.tsx, PromptMessages.tsx)
```typescript
ref={(el) => {
    if (el) {
        setTimeout(() => {
            el.focus({ preventScroll: true }); // CRITICAL
        }, 0);
    }
}}
```

**Why preventScroll?**
Blocks browser's built-in scroll-on-focus behavior.

## Files Modified
- `configuration/SystemMessage.tsx` (lines ~264-301, ~198-203)
- `builder/PromptMessages.tsx` (lines ~268-305, ~206-211)

## Do NOT
- Remove double `requestAnimationFrame` (scroll will break)
- Remove `{ preventScroll: true }` (scroll will break)
- Add scroll event listeners or CSS overrides in parent containers (causes jitter)
- Use single RAF or `setTimeout` (timing unreliable)

## Test Case
1. Open prompt with long system message (>3 screen heights)
2. Scroll down 2-3 page folds
3. Click anywhere in the visible text
4. Verify: Scroll position unchanged, cursor at click location

