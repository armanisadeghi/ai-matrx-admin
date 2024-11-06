In your components, if you need Set-like functionality, you can create a helper:

```typescript
// Helper for components
export const createSelectionHelper = (selectedRecords: string[]) => ({
    isSelected: (recordKey: string) => selectedRecords.includes(recordKey),
    count: selectedRecords.length,
    isEmpty: selectedRecords.length === 0,
    toArray: () => [...selectedRecords],
    has: (recordKey: string) => selectedRecords.includes(recordKey),
});

// Usage in component
const selection = createSelectionHelper(selectedRecords);
if (selection.has(recordKey)) {
    // do something
}
```

