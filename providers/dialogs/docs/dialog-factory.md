This enhanced dialog system provides several improvements:

1. **Template-Based Approach**:
   - Pre-built templates for both `Dialog` and `AlertDialog`
   - Common structure and styling handled automatically
   - Flexible content injection points

2. **Type-Safe Factory Methods**:
   - `createStandardDialog` and `createAlertDialog` helpers
   - Proper TypeScript types for all configurations
   - Auto-completion and type checking for dialog options

3. **Simplified Dialog Creation**:
   - Minimal boilerplate for new dialogs
   - Consistent structure across all dialogs
   - Easy to add custom content and behaviors

4. **Centralized Configuration**:
   - All dialog settings defined in one place
   - Configuration shared between trigger and content
   - Type-safe props and callbacks

To use this system:

1. **Create an Alert Dialog**:
```typescript
const DeleteDialog = () => {
    const dialogConfig = createAlertDialog({
        id: 'myModule.delete',
        title: 'Delete Item',
        description: 'Are you sure?',
        confirmLabel: 'Delete',
        confirmVariant: 'destructive',
        onConfirm: handleDelete,
        trigger: (open) => <Button onClick={open}>Delete</Button>
    });

    return dialogConfig;
};
```

2. **Create a Standard Dialog**:
```typescript
const EditDialog = () => {
    const dialogConfig = createStandardDialog({
        id: 'myModule.edit',
        title: 'Edit Item',
        content: (close) => (
            <form onSubmit={() => close()}>
                {/* Your form content */}
            </form>
        ),
        footer: (close) => (
            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit">Save</Button>
            </div>
        )
    });

    return dialogConfig;
};
```

3. **Register Dialogs**:
```typescript
const MyModuleDialogs = () => {
    const configs = [
        DeleteDialog(),
        EditDialog()
    ];

    useDialogRegistry(configs);
    return null;
};
```

Key benefits:
- Minimal boilerplate
- Consistent styling and behavior
- Type-safe configurations
- Flexible content injection
- Centralized state management
- Easy to maintain and extend
