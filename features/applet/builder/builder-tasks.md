# Tasks for features\applet\builder

## Current Structure

builder/
├── builder.types.ts - ONLY verified accurate types (Ultimate source of truth)
├── bulter-tasks.md - We are here
├── ConfigBuilder.tsx
├── components/ - Everything in this module needs to be fully updated to use the new services.
│   ├── AppInfoStep.tsx
│   ├── AppletsConfigStep.tsx
│   ├── FieldsConfigStep.tsx
│   ├── GroupsConfigStep.tsx
│   ├── Stepper.tsx
│   ├── field-builders/
│   │   ├── CheckboxFieldBuilder.tsx
│   ├── field-config-forms/
│   │   ├── FieldConfigForms.tsx
│   │   ├── field-types/
│   │   │   ├── ButtonConfigForm.tsx
│   │   │   ├── CheckboxConfigForm.tsx
│   │   │   ├── CheckboxGroupConfigForm.tsx
│   │   │   ├── index.ts
│   │   │   ├── InputConfigForm.tsx
│   │   │   ├── MultiSelectConfigForm.tsx
│   │   │   ├── NumberConfigForm.tsx
│   │   │   ├── RadioConfigForm.tsx
│   │   │   ├── SelectConfigForm.tsx
│   │   │   ├── SliderConfigForm.tsx
│   │   │   ├── TextareaConfigForm.tsx
│   │   │   ├── select-builder/
│   │   │   │   ├── ExtrasTab.tsx
│   │   │   │   ├── IdentificationTab.tsx
│   │   │   │   ├── MultiSelectConfigForm.tsx
│   │   │   │   ├── OptionsTab.tsx
│   │   │   │   ├── SettingsTab.tsx
├── modules/
│   ├── ComponentLibrary.tsx
│   ├── app-builder/ - Accurate logic using new services
│   │   ├── AppBuilder.tsx
│   ├── applet-builder/ - Accurate logic using new services
│   │   ├── AppletBuilder.tsx
│   │   ├── CreateAppletTab.tsx
│   │   ├── GroupSelector.tsx
│   │   ├── IconPickerDialog.tsx
│   │   ├── RecipeSelectDialog.tsx
│   │   ├── SavedAppletsTab.tsx
│   │   ├── types.ts
│   ├── field-builder/ - Accurate logic using new services
│   │   ├── FieldBuilder.tsx
│   │   ├── FieldComponentsList.tsx
│   │   ├── FieldRenderer.tsx
│   │   ├── OptionsManager.tsx
│   │   ├── PrimaryFieldBuilder.tsx
│   ├── group-builder/ - Accurate logic using new services
│   │   ├── AddFieldsDialog.tsx
│   │   ├── CreateGroupForm.tsx
│   │   ├── DeleteConfirmationDialog.tsx
│   │   ├── GroupBuilder.tsx
│   │   ├── RefreshFieldsDialog.tsx
│   │   ├── SavedGroupsList.tsx
├── previews/
│   ├── AppletPreviewCard.tsx
│   ├── AppPreviewCard.tsx
│   ├── PreviewConfig.tsx
├── service/ - The only services to be used (NO LOCAL STORAGE!)
│   ├── customAppletService.ts
│   ├── customAppService.ts
│   ├── fieldComponentService.ts
│   ├── fieldGroupService.ts
│   ├── index.ts


## Tasks:

We are transforming the ConfigBuilder to use database services instead of local storage and ensuring the proper data flows between steps. The App Configuration Builder allows users to create the UI for their custom apps.

### Completed Tasks ✅

1. **AppInfoStep Component Optimization** ✅
   - Optimized layout by combining related fields for better space usage
   - Improved slug generation logic with more efficient algorithm
   - Added layout selection capability
   - Moved creator field and controls to the preview section for better space utilization
   - Simplified UI for colors and icons
   - Fixed proper database validation for slug uniqueness

2. **AppletsConfigStep Integration** ✅
   - Fixed type safety with CustomAppConfig and CustomAppletConfig
   - Improved validation for slugs
   - Ensured proper handling of container arrays
   - Added ability to select from existing applets
   - Implemented proper handling of applet selection and data flow

3. **GroupsConfigStep Integration** ✅
   - Fixed type issues by using shortLabel instead of placeholder
   - Ensured proper typing for all properties
   - Fixed container mappings and references
   - Added overlay to select from existing groups
   - Implemented proper UI for viewing and selecting groups

4. **FieldsConfigStep Integration** ✅
   - Added proper ComponentType typing
   - Fixed componentProps handling
   - Updated integration with FieldConfigForms
   - Improved UI for managing fields

