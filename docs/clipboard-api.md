The modern replacement for `document.execCommand()` is the **Clipboard API**, which provides a cleaner, promise-based interface for clipboard operations.

## Modern Clipboard API

```typescript
// Reading from clipboard
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    console.log('Pasted content:', text);
  } catch (err) {
    console.error('Failed to read clipboard:', err);
  }
}

// Writing to clipboard
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// For "cut" functionality - copy then delete
async function cutToClipboard(element: HTMLInputElement | HTMLTextAreaElement) {
  try {
    const selectedText = element.value.substring(
      element.selectionStart || 0,
      element.selectionEnd || 0
    );
    
    await navigator.clipboard.writeText(selectedText);
    
    // Remove the selected text
    const newValue = 
      element.value.substring(0, element.selectionStart || 0) +
      element.value.substring(element.selectionEnd || 0);
    
    element.value = newValue;
  } catch (err) {
    console.error('Failed to cut:', err);
  }
}
```

## For Rich Content (HTML, Images, etc.)

```typescript
// Copy rich content
async function copyRichContent() {
  try {
    const blob = new Blob(['<p>Hello <strong>world</strong></p>'], { 
      type: 'text/html' 
    });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    await navigator.clipboard.write([clipboardItem]);
  } catch (err) {
    console.error('Failed to copy rich content:', err);
  }
}

// Read rich content
async function pasteRichContent() {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      for (const type of item.types) {
        const blob = await item.getType(type);
        console.log('Type:', type, 'Blob:', blob);
      }
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err);
  }
}
```

## Important Considerations

**Permissions**: The Clipboard API requires user permission (usually granted automatically when the user interacts with your page).

**HTTPS Required**: The API only works in secure contexts (HTTPS or localhost).

**Browser Support**: Excellent support in modern browsers, but you may want a fallback for older browsers:

```typescript
async function copyTextWithFallback(text: string) {
  // Try modern API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback');
    }
  }
  
  // Fallback to execCommand (deprecated but still widely supported)
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
}
```

The Clipboard API is the recommended approach going forward, with `execCommand` as a fallback only if you need to support very old browsers.