// import React, { useEffect, useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { 
//   selectComponentInstance,
//   selectBrokerForComponentInstance,
//   selectComponentInstancesForContainer,
//   selectBrokerValue,
//   selectAllBrokerValues
// } from '@/lib/redux/applets/selectors/appletSelectors';

// import { 
//   createComponentWithBroker,
//   handleComponentChange,
//   loadApplet,
//   getBrokerValuesForWorkflow
// } from '@/lib/redux/applets/thunks/appletThunks';
// import { useAppDispatch, useAppSelector } from '../../hooks';


// export const useComponentBroker = (instanceId) => {
//     const dispatch = useAppDispatch();
//     const selectors = useAppSelector(state => state.componentDefinitions);
//     const component = selectors.instances[instanceId];
//     const brokerValue = selectors.componentToBrokerMap.find(map => map.instanceId === instanceId)?.brokerId;
    
//     const handleChange = (newValue, additionalMetadata) => {
//       dispatch(handleComponentChange(instanceId, newValue, additionalMetadata));
//     };
    
//     return {
//       component,
//       value: brokerValue?.value,
//       metadata: brokerValue?.metadata,
//       handleChange
//     };
//   };
  
//   // Hook to work with Container components
//   export const useContainer = (containerId) => {
//     const dispatch = useDispatch();
//     const container = useSelector(state => state.componentDefinitions.containers[containerId]);
//     const componentInstances = useSelector(state => selectComponentInstancesForContainer(state, containerId));
    
//     return {
//       container,
//       componentInstances
//     };
//   };
  
//   // Hook to work with an entire Applet
//   export const useApplet = (appletId) => {
//     const dispatch = useDispatch();
//     const applet = useSelector(state => state.componentDefinitions.applets[appletId]);
//     const containers = useSelector(state => {
//       if (!applet) return [];
//       return (applet.containers || [])
//         .map(container => state.componentDefinitions.containers[container.id])
//         .filter(Boolean);
//     });
    
//     const loadAppletData = (initialValues) => {
//       if (applet) {
//         dispatch(loadApplet(applet, initialValues));
//       }
//     };
    
//     const getWorkflowValues = () => {
//       if (!applet) return {};
      
//       // Get all broker mappings related to this applet's components
//       const brokerIds = Object.values(state.componentDefinitions.componentToBrokerMap)
//         .map(mapping => mapping.brokerId);
        
//       // Get all broker values
//       return dispatch(getBrokerValuesForWorkflow(brokerIds));
//     };
    
//     return {
//       applet,
//       containers,
//       loadAppletData,
//       getWorkflowValues
//     };
//   };
  