5. **FieldConfigForms Component Enhancement** ✅
   - Added support for both fieldType and type props for compatibility
   - Integrated with ComponentType from builder.types
   - Ensured component works with all field types

### Current Issues to Address 🔄

1. **ID Generation vs. Database IDs**
   - Need to adjust how IDs are generated and handled, as database should assign IDs
   - Need to ensure we handle this in the ConfigBuilder and all step components

2. **Multiple Applets Support**
   - Current UI doesn't fully facilitate adding multiple applets and managing the relationships
   - Need to consider implications for groups and fields with multiple applets

3. **ConfigBuilder.tsx Core Logic**
   - Still need to refactor the main ConfigBuilder component to use database services
   - Need to implement proper loading states and error handling
   - Need to update initialization from default values in builder.types.ts

### Next Steps (Prioritized) 🚀

1. **Refactor ConfigBuilder.tsx Core**
   - [ ] Replace local state management with database service calls
   - [ ] Implement loading states for database operations
   - [ ] Add proper error handling and recovery
   - [ ] Update initialization of form values from defaults
   - [ ] Ensure step transitions handle database state properly

2. **Fix ID Generation and Database Integration**
   - [ ] Update how IDs are generated and used across all step components
   - [ ] Implement proper creation/update logic using database services
   - [ ] Ensure all database operations are properly awaited and errors handled

3. **Enhance Live Preview**
   - [ ] Improve the preview to show real-time updates as changes are made
   - [ ] Add visual indicators for database operations (loading, success, error)
   - [ ] Implement optimistic UI updates for better UX
   - [ ] Create more comprehensive preview that shows the full app structure

4. **Multiple Applets Management**
   - [ ] Enhance UI to better support adding and managing multiple applets
   - [ ] Consider forking approach for groups/fields with multiple applets
   - [ ] Update data flow to handle multiple applet relationships
   - [ ] Add proper UI indicators for which applet is currently being modified

5. **Advanced Selection Features**
   - [ ] Enhance the existing applet/group selection overlays
   - [ ] Add search and filtering capabilities to selection overlays
   - [ ] Implement pagination for large lists of items
   - [ ] Add category/tag filtering if applicable

6. **Error Handling and Validation**
   - [ ] Add comprehensive error handling for database operations
   - [ ] Implement validation for all form inputs before saving
   - [ ] Add error recovery options for failed operations
   - [ ] Show meaningful error messages to users

7. **Performance Optimizations**
   - [ ] Use React.memo and useMemo for expensive operations
   - [ ] Implement debouncing for form inputs to reduce unnecessary operations
   - [ ] Add virtualization for large lists

## Implementation Vision

### Core Database Integration

The most important next step is to fully integrate with the database services. This means:

1. Replacing all local state in ConfigBuilder.tsx with proper service calls
2. Implementing loading states and error handling throughout
3. Ensuring data consistency between steps by using the database as the single source of truth

### Live Preview Enhancement

The live preview could be significantly enhanced to:

1. Show a complete representation of the app being built
2. Provide interactive elements that mirror the actual app behavior
3. Update in real-time as changes are made to any part of the configuration
4. Allow direct editing of elements from the preview itself

### User Experience Improvements

To make the builder more user-friendly:

1. Add overlay tooltips and guides for first-time users
2. Implement undo/redo functionality for configuration changes
3. Add a "clone existing app" option for quick starts
4. Provide templates for common app patterns

The vision is to create a seamless builder experience where users can rapidly construct their app, see changes in real-time, and have confidence that their work is properly saved and validated at every step. 


This is a crucial architectural detail:
No foreign key relationships between applets, groups, and fields
Groups directly store field objects as JSON
Applets directly store group objects as JSON
The "compiled" version is a complete object that runs independently
Changes to components and groups don't automatically break existing functionality
Users explicitly "refresh" fields or groups when ready to update
This approach creates stability and version independence, which is extremely valuable. Let me think through how this should affect our implementation:
For ConfigBuilder.tsx Core Refactoring:
We need to ensure we're respecting this object-embedding pattern rather than relying on foreign key relationships
The stepper pattern needs careful handling - either:
Make users explicitly refresh (to match existing functionality)
Or auto-refresh when stepping forward (simpler UX in a builder context)
I lean toward auto-refresh in the stepper, since users are explicitly moving through a build process
For Database Integration:
When saving applets, we need to embed the full group objects
When saving groups, we need to embed the full field objects
We should review the existing refresh functionality in fieldGroupService and fieldComponentService
For Multiple Applet Support:
This architecture actually simplifies multiple applet support
Each applet is self-contained with its groups and fields
Changing one applet doesn't affect others