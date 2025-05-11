# New Field Rendering System

This directory contains a new implementation of the field rendering system that uses the real field components from the applet runner instead of simulating them in the builder.

## Components

1. **PreviewFieldController**: Sets up broker map entries and uses the same field controller as the runner
2. **NewFieldRenderer**: Renders field components using the PreviewFieldController 
3. **NewFieldPreview**: Preview component with component type switching functionality

## How It Works

The current field renderer in the builder replicates component rendering logic, which leads to duplicated code and inconsistencies between the builder and runner.

The new system leverages the existing Redux infrastructure:

1. It creates broker map entries for each field using `setBrokerMap`
2. It uses the existing field controller component from the runner 
3. Components use their normal Redux selectors and actions to store and retrieve values

This approach ensures that fields in the builder behave exactly the same way as they do in the runner, eliminating inconsistencies.

## Testing

You can test the new system by:

1. Running the `SampleTest.tsx` component in isolation
2. Integrating with the existing code by modifying `FieldPreview.tsx` as outlined in `ModifiedFieldPreview.tsx`

## Integration 

To integrate this system with minimal disruption:

1. Modify `features/applet/builder/modules/field-builder/FieldPreview.tsx` to use `NewFieldPreview`
2. If successful, replace old components with the new ones:
   - Replace `FieldRenderer.tsx` with our `NewFieldRenderer.tsx`
   - Replace `FieldPreview.tsx` with our `NewFieldPreview.tsx` 
   - Move `PreviewFieldController.tsx` to the parent directory

## Benefits

- **Consistency**: Uses the exact same field components as the runner
- **Maintenance**: No need to maintain two separate rendering systems
- **Accuracy**: Field previews match exactly how they'll look in the applet
- **Future-proof**: Any new field components automatically work in both places

## Implementation Notes

- Each field needs a broker map entry with source='applet', itemId=fieldId, and a unique brokerId
- The PreviewFieldController handles setting up these entries automatically
- When showing alternate component types, we create a separate field with a new ID to ensure it gets its own broker entry 