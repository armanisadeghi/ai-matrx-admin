import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { ContainerBuilder } from "../types";

// ================================ Base Selectors ================================
// Base selector for the containerBuilder state
export const getContainerBuilderState = (state: RootState) => state.containerBuilder;

// Memoized selector for all containers
export const selectAllContainers = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => Object.values(containerBuilderState.containers)
);

// Memoized selector for all container IDs
export const selectAllContainerIds = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => Object.keys(containerBuilderState.containers)
);

// Selector for a specific container by ID
export const selectContainerById = (state: RootState, id?: string | null) => 
  id ? getContainerBuilderState(state).containers[id] : undefined;

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
// Selector for fields associated with a container
export const selectFieldsForContainer = (state: RootState, containerId?: string | null) => {
  if (!containerId) return [];
  const container = selectContainerById(state, containerId);
  return container?.fields || [];
};

// Selector for a specific field within a container
export const selectFieldById = (state: RootState, containerId?: string | null, fieldId?: string | null) => {
  if (!containerId || !fieldId) return undefined;
  const container = selectContainerById(state, containerId);
  return container?.fields.find(field => field.id === fieldId);
};

// ================================ Container Collection Selectors ================================
// Selector for containers by a list of IDs
export const selectContainersByIds = createSelector(
  [
    getContainerBuilderState,
    (_state: RootState, containerIds?: string[] | null) => containerIds || []
  ],
  (containerBuilderState, containerIds) => {
    if (!containerIds?.length) return [];
    
    return containerIds
      .map(id => containerBuilderState.containers[id])
      .filter(Boolean); // Typescript will infer the type correctly
  }
);

// Memoized selector for public containers
export const selectPublicContainers = createSelector(
  [selectAllContainers],
  (containers) => containers.filter(container => container.isPublic)
);

// Memoized selector for local containers
export const selectLocalContainers = createSelector(
  [selectAllContainers],
  (containers) => containers.filter(container => container.isLocal === true)
);

// ================================ Dirty State Management ================================
// Memoized selector for dirty containers
export const selectDirtyContainers = createSelector(
  [selectAllContainers],
  (containers) => containers.filter(container => container.isDirty === true)
);

// Memoized selector for checking if there are unsaved changes
export const selectHasUnsavedContainerChanges = createSelector(
  [selectAllContainers],
  (containers) => containers.some(container => container.isDirty === true)
);

// Selector for container dirty status
export const selectContainerDirtyStatus = (state: RootState, id?: string | null) => {
  if (!id) return false;
  return selectContainerById(state, id)?.isDirty || false;
};

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
    activeId ? containerBuilderState.containers[activeId] : undefined
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
    newId ? containerBuilderState.containers[newId] : undefined
);