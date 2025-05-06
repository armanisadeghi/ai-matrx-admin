import { componentDefinitionsSlice } from "./slices/componentDefinitionsSlice";
import { brokerValuesSlice } from "./slices/brokerValuesSlice";



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

export const {
    setBrokerValue,
    setBulkBrokerValues,
    removeBrokerValue,
    setTextValue,
    setNumberValue,
    setSelectValue,
    setCheckboxValue,
    setDateValue,
    setSliderValue,
    setJsonValue,
    clearBrokerHistory,
    undoBrokerChange,
    addNeededBroker,
    addNeededBrokers,
    removeNeededBroker,
    clearNeededBrokers,
    setLoading,
    setError,
} = brokerValuesSlice.actions;

// Setup reducers
export const componentDefinitionsReducer = componentDefinitionsSlice.reducer;
export const brokerValuesReducer = brokerValuesSlice.reducer;
