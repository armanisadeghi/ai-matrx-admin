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
        // Set correct height BEFORE focusing to prevent glitch
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
        
        setTimeout(() => {
            el.focus({ preventScroll: true }); // CRITICAL
        }, 0);
    }
}}
```

**Why set height first?**
- Prevents visible resize glitch when focus triggers
- Textarea appears at correct size immediately

**Why preventScroll?**
- Blocks browser's built-in scroll-on-focus behavior

### 3. onFocus Handler (SystemMessage.tsx, PromptMessages.tsx)
```typescript
onFocus={(e) => {
    // Note: Auto-resize handled in ref callback to prevent glitch
    // Note: Cursor position set by click handler (see above)
    // Only track the current cursor position on focus
    onCursorPositionChange({
        ...cursorPositions,
        [index]: e.target.selectionStart,
    });
}}
```

**Why NOT resize in onFocus?**
- Causes visible glitch (shrink to auto → expand to scrollHeight)
- Height already set correctly in ref callback

**Why NOT set cursor position in onFocus?**
- Click handler sets cursor at exact click position
- onFocus moving cursor to end would override user's click

## Files Modified
- `configuration/SystemMessage.tsx` (lines ~213-228, ~250-259, ~280-307)
- `builder/PromptMessages.tsx` (lines ~216-229, ~249-257, ~271-308)

## Do NOT
- Remove double `requestAnimationFrame` (scroll will break)
- Remove `{ preventScroll: true }` (scroll will break)
- Remove height setting from ref callback (glitch will return)
- Add auto-resize to onFocus (glitch will return)
- Move cursor to end in onFocus (breaks click positioning)
- Add scroll event listeners or CSS overrides in parent containers (causes jitter)
- Use single RAF or `setTimeout` (timing unreliable)

## Test Cases
1. **Scroll Position**: Open prompt with long system message (>3 screen heights), scroll down 2-3 page folds, click anywhere in visible text → Verify: Scroll position unchanged, cursor at click location
2. **No Glitch**: Click to edit → Verify: No visible resize/jump, smooth transition from div to textarea
3. **Cursor Position**: Click middle of line 5 → Verify: Cursor appears at exact click point, not at end

