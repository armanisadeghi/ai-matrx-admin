import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { ContainerBuilder } from "../types";

// Base selector for the containerBuilder state
const getContainerBuilderState = (state: RootState) => state.containerBuilder;

// Memoized selector for all containers
export const selectAllContainers = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => Object.values(containerBuilderState.containers)
);

// Memoized selector for a specific container by ID
export const selectContainerById = createSelector(
  [(state: RootState, id: string) => getContainerBuilderState(state).containers[id]],
  (container) => container || null
);

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

// Memoized selector for fields associated with a container
export const selectFieldsForContainer = createSelector(
  [(state: RootState, containerId: string) => selectContainerById(state, containerId)],
  (container) => container ? container.fields : []
);

// Memoized selector for containers by a list of IDs
export const selectContainersByIds = createSelector(
  [
    getContainerBuilderState,
    (_state: RootState, containerIds: string[]) => containerIds
  ],
  (containerBuilderState, containerIds) => {
    return containerIds
      .map(id => containerBuilderState.containers[id])
      .filter((container): container is ContainerBuilder => container !== null);
  }
);

// Memoized selector for public containers
export const selectPublicContainers = createSelector(
  [selectAllContainers],
  (containers) => containers.filter(container => container.isPublic)
); 


// Basic selectors
export const selectContainerState = (state: RootState) => state.containerBuilder;

// Active container selectors
export const selectActiveContainerId = (state: RootState) => state.containerBuilder?.activeContainerId;
export const selectActiveContainer = (state: RootState) => {
    const activeId = state.containerBuilder?.activeContainerId;
    return activeId ? state.containerBuilder?.containers[activeId] : null;
};

// New container selectors
export const selectNewContainerId = (state: RootState) => state.containerBuilder?.newContainerId;
export const selectNewContainer = (state: RootState) => {
    const newId = state.containerBuilder?.newContainerId;
    return newId ? state.containerBuilder?.containers[newId] : null;
};

export const selectFieldById = (state: RootState, containerId: string, fieldId: string) => {
    const container = state.containerBuilder?.containers[containerId];
    if (!container) return null;
    return container.fields.find(field => field.id === fieldId) || null;
};

// Status selectors
export const selectDirtyContainers = (state: RootState) => 
    selectAllContainers(state).filter(container => (container as ContainerBuilder).isDirty === true);

export const selectHasUnsavedContainerChanges = (state: RootState) => 
    selectAllContainers(state).some(container => (container as ContainerBuilder).isDirty === true);

export const selectLocalContainers = (state: RootState) => 
    selectAllContainers(state).filter(container => (container as ContainerBuilder).isLocal === true);

export const selectContainerDirtyStatus = (state: RootState, id: string) => 
    state.containerBuilder?.containers[id]?.isDirty || false;

