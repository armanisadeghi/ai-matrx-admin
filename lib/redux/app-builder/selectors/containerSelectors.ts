import { RootState } from "@/lib/redux";
import { ContainerBuilder } from "../types";

// Base selector for the containerBuilder state
const getContainerBuilderState = (state: RootState) => state.containerBuilder;

// Selector for all containers
export const selectAllContainers = (state: RootState): ContainerBuilder[] => Object.values(getContainerBuilderState(state).containers);

// Selector for a specific container by ID
export const selectContainerById = (state: RootState, id: string): ContainerBuilder | null => getContainerBuilderState(state).containers[id] || null;

// Selector for container loading state
export const selectContainerLoading = (state: RootState): boolean => getContainerBuilderState(state).isLoading;

// Selector for container error state
export const selectContainerError = (state: RootState): string | null => getContainerBuilderState(state).error;

// Selector for fields associated with a container
export const selectFieldsForContainer = (state: RootState, containerId: string) => {
  const container = selectContainerById(state, containerId);
  return container ? container.fields : [];
};

// Selector for containers by a list of IDs
export const selectContainersByIds = (state: RootState, containerIds: string[]): ContainerBuilder[] => {
  return containerIds
    .map(id => selectContainerById(state, id))
    .filter((container): container is ContainerBuilder => container !== null);
};

// Selector for public containers
export const selectPublicContainers = (state: RootState): ContainerBuilder[] => {
  return selectAllContainers(state).filter(container => container.isPublic);
}; 