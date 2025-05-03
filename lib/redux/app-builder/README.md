# App Builder Redux Implementation

## Progress

### Completed
- Created Redux slices, actions, and thunks for Apps, Applets, Containers (Groups), and Fields
- Implemented selectors with memoization for optimized state access
- Converted the AppInfoStep component to use Redux for state management
- Added proper dirty state tracking in slices
- Added slug uniqueness checking and status tracking
- Updated ConfigBuilder to work with the Redux-enabled AppInfoStep

### Current Implementation
The following components now use Redux:
- AppInfoStep: For creating and editing app information
- SelectAppStep: For selecting existing apps
- SmartAppListWrapper/SmartAppList: For displaying and interacting with apps

## Next Steps

### Step 1: UpdateAppletsConfigStep
- Convert AppletsConfigStep to use Redux for state management
- Remove local applet state from ConfigBuilder
- Use applet selectors and thunks for data fetching and updates

### Step 2: Update GroupsConfigStep
- Convert GroupsConfigStep to use Redux for state management
- Remove local group state from ConfigBuilder
- Use container selectors and thunks for data fetching and updates

### Step 3: Update FieldsConfigStep
- Convert FieldsConfigStep to use Redux for state management
- Remove local field state from ConfigBuilder
- Use field selectors and thunks for data fetching and updates

### Step 4: Update PreviewConfig
- Convert PreviewConfig to use Redux for state management
- Use selectors to retrieve app, applet, container, and field data

### Step 5: Clean up ConfigBuilder
- Remove all remaining local state except for UI-specific state
- Ensure proper step navigation with Redux state
- Implement dirty state checking for all steps

## Architecture Notes

### State Organization
- Apps, Applets, Containers, and Fields are all stored in separate slices
- Foreign key relationships are maintained:
  - Applets have an app_id foreign key to apps
  - Containers (Groups) are compiled and stored in applets
  - Fields are compiled and stored in containers

### State Updates
- All updates are performed via thunks or direct actions
- Thunks handle asynchronous operations and updating the database
- Actions handle local state updates without database interactions

### Selectors
- Base selectors: Get the entire state object
- Entity selectors: Get entities by ID or lists of entities
- Relationship selectors: Get related entities (e.g., applets by app ID)
- Status selectors: Get loading, error, and dirty state information

## Best Practices
- Maintain the single source of truth principle by storing all state in Redux
- Use selectors to retrieve state instead of accessing the state directly
- Use thunks for all async operations
- Use actions for local state updates
- Keep components focused on rendering and user interaction, not state management 