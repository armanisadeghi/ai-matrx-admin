import { componentDefinitionsSlice } from "./slices/componentDefinitionsSlice";

// Actions
export const {
    setDefinitions,
    addDefinition,
    updateDefinition,
    removeDefinition,
    createComponentInstance,
    updateComponentInstance,
    removeComponentInstance,
    setContainers,
    addContainer,
    updateContainer,
    removeContainer,
    setApplets,
    addApplet,
    updateApplet,
    removeApplet,
    mapComponentToBroker,
    unmapComponentFromBroker,
} = componentDefinitionsSlice.actions;


// Setup reducers
export const componentDefinitionsReducer = componentDefinitionsSlice.reducer;
