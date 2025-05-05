import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { ContainerBuilder } from "../types";

// ================================ Constants for Reference Stability ================================
// Use these constants to ensure reference stability with proper typing
const EMPTY_OBJECT = {} as Record<string, never>;
const EMPTY_ARRAY = [] as const;

// Type-safe empty object function to preserve return types
function emptyObject<T>(): T {
  return {} as T;
}

// Type-safe empty array function to preserve return types
function emptyArray<T>(): T[] {
  return [] as T[];
}

// ================================ Base Selectors ================================

// Base selector for the containerBuilder state
export const getContainerBuilderState = (state: RootState) => state.containerBuilder;

// Memoized selector for all containers
export const selectAllContainers = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => Object.values(containerBuilderState.containers)
);

// Memoized selector for all container IDs with stable reference
export const selectAllContainerIds = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => {
    const { containers } = containerBuilderState;
    return Object.keys(containers);
  }
);

// Memoized selector for a specific container by ID
export const selectContainerById = createSelector(
  [(state: RootState, id?: string | null) => id ? getContainerBuilderState(state).containers[id] : undefined],
  (container) => container || emptyObject<ContainerBuilder>()
);

// ================================ Status Selectors ================================

// Memoized selector for container loading state
export const selectContainerLoading = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.isLoading
);

// Memoized selector for container error state
export const selectContainerError = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.error
);

// ================================ Container Field Selectors ================================

// Memoized selector for fields associated with a container
export const selectFieldsForContainer = createSelector(
  [(state: RootState, containerId?: string | null) => containerId ? selectContainerById(state, containerId) : null],
  (container) => container?.fields || emptyArray()
);

// Memoized selector for a specific field within a container
export const selectFieldById = createSelector(
  [(state: RootState, containerId?: string | null, fieldId?: string | null) => {
    if (!containerId || !fieldId) return null;
    const container = getContainerBuilderState(state).containers[containerId];
    return container ? container.fields.find(field => field.id === fieldId) : null;
  }],
  (field) => field || emptyObject()
);

// ================================ Container Collection Selectors ================================

// Memoized selector for containers by a list of IDs
export const selectContainersByIds = createSelector(
  [
    getContainerBuilderState,
    (_state: RootState, containerIds?: string[] | null) => containerIds || emptyArray<string>()
  ],
  (containerBuilderState, containerIds) => {
    if (!containerIds || containerIds.length === 0) {
      return emptyArray<ContainerBuilder>();
    }
    
    const result = containerIds
      .map(id => containerBuilderState.containers[id])
      .filter((container): container is ContainerBuilder => container !== null && container !== undefined);
      
    return result.length ? result : emptyArray<ContainerBuilder>();
  }
);

// Memoized selector for public containers
export const selectPublicContainers = createSelector(
  [selectAllContainers],
  (containers) => {
    const result = containers.filter(container => container.isPublic);
    return result.length ? result : emptyArray<ContainerBuilder>();
  }
); 

// Memoized selector for local containers
export const selectLocalContainers = createSelector(
  [selectAllContainers],
  (containers) => {
    const result = containers.filter(container => container.isLocal === true);
    return result.length ? result : emptyArray<ContainerBuilder>();
  }
);

// ================================ Dirty State Management ================================

// Memoized selector for dirty containers
export const selectDirtyContainers = createSelector(
  [selectAllContainers],
  (containers) => {
    const result = containers.filter(container => container.isDirty === true);
    return result.length ? result : emptyArray<ContainerBuilder>();
  }
);

// Memoized selector for checking if there are unsaved changes
export const selectHasUnsavedContainerChanges = createSelector(
  [selectAllContainers],
  (containers) => containers.some(container => container.isDirty === true)
);

// Memoized selector for container dirty status
export const selectContainerDirtyStatus = createSelector(
  [(state: RootState, id?: string | null) => id ? getContainerBuilderState(state).containers[id] : undefined],
  (container) => container?.isDirty || false
);

// ================================ Active Container Selectors ================================

// Memoized selector for the active container ID
export const selectActiveContainerId = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.activeContainerId || null
);

// Memoized selector for the active container
export const selectActiveContainer = createSelector(
  [getContainerBuilderState, selectActiveContainerId],
  (containerBuilderState, activeId) => 
    (activeId && containerBuilderState.containers[activeId]) || emptyObject<ContainerBuilder>()
);

// ================================ New Container Selectors ================================

// Memoized selector for the new container ID
export const selectNewContainerId = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.newContainerId || null
);

// Memoized selector for the new container
export const selectNewContainer = createSelector(
  [getContainerBuilderState, selectNewContainerId],
  (containerBuilderState, newId) => 
    (newId && containerBuilderState.containers[newId]) || emptyObject<ContainerBuilder>()
);

