# Scroll Lock Implementation

## Problem
Browser aggressively auto-scrolls parent container during textarea interactions (focus, typing, cursor movement, resize) to keep cursor in view. With multi-page textarea content, this causes jarring position loss.

## Solution: Multi-Layer Scroll Lock

### 1. Ref-Based Container Access (PromptBuilderLeftPanel.tsx)
```typescript
const scrollContainerRef = useRef<HTMLDivElement>(null);
<div ref={scrollContainerRef} className="...scrollbar-thin">
  <SystemMessage scrollContainerRef={scrollContainerRef} />
  <PromptMessages scrollContainerRef={scrollContainerRef} />
</div>
```
**Why:** Direct ref access instead of `querySelector('.scrollbar-thin')` (unreliable with 38+ matching elements in codebase).

### 2. Textarea Mount (SystemMessage.tsx, PromptMessages.tsx)
```typescript
// Track initialization to prevent ref callback from re-running on every render
const textareaInitializedRef = useRef(false);

ref={(el) => {
  textareaRefs.current[index] = el;
  if (el) {
    if (!textareaInitializedRef.current) {
      textareaInitializedRef.current = true;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      el.focus({ preventScroll: true });
    }
  } else {
    textareaInitializedRef.current = false;
  }
}}
```
**CRITICAL:** The ref callback is an inline function, so React creates a new reference on every render (React Compiler is not enabled). Without the initialization guard, React re-runs the callback on every keystroke, causing `height="auto"` to collapse the textarea WITHOUT scroll protection — this is what caused the scroll-to-top-of-system-message bug.

### 2b. Post-Render Height Sync (useLayoutEffect)
```typescript
useLayoutEffect(() => {
  if (!isEditing) return;
  const textarea = textareaRefs?.current?.[index];
  if (!textarea || !scrollContainerRef?.current) return;
  
  const scrollContainer = scrollContainerRef.current;
  const savedScroll = scrollContainer.scrollTop;
  const savedOverflow = scrollContainer.style.overflow;
  
  scrollContainer.style.overflow = "hidden";
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
  scrollContainer.scrollTop = savedScroll;
  scrollContainer.style.overflow = savedOverflow;
}, [content, isEditing]);
```
**Why:** After React re-renders with new content, the textarea height may need updating. `useLayoutEffect` runs synchronously after DOM mutations but BEFORE browser paint, so height changes never cause visible scroll jumps. The overflow lock prevents scroll during the momentary height="auto" collapse.

### 3. Display Div Click Handler
```typescript
onClick={(e) => {
  if (!scrollContainerRef?.current) return;
  
  const scrollContainer = scrollContainerRef.current;
  const savedScrollPosition = scrollContainer.scrollTop;
  
  // Calculate cursor position from click
  const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
  let clickPosition = 0;
  if (range) {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(e.target as HTMLElement);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    clickPosition = preCaretRange.toString().length;
  }
  
  onIsEditingChange(true); // Trigger React re-render
  
  requestAnimationFrame(() => {
    scrollContainer.scrollTop = savedScrollPosition;
    const textarea = textareaRefs.current[index];
    if (textarea && clickPosition > 0) {
      textarea.setSelectionRange(clickPosition, clickPosition);
    }
  });
}
```
**Why single RAF:** One frame delay sufficient for React render completion.

### 4. Textarea Event Handlers (5 Scroll Locks)

#### onChange - Auto-resize Protection
```typescript
onChange={(e) => {
  onContentChange(e.target.value);
  
  if (!scrollContainerRef?.current) {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    return;
  }
  
  const scrollContainer = scrollContainerRef.current;
  const savedScroll = scrollContainer.scrollTop;
  const savedOverflow = scrollContainer.style.overflow;
  
  scrollContainer.style.overflow = "hidden"; // Temporarily disable scroll
  e.target.style.height = "auto";
  e.target.style.height = e.target.scrollHeight + "px";
  scrollContainer.scrollTop = savedScroll;
  scrollContainer.style.overflow = savedOverflow;
}}
```
**Critical:** Setting `height="auto"` triggers browser scroll. Must temporarily disable overflow.

#### onKeyDown - Keyboard Input Protection
```typescript
onKeyDown={(e) => {
  if (scrollContainerRef?.current) {
    const savedScroll = scrollContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScroll;
        }
      });
    });
  }
}}
```
**Why double RAF:** Browser may scroll after key processing but before onChange. Double RAF catches delayed attempts (e.g., undo/redo).

#### onInput - Pre-onChange Protection
```typescript
onInput={(e) => {
  if (scrollContainerRef?.current) {
    const savedScroll = scrollContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = savedScroll;
      }
    });
  }
}}
```
**Why:** Fires before onChange. Catches scroll attempts during input processing phase.

#### onMouseDown - Click Protection
```typescript
onMouseDown={(e) => {
  if (scrollContainerRef?.current) {
    const savedScroll = scrollContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = savedScroll;
      }
    });
  }
}}
```
**Why:** Fires before focus. Prevents scroll when clicking within already-focused textarea.

#### onSelect - Cursor Movement Protection
```typescript
onSelect={(e) => {
  if (scrollContainerRef?.current) {
    const savedScroll = scrollContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = savedScroll;
      }
    });
  }
  // Track cursor position...
}}
```
**Why:** Fires on cursor position changes (clicks, arrow keys). Final safety net.

### 5. Scroll Container (PromptBuilderLeftPanel.tsx)
```typescript
<div ref={scrollContainerRef} style={{ overflowAnchor: "none" }}>
```
**Why:** Disables browser scroll anchoring. Scroll anchoring tries to keep visible content in place when heights change, but it can fight with our manual scroll management, causing unexpected position adjustments during textarea resizing.

## Event Sequence
```
User types "a":
1. onKeyDown → Lock scroll (double RAF)
2. onInput → Lock scroll (single RAF)
3. onChange → Lock scroll + handle resize (overflow:hidden)
4. onSelect → Lock scroll (single RAF)
5. Browser attempts scroll → Prevented by all 4 locks
```

## Critical Rules

### DO NOT:
- ❌ Remove `preventScroll: true` from focus call
- ❌ Remove any of the 5 scroll lock handlers
- ❌ Remove overflow hiding from onChange
- ❌ Use `querySelector` instead of direct ref
- ❌ Add `setTimeout` to focus call
- ❌ Remove the initialization guard from ref callback (causes scroll jumps on every keystroke)
- ❌ Remove the `useLayoutEffect` height sync (handles post-render height updates safely)
- ❌ Remove `overflow-anchor: none` from scroll container
- ❌ Reduce RAF count in onKeyDown (needs double for undo/redo)

### Files:
- `builder/PromptBuilderLeftPanel.tsx` - Creates and passes ref
- `configuration/SystemMessage.tsx` - System message textarea
- `builder/PromptMessages.tsx` - Prompt message textareas

## Testing Checklist
1. **Typing**: Scroll down, type multiple characters → no scroll
2. **Undo/Redo**: Type, Ctrl+Z, Ctrl+Y → no scroll
3. **Arrow keys**: Scroll down, use arrows → no scroll
4. **Click within textarea**: Scroll down, click different position → no scroll
5. **Enter edit mode**: Scroll down, click display text → no scroll, cursor at click point
