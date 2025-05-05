# App Builder Redux Implementation

"@/lib/redux/app-builder/
              ├── README.md
              ├── types.ts
              ├── selectors/
              │   ├── appletSelectors.ts
              │   ├── appSelectors.ts
              │   ├── containerSelectors.ts
              │   ├── fieldSelectors.ts
              ├── service/
              │   ├── customAppletService.ts
              │   ├── customAppService.ts
              │   ├── fieldComponentService.ts
              │   ├── fieldGroupService.ts
              │   ├── index.ts
              │   ├── tasks.md
              ├── slices/
              │   ├── appBuilderSlice.ts
              │   ├── appletBuilderSlice.ts
              │   ├── containerBuilderSlice.ts
              │   ├── fieldBuilderSlice.ts
              ├── thunks/
              │   ├── appBuilderThunks.ts
              │   ├── appletBuilderThunks.ts
              │   ├── containerBuilderThunks.ts
              │   ├── fieldBuilderThunks.ts
              ├── utils/

## Additional Key Resources:
- Core types: features/applet/builder/builder.types.ts


## Overview
- This system allows users to build the configurations that allow our system to run custom apps.
- App: Simple a wrapper that holds multiple 'applets' and provides custom labels, header, colors, and applet links.
- Applet: Connected to a workflow (Compiled Recipes, Brokers, and more) - The builder is not concerned with this logic. Only the layout and display.
- Containers (AKA Field Groups): A simple container that holds groups of field components together for rendering fields as groups within forms
- Fields: Custom Components with a full definition fully responsible for rendering themselves, managing their own state and directly updating 'broker values'
- Broker Values: Brokers are the 'magic' to this system. A broker map defines all of the edges of a workflow and brokers are global using a uuid. Setting a series of broker values is all it takes to execute incredibly complex workflows run by the Python backend.

## Redux overview:
- Each slice must have a simple and direct way to start, edit and save (apps, applets, containers and fields)
- A single save action must cover both updates and saving new
- The creation process must start with an action which starts creation in redux state, assigns a uuid and sets any necessary defaults.
- Updates are handled ONLY through direct, small, individual updates to small pieces of state instead of larger object updates.
- State is consumed directly using individual selectors for each small piece of state

## Redux Hooks:
- lib/redux/hooks.ts
- Required to use these, instead of the standard untyped versions: useAppDispatch, useAppSelectors, and useAppStore

## Selectors Pattern:
- All selectors are memoized using createSelector to prevent unnecessary re-renders
- Base selectors access state directly, while derived selectors build on others
- Every property has a dedicated selector (e.g., selectAppletName, selectContainerLabel)
- Avoid direct filtering/mapping operations that create new references in component code
- Use the provided selectors in the selectors/ directory instead of accessing state directly

## Unified Save Approach:
- Both appletBuilderSlice and containerBuilderSlice implement a unified save pattern:
  - `saveAppletThunk` / `saveContainerThunk` - Handles both creation and updates
  - `saveContainerAndUpdateAppletThunk` - Saves a container and updates its parent applet
- All save operations handle:
  - Replacing temporary IDs with server IDs
  - Setting isDirty and isLocal flags
  - Recompiling dependent entities

## Entity Relationships & Compilation Process
- **Containment vs. Foreign Keys**: 
  - Containers are stored directly within Applets as embedded objects, not by reference
  - Fields are stored directly within Containers as embedded objects, not by reference
  - This ensures updating fields or containers won't break production applets

- **Recompilation Process**:
  - When updating a container, its parent applet needs recompilation
  - When updating a field, its parent container (and applet) needs recompilation
  - Dedicated thunks exist to recompile a single container or all containers in an applet

- **Component Responsibility**:
  - UI components managing updates must be "smart" enough to trigger recompilation
  - Context is critical - components need to know what entity they're updating and trigger the appropriate recompilation

- **Creation and Compilation Flow**:
  1. Fields are created and managed independently
  2. Fields are compiled and stored inside containers
  3. Containers are compiled and stored inside applets
  4. Applets are compiled and linked to apps (via foreign key)

## ID Generation:
- All new entity IDs are generated using UUID v4
- This ensures consistency and prevents conflicts when creating multiple items locally
- This applies to apps, applets, containers, and fields