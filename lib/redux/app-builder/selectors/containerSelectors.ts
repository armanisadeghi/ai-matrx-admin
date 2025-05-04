import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { ContainerBuilder } from "../types";

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

// Memoized selector for the active container ID
export const selectActiveContainerId = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.activeContainerId
);

// Memoized selector for the active container
export const selectActiveContainer = createSelector(
  [getContainerBuilderState, selectActiveContainerId],
  (containerBuilderState, activeId) => activeId ? containerBuilderState.containers[activeId] : null
);

// Memoized selector for the new container ID
export const selectNewContainerId = createSelector(
  [getContainerBuilderState],
  (containerBuilderState) => containerBuilderState.newContainerId
);

// Memoized selector for the new container
export const selectNewContainer = createSelector(
  [getContainerBuilderState, selectNewContainerId],
  (containerBuilderState, newId) => newId ? containerBuilderState.containers[newId] : null
);

// Memoized selector for a specific field within a container
export const selectFieldById = createSelector(
  [(state: RootState, containerId: string, fieldId: string) => {
    const container = getContainerBuilderState(state).containers[containerId];
    return container ? container.fields.find(field => field.id === fieldId) : null;
  }],
  (field) => field || null
);

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

// Memoized selector for local containers
export const selectLocalContainers = createSelector(
  [selectAllContainers],
  (containers) => containers.filter(container => container.isLocal === true)
);

// Memoized selector for container dirty status
export const selectContainerDirtyStatus = createSelector(
  [(state: RootState, id: string) => getContainerBuilderState(state).containers[id]],
  (container) => container?.isDirty || false
);

