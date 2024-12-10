# Entity Operation Mode Transitions Analysis

## VIEW Mode
When transitioning TO View mode:

### Primary State Changes
1. State Flags:
```typescript
flags.operationMode = 'view'
flags.hasUnsavedChanges = false
flags.isValidated = false
```

2. Operation Flags:
```typescript
operationFlags.CREATE_STATUS = 'IDLE'
operationFlags.UPDATE_STATUS = 'IDLE'
operationFlags.DELETE_STATUS = 'IDLE'
```

3. Selection State:
- Maintains current selection
- Maintains active record
- No change to selection mode

### Side Effects
- All pending operations should complete or be cancelled
- Any validation states should be cleared
- Operation flags should be reset to IDLE

### Edge Cases
1. If transitioning from Create:
    - Unsaved new record data should be cleared
    - Selection should be updated to remove temporary record
2. If transitioning from Update:
    - Unsaved changes should be committed or discarded
3. If transitioning from Delete:
    - Selection should be updated if deleted record was selected

## CREATE Mode
When transitioning TO Create mode:

### Primary State Changes
1. State Flags:
```typescript
flags.operationMode = 'create'
flags.hasUnsavedChanges = true
flags.isValidated = false
```

2. Operation Flags:
```typescript
operationFlags.CREATE_STATUS = 'IDLE'
```

3. Selection State:
- Clear active record
- Generate new temporary record ID
- Add temporary record to selection
- Set selection mode to 'single'

### Side Effects
- Previous selections should be cleared
- New temporary record should be created in unsavedRecords
- Any existing unsaved changes should be handled (prompt user)

### Edge Cases
1. Existing unsaved changes:
    - Option A: Block transition, prompt user
    - Option B: Preserve changes in unsavedRecords (complex)
2. Multiple record selection:
    - Clear multiple selection
    - Switch to single selection mode
3. Batch operation in progress:
    - Should block transition until complete

## UPDATE Mode
When transitioning TO Update mode:

### Primary State Changes
1. State Flags:
```typescript
flags.operationMode = 'update'
flags.hasUnsavedChanges = false  // Initially false until changes made
flags.isValidated = false
```

2. Operation Flags:
```typescript
operationFlags.UPDATE_STATUS = 'IDLE'
```

3. Selection State:
- Maintain current selection
- Ensure active record exists
- Copy selected record(s) to unsavedRecords

### Side Effects
- Selected records should be copied to unsavedRecords
- Any existing unsaved changes should be handled
- Validation state should be reset

### Edge Cases
1. No active record:
    - Block transition
    - Require record selection first
2. Multiple record selection:
    - Handle batch update scenario
    - Copy all selected records to unsavedRecords
3. Existing unsaved changes:
    - Same options as Create mode

## DELETE Mode
When transitioning TO Delete mode:

### Primary State Changes
1. State Flags:
```typescript
flags.operationMode = 'delete'
flags.hasUnsavedChanges = false
```

2. Operation Flags:
```typescript
operationFlags.DELETE_STATUS = 'IDLE'
```

3. Selection State:
- Maintain current selection until delete confirmed
- Track lastActiveRecord for post-delete selection

### Side Effects
- Should prompt for confirmation
- Should prepare next record selection
- Should clear any unsaved changes for deleted records

### Edge Cases
1. Unsaved changes exist:
    - Prompt user before proceeding
    - Clear unsaved changes on confirmation
2. Multiple record selection:
    - Handle batch delete scenario
    - Update selection after batch delete
3. Last record in dataset:
    - Handle empty state after deletion

## Common Considerations Across All Transitions

### Data Integrity
1. Unsaved Changes Management:
```typescript
- Check state.flags.hasUnsavedChanges
- Check state.unsavedRecords size
- Decide: prompt vs preserve vs discard
```

2. Selection State Consistency:
```typescript
- Ensure selection.activeRecord exists in records
- Maintain selection.lastActiveRecord for recovery
- Update selection.selectionMode appropriately
```

