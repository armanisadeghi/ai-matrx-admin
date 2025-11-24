# UnifiedContextMenu Selection System Analysis

## Problem Summary

The selection system in `UnifiedContextMenu` has different behaviors for editable vs non-editable content, causing:
1. **Visual selection loss** in textareas/inputs when right-clicking
2. **Select All failures** - doesn't work for editable areas, selects entire page for non-editable areas

---

## Root Cause Analysis

### Issue 1: Visual Selection Lost in Textareas

**What happens:**
1. User selects text in a textarea
2. User right-clicks
3. Context menu opens → textarea loses focus
4. Visual selection highlight disappears (even though we stored the selection data correctly)
5. Menu closes → we try to restore selection via `setSelectionRange()`
6. **BUT**: The restoration happens with `setTimeout(..., 0)` which isn't sufficient

**Why it fails:**
```tsx
// Line 238-251: handleMenuClose
const handleMenuClose = () => {
  setMenuOpen(false);
  
  if (selectionRange && selectionRange.element) {
    setTimeout(() => {
      const { element, start, end } = selectionRange;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        element.focus();
        element.setSelectionRange(start, end);  // ❌ Doesn't reliably restore visual highlight
      }
    }, 0);
  }
};
```

**Problem:** The RadixUI ContextMenu component's closing animation and focus management interferes with our restoration attempt. The `setTimeout(..., 0)` isn't enough delay.

---

### Issue 2: Select All - Editable Areas (Complete Failure)

**What happens:**
1. User right-clicks in a textarea
2. Selects "Select All" from menu
3. Nothing happens

**Why it fails:**
```tsx
// Line 293-339: handleSelectAll
const handleSelectAll = () => {
  const activeElement = document.activeElement;
  
  // ❌ selectionRange.element might not be the right element at this point
  if (selectionRange?.element) {
    const element = selectionRange.element;
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.focus();
      element.select();  // Should work, but element might be stale
      return;
    }
  }
  
  // ❌ Complex search logic that often fails
  const findEditableElement = (node: HTMLElement): HTMLTextAreaElement | HTMLInputElement | null => {
    // ... searches for textarea/input
  };
  
  // ❌ Fallback that selects ENTIRE PAGE
  try {
    document.execCommand('selectAll');
  } catch (e) {
    console.error('Select all failed:', e);
  }
};
```

**Problems:**
- `selectionRange.element` might be stale or incorrect when menu is open
- The `findEditableElement` search is too generic and doesn't reliably find the right element
- The fallback `document.execCommand('selectAll')` selects the entire document, not the specific textarea

---

### Issue 3: Select All - Non-Editable Areas (Selects Entire Page)

**What happens:**
1. User right-clicks in a Card with selectable text (non-editable)
2. Selects "Select All"
3. **Entire page** gets selected instead of just the Card content

**Why it fails:**
```tsx
// Line 293-339: handleSelectAll (continued)
const handleSelectAll = () => {
  // ... textarea/input logic fails ...
  
  // ❌ This is the fallback for non-editable content
  try {
    document.execCommand('selectAll');  // Selects ENTIRE DOCUMENT
  } catch (e) {
    console.error('Select all failed:', e);
  }
};
```

**Problem:** There's no logic to create a Selection/Range for just the content within the context menu trigger element. It falls back to selecting the entire page.

---

## The Core Issue: One System for Two Different Behaviors

You're absolutely right - **we're trying to use one system for two fundamentally different scenarios:**

### Editable Content (textarea/input)
- Uses **element-based** selection (selectionStart, selectionEnd)
- Requires **focus** to show visual selection
- Has `.select()` method for Select All
- Selection is **ephemeral** - lost on focus loss

### Non-Editable Content (div, span, Card, etc.)
- Uses **DOM Range/Selection API** (window.getSelection(), Range)
- Does **not require focus** to show visual selection
- No `.select()` method - must use Selection/Range API
- Selection can **persist** without focus

---

## Required Solution: Split the Logic

We need **two separate code paths**:

### Path 1: Editable Elements (textarea/input)
```typescript
// For selection restoration
- Store: element ref, selectionStart, selectionEnd
- Restore: element.focus() + element.setSelectionRange(start, end) with longer delay
- Select All: element.focus() + element.select()
```

### Path 2: Non-Editable Elements (div, span, etc.)
```typescript
// For selection restoration  
- Store: Range object (startContainer, startOffset, endContainer, endOffset)
- Restore: Recreate Range + add to window.getSelection()
- Select All: Create Range spanning entire context menu trigger element
```

---

## Specific Fixes Needed

### Fix 1: Visual Selection Restoration (Textareas)
```typescript
const handleMenuClose = () => {
  setMenuOpen(false);
  
  if (selectionRange && selectionRange.element) {
    // ✅ Longer delay to wait for menu animation to complete
    setTimeout(() => {
      const { element, start, end } = selectionRange;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        element.focus();
        element.setSelectionRange(start, end);
      }
    }, 100);  // Increased from 0 to 100ms
  }
};
```

### Fix 2: Store Additional Context
```typescript
// Store which type of selection we have
const [selectionRange, setSelectionRange] = useState<{
  type: 'editable' | 'non-editable';
  // For editable
  element: HTMLElement | null;
  start: number;
  end: number;
  // For non-editable
  range?: Range | null;
  containerElement?: HTMLElement | null;
} | null>(null);
```

### Fix 3: Select All for Textareas
```typescript
const handleSelectAll = () => {
  if (!selectionRange) return;
  
  if (selectionRange.type === 'editable') {
    const element = selectionRange.element;
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      requestAnimationFrame(() => {
        element.focus();
        element.select();
      });
    }
  } else {
    // Non-editable: Create selection for the container element
    const container = selectionRange.containerElement;
    if (container) {
      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }
};
```

### Fix 4: Selection Capture
```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    // EDITABLE PATH
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const text = target.value.substring(start, end);
    
    setSelectedText(text);
    setSelectionRange({
      type: 'editable',
      element: target,
      start,
      end,
      range: null,
      containerElement: null,
    });
  } else {
    // NON-EDITABLE PATH
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();  // Clone the range!
    }
    
    // Find the context menu trigger container
    const container = (e.currentTarget as HTMLElement).querySelector('[data-radix-context-menu-trigger]') as HTMLElement;
    
    setSelectedText(text);
    setSelectionRange({
      type: 'non-editable',
      element: null,
      start: 0,
      end: 0,
      range,
      containerElement: container || (e.currentTarget as HTMLElement),
    });
  }
  
  setMenuOpen(true);
};
```

---

## Testing Strategy

After implementing fixes, test each scenario:

### Editable Areas (Test 1, 2, 3, 4, 5)
- [ ] Select text → right-click → visual highlight remains/restores
- [ ] Right-click without selection → Select All → entire textarea content selected
- [ ] Select text → right-click → Select All → entire textarea content selected (replaces selection)

### Non-Editable Areas (Test 8)
- [ ] Select text → right-click → visual highlight remains
- [ ] Right-click without selection → Select All → only Card content selected (not entire page)
- [ ] Select text → right-click → Select All → only Card content selected (replaces selection)

---

## Implementation Priority

1. **First**: Fix the selection type detection and storage (split editable/non-editable)
2. **Second**: Fix Select All for both types
3. **Third**: Fix visual restoration with proper timing
4. **Fourth**: Test all 11 test scenarios on the test page


