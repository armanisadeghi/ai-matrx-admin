# Debug System - Usage

## How It Works

1. **Redux stores debug data** - Simple key-value object
2. **Component displays it** - Shows whatever is in Redux as JSON
3. **Dispatch to add data** - From any component

## Basic Usage

```tsx
import { useAppDispatch } from '@/lib/redux';
import { updateDebugData } from '@/lib/redux/slices/adminDebugSlice';

function MyComponent() {
    const dispatch = useAppDispatch();
    
    // Add debug data whenever it changes
    useEffect(() => {
        dispatch(updateDebugData({
            'My Data': someData,
            'My State': someState,
        }));
    }, [someData, someState, dispatch]);
}
```

## Actions Available

```tsx
import { 
    updateDebugData,  // Merge with existing
    setDebugData,     // Replace all
    setDebugKey,      // Set single key
    removeDebugKey,   // Remove key
    clearDebugData,   // Clear all
} from '@/lib/redux/slices/adminDebugSlice';

// Merge data
dispatch(updateDebugData({ key1: value1, key2: value2 }));

// Replace all data
dispatch(setDebugData({ newData: data }));

// Single key
dispatch(setDebugKey({ key: 'myKey', value: myValue }));

// Remove key
dispatch(removeDebugKey('myKey'));

// Clear everything
dispatch(clearDebugData());
```

## View Debug Data

1. Click **Debug** button in admin indicator (bottom right)
2. Expand the Large Admin Panel
3. See your debug data displayed as JSON

## Real Example - PromptBuilder

See `features/prompts/components/PromptBuilder.tsx` for a working example:

```tsx
// Update debug data when model controls or config changes
useEffect(() => {
    dispatch(updateDebugData({
        'Model Controls': normalizedControls,
        'Current Settings': modelConfig,
        'Selected Model ID': model,
        'Unmapped Controls': normalizedControls?.unmappedControls,
    }));
}, [normalizedControls, modelConfig, model, dispatch]);
```

That's it!