3. Operation Flag Management:
```typescript
- Reset previous operation flags
- Set appropriate new operation flags
- Handle pending operations
```

# Multi-Record Operation Management

## Operation Categories

### Category 1: Single Record Operations (95% case)
```typescript
interface SingleRecordContext {
    type: 'single';
    activeRecordId: MatrxRecordId;
    unsavedChanges: Record<string, any>;
    operationMode: EntityOperationMode;
}
```

### Category 2: Multi-Select, Single Change (4% case)
```typescript
interface MultiSelectSingleChangeContext {
    type: 'multiSelectSingle';
    selectedRecordIds: MatrxRecordId[];
    activeRecordId: MatrxRecordId;
    unsavedChanges: Record<string, any>;
    operationMode: EntityOperationMode;
}
```

### Category 3: Multi-Select, Multi-Change (1% case)
```typescript
interface MultiSelectMultiChangeContext {
    type: 'multiSelectMulti';
    selectedRecordIds: MatrxRecordId[];
    changedRecords: Map<MatrxRecordId, Record<string, any>>;
    operationMode: EntityOperationMode;
    batchId?: string;  // For tracking related changes
}
```

## Operation Context Management

```typescript
type OperationContextType = 
    | SingleRecordContext 
    | MultiSelectSingleChangeContext 
    | MultiSelectMultiChangeContext;

interface OperationContextState {
    contextType: OperationContextType['type'];
    context: OperationContextType;
    relationshipMap?: Map<string, Set<MatrxRecordId>>;  // For tracking related records
}
```

## Implementation Strategy

1. **Default to Simple**
```typescript
function determineOperationContext(
    state: EntityState<TEntity>,
    operation: EntityOperationMode
): OperationContextType {
    const hasMultipleSelected = state.selection.selectedRecords.length > 1;
    const hasMultipleChanges = Object.keys(state.unsavedRecords).length > 1;
    
    if (!hasMultipleSelected) {
        return {
            type: 'single',
            activeRecordId: state.selection.activeRecord,
            unsavedChanges: state.unsavedRecords[state.selection.activeRecord] || {},
            operationMode: operation
        };
    }
    
    if (hasMultipleSelected && !hasMultipleChanges) {
        return {
            type: 'multiSelectSingle',
            selectedRecordIds: state.selection.selectedRecords,
            activeRecordId: state.selection.activeRecord,
            unsavedChanges: state.unsavedRecords[state.selection.activeRecord] || {},
            operationMode: operation
        };
    }
    
    return {
        type: 'multiSelectMulti',
        selectedRecordIds: state.selection.selectedRecords,
        changedRecords: new Map(
            Object.entries(state.unsavedRecords)
        ),
        operationMode: operation
    };
}
```

2. **Progressive Enhancement**
```typescript
function handleOperationModeChange(
    state: EntityState<TEntity>,
    newMode: EntityOperationMode
) {
    const context = determineOperationContext(state, newMode);
    
    switch (context.type) {
        case 'single':
            return handleSingleRecordOperation(state, context);
            
        case 'multiSelectSingle':
            return handleMultiSelectSingleChange(state, context);
            
        case 'multiSelectMulti':
            return handleComplexMultiRecordOperation(state, context);
    }
}
```

3. **Safety Mechanisms**
```typescript
function validateOperationTransition(
    currentContext: OperationContextType,
    newMode: EntityOperationMode
): boolean {
    if (currentContext.type === 'multiSelectMulti') {
        // Complex validation for multi-record changes
        return validateComplexStateTransition(currentContext, newMode);
    }
    
    // Simple validation for other cases
    return validateBasicStateTransition(currentContext, newMode);
}
```

## Key Benefits

