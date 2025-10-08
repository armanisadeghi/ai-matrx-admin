# Admin Debug System

Simple Redux-based debug system. Store anything, display it in the admin panel.

## Usage

```tsx
import { useAppDispatch } from '@/lib/redux';
import { updateDebugData } from '@/lib/redux/slices/adminDebugSlice';

// In your component
const dispatch = useAppDispatch();

// Add debug data (merges with existing)
dispatch(updateDebugData({
    modelControls: normalizedControls,
    currentSettings: modelConfig,
}));

// Or replace all debug data
dispatch(setDebugData({ myData: data }));

// Or set a single key
dispatch(setDebugKey({ key: 'myKey', value: myValue }));

// Clear when done
dispatch(clearDebugData());
```

## Enable Debug Mode

Click the **Debug** button in the admin indicator (bottom right), then expand the Large Admin Panel.

That's it!