1. **Simplicity First**: Single record operations remain simple and straightforward
2. **Progressive Complexity**: Additional complexity only added when needed
3. **Type Safety**: Each context type has its own well-defined interface
4. **Consistency**: All operations follow the same pattern regardless of complexity
5. **Extensibility**: Easy to add new context types for special cases


# CRUD Operation State Matrix

## Operation Mode States

### CREATE Mode
```
State Requirements:
- Operation Mode: 'create'
- Active Record: new-record-{n}
- Has Unsaved Changes: false (until changes made)
- Loading: false (only true during save)
- Last Operation: null (until save attempt)
- Selection Mode: 'single'
- Selected Records: [new-record-{n}]

Button States:
- New: disabled (can't create while creating)
- Edit: disabled (can't edit new record)
- Save: disabled (until changes made)
- Cancel: enabled
- Delete: disabled (can't delete new record)
```

### UPDATE Mode
```
State Requirements:
- Operation Mode: 'update'
- Active Record: existing record id
- Has Unsaved Changes: false (until changes made)
- Loading: false (only true during save)
- Last Operation: null (until save attempt)
- Selection Mode: 'single'
- Selected Records: [active record id]

Button States:
- New: disabled (can't create while editing)
- Edit: disabled (already editing)
- Save: disabled (until changes made)
- Cancel: enabled
- Delete: disabled (can't delete while editing)
```

### VIEW Mode
```
State Requirements:
- Operation Mode: 'view'
- Active Record: existing record id or null
- Has Unsaved Changes: false
- Loading: false
- Last Operation: matches last completed operation
- Selection Mode: any ('single', 'multiple', 'none')
- Selected Records: based on selection mode

Button States:
- New: enabled
- Edit: enabled (if single record selected)
- Save: disabled
- Cancel: disabled
- Delete: enabled (if record(s) selected)
```

### DELETE Mode (during confirmation)
```
State Requirements:
- Operation Mode: 'delete'
- Active Record: maintained
- Has Unsaved Changes: false
- Loading: false (until confirmed)
- Last Operation: null (until delete complete)
- Selection Mode: maintained
- Selected Records: maintained

Button States:
- New: disabled
- Edit: disabled
- Save: disabled
- Cancel: enabled
- Delete: disabled (handled by confirmation dialog)
```

## State Transition Matrix

| Current State | Action | New State | Side Effects |
|--------------|---------|------------|--------------|
| VIEW → CREATE | New Button | CREATE | Clear selections, generate temp ID |
| VIEW → UPDATE | Edit Button | UPDATE | Copy record to unsaved |
| VIEW → DELETE | Delete Button | DELETE | Show confirmation |
| CREATE → VIEW | Cancel | VIEW | Clear temp record, restore last active |
| CREATE → VIEW | Save Success | VIEW | Set new record as active |
| UPDATE → VIEW | Cancel | VIEW | Clear unsaved changes |
| UPDATE → VIEW | Save Success | VIEW | Update record, maintain active |
| DELETE → VIEW | Cancel | VIEW | Maintain current selection |
| DELETE → VIEW | Delete Success | VIEW | Clear deleted, select next |

## Loading States

| Operation | Loading Trigger | Success State | Error State |
|-----------|----------------|---------------|-------------|
| Create | Save Click | VIEW mode, new active | Maintain CREATE mode |
| Update | Save Click | VIEW mode, same active | Maintain UPDATE mode |
| Delete | Confirm Click | VIEW mode, next record | Maintain previous state |

## Initial State Corrections Needed

1. Fix CREATE mode initial state:
```typescript
- hasUnsavedChanges should be false
- loading should be false
- lastOperation should be null
- save button should be disabled
- delete button should be disabled
```

2. Update Mode Manager:
```typescript
- Reset loading state on mode changes
- Clear lastOperation on mode entry
- Properly track unsaved changes
```

3. Update Button Handlers:
```typescript
- Add proper state checks for button enabling/disabling
- Ensure proper loading state management
- Clear operation flags on mode changes
```
