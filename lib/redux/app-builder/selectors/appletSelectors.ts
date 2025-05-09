import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux/store";
import { AppletBuilder } from "../types";
import { BrokerMapping, AppletSourceConfig, NeededBroker } from "@/features/applet/builder/builder.types";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
// ================================ Base Selectors ================================

// Base selector for the appletBuilder state
export const getAppletBuilderState = (state: RootState) => state.appletBuilder;

// Memoized selector for all applets
export const selectAllApplets = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => Object.values(appletBuilderState.applets)
);

// Memoized selector for a specific applet by ID
export const selectAppletById = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => applet || null
);

// ================================ Status Selectors ================================

// Memoized selector for applet loading state
export const selectAppletLoading = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.isLoading
);

// Memoized selector for applet error state
export const selectAppletError = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.error
);

// ================================ Applet Collection Selectors ================================

// Memoized selector for applets by a list of IDs
export const selectAppletsByIds = createSelector(
  [
    getAppletBuilderState,
    (_state: RootState, appletIds: string[]) => appletIds
  ],
  (appletBuilderState, appletIds) => {
    return appletIds
      .map(id => appletBuilderState.applets[id])
      .filter((applet): applet is AppletBuilder => applet !== null);
  }
);

// Memoized selector for applets associated with a specific app ID
export const selectAppletsByAppId = createSelector(
  [
    selectAllApplets,
    (_state: RootState, appId: string) => appId
  ],
  (applets, appId) => applets.filter(applet => applet.appId === appId)
);

// Memoized selector for applets NOT associated with a specific app ID
export const selectAppletsExcludingAppId = createSelector(
  [
    selectAllApplets,
    (_state: RootState, appId: string) => appId
  ],
  (applets, appId) => applets.filter(applet => applet.appId !== appId)
);

// Memoized selector for applets without an app assignment
export const selectUnassignedApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => !applet.appId)
);

// Memoized selector for local applets
export const selectLocalApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => applet.isLocal === true)
);

// ================================ Applet Container Selectors ================================

// Memoized selector for containers associated with an applet
export const selectContainersForApplet = (state: RootState, appletId: string) => {
  const applet = selectAppletById(state, appletId);
  return applet ? applet.containers : [];
};


// ================================ Dirty State Management ================================

// Memoized selector for dirty applets
export const selectDirtyApplets = createSelector(
  [selectAllApplets],
  (applets) => applets.filter(applet => applet.isDirty === true)
);

// Memoized selector for checking if there are unsaved changes
export const selectHasUnsavedAppletChanges = createSelector(
  [selectAllApplets],
  (applets) => applets.some(applet => applet.isDirty === true)
);

// ================================ Active/New Applet Selectors ================================

// Memoized selector for new applet ID
export const selectNewAppletId = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.newAppletId
);

// Memoized selector for active applet ID
export const selectActiveAppletId = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.activeAppletId
);


// Memoized selector for the active applet
export const selectActiveApplet = createSelector(
  [
    getAppletBuilderState,
    selectActiveAppletId
  ],
  (appletBuilderState, activeAppletId) => 
    activeAppletId ? appletBuilderState.applets[activeAppletId] || null : null
);

// Memoized selector to check if active applet is dirty
export const selectIsActiveAppletDirty = createSelector(
  [selectActiveApplet],
  (activeApplet) => activeApplet ? activeApplet.isDirty === true : false
);

export const selectIsAppletDirtyById = (state: RootState, id: string) => {
  const applet = state.appletBuilder.applets[id];
  return applet ? applet.isDirty === true : false;
};
// ================================ Applet Property Selectors ================================

// Explicit selectors for each AppletBuilder property
export const selectAppletId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.id : null)
);

export const selectAppletName = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.name : null)
);

export const selectAppletDescription = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.description : null)
);

export const selectAppletSlug = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.slug : null)
);

export const selectAppletIcon = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appletIcon : null)
);

export const selectAppletSubmitText = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appletSubmitText : null)
);

export const selectAppletCreator = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.creator : null)
);

export const selectAppletPrimaryColor = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.primaryColor : null)
);

export const selectAppletAccentColor = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.accentColor : null)
);

export const selectAppletLayoutType = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.layoutType : null)
);

export const selectAppletContainers = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.containers : null)
);


export const selectAppletResultComponentConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.resultComponentConfig : null)
);

export const selectAppletNextStepConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.nextStepConfig : null)
);

export const selectAppletCompiledRecipeId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.compiledRecipeId : null)
);

export const selectAppletSubcategoryId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.subcategoryId : null)
);

export const selectAppletImageUrl = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.imageUrl : null)
);

export const selectAppletAppId = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.appId : null)
);


// ================================ Security and Status Selectors ================================

export const selectAppletIsPublic = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isPublic : null)
);


export const selectAppletAuthenticatedRead = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.authenticatedRead : null)
);

export const selectAppletPublicRead = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.publicRead : null)
);

export const selectAppletIsDirty = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isDirty : null)
);

export const selectAppletIsLocal = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.isLocal : null)
);

export const selectAppletSlugStatus = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.slugStatus : 'unchecked')
);


// ==== Just a store for temporary fetched source configs from random recipes ====

export const selectTempSourceConfigList = createSelector(
  [getAppletBuilderState],
  (appletBuilderState) => appletBuilderState.tempSourceConfigList
);




// ================================ Source Config Selectors ================================

export const selectAppletDataSourceConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet ? applet.dataSourceConfig : null)
);

export const selectAppletSourceConfig = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet && applet.dataSourceConfig ? applet.dataSourceConfig : null)
);

// Find a source config by config ID within an applet
export const selectSourceConfigByConfigId = createSelector(
  [
    (state: RootState, appletId: string, configId: string) => {
      const applet = getAppletBuilderState(state).applets[appletId];
      return { applet, configId };
    }
  ],
  ({ applet, configId }) => {
    if (!applet || !applet.dataSourceConfig || !applet.dataSourceConfig.config) return null;
    return applet.dataSourceConfig.config && 'id' in applet.dataSourceConfig.config && 
      applet.dataSourceConfig.config.id === configId ? applet.dataSourceConfig.config : null;
  }
);

// Find a source config by source type within an applet
export const selectSourceConfigBySourceType = createSelector(
  [
    (state: RootState, appletId: string, sourceType: string) => {
      const applet = getAppletBuilderState(state).applets[appletId];
      return { applet, sourceType };
    }
  ],
  ({ applet, sourceType }) => {
    if (!applet || !applet.dataSourceConfig) return null;
    return applet.dataSourceConfig.sourceType === sourceType ? applet.dataSourceConfig : null;
  }
);

// Get all source configs for a specific source type across all applets
export const selectAllSourceConfigsBySourceType = createSelector(
  [
    selectAllApplets,
    (_state: RootState, sourceType: string) => sourceType
  ],
  (applets, sourceType) => {
    return applets.reduce((configs, applet) => {
      if (applet.dataSourceConfig && applet.dataSourceConfig.sourceType === sourceType) {
        configs.push(applet.dataSourceConfig);
      }
      return configs;
    }, [] as AppletSourceConfig[]);
  }
);


// ================================ Broker Mapping Selectors ================================

export const selectAppletBrokerMappings = createSelector(
  [(state: RootState, id: string) => getAppletBuilderState(state).applets[id]],
  (applet) => (applet && applet.brokerMap ? applet.brokerMap : null)
);


export const selectAppletBrokerFieldIds = createSelector(
  [selectAppletBrokerMappings],
  (brokerMap): string[] => {
    if (!brokerMap) return [];
    
    // Extract only the fieldIds from the broker mappings
    return Object.values(brokerMap).map(mapping => mapping.fieldId);
  }
);


// Get a specific broker mapping by broker ID within a specific applet
export const selectBrokerMappingByBrokerId = createSelector(
  [
    (state: RootState, appletId: string, brokerId: string) => {
      const applet = getAppletBuilderState(state).applets[appletId];
      return { applet, brokerId };
    }
  ],
  ({ applet, brokerId }) => {
    if (!applet || !applet.brokerMap || applet.brokerMap.length === 0) return null;
    return applet.brokerMap.find(mapping => mapping.brokerId === brokerId) || null;
  }
);

// Get the fieldId mapped to a specific broker ID within an applet
export const selectFieldIdByBrokerId = createSelector(
  [
    (state: RootState, appletId: string, brokerId: string) => {
      const mapping = selectBrokerMappingByBrokerId(state, appletId, brokerId);
      return mapping;
    }
  ],
  (mapping) => {
    if (!mapping) return null;
    return mapping.fieldId;
  }
);

// Get the field label for a specific broker ID within an applet
export const selectFieldLabelByBrokerId = createSelector(
  [
    (state: RootState, appletId: string, brokerId: string) => {
      const fieldId = selectFieldIdByBrokerId(state, appletId, brokerId);
      return { state, fieldId };
    }
  ],
  ({ state, fieldId }) => {
    if (!fieldId) return null;
    return selectFieldLabel(state, fieldId);
  }
);



// ================================ Needed Broker Selectors ================================

// Get all broker mappings for a specific broker ID across all applets
export const selectAllBrokerMappingsByBrokerId = createSelector(
  [
    selectAllApplets,
    (_state: RootState, brokerId: string) => brokerId
  ],
  (applets, brokerId) => {
    return applets.reduce((mappings, applet) => {
      if (applet.brokerMap && applet.brokerMap.length > 0) {
        const match = applet.brokerMap.find(mapping => mapping.brokerId === brokerId);
        if (match) mappings.push(match);
      }
      return mappings;
    }, [] as BrokerMapping[]);
  }
);


// 1. Select all needed brokers for a specific applet
export const selectAllNeededBrokers = createSelector(
  [(state: RootState, appletId: string) => selectAppletDataSourceConfig(state, appletId)],
  (dataSourceConfig: AppletSourceConfig | null) => {
    if (
      !dataSourceConfig ||
      !dataSourceConfig.config ||
      !('neededBrokers' in dataSourceConfig.config)
    ) {
      return [];
    }
    return dataSourceConfig.config.neededBrokers || [] as NeededBroker[];
  }
);

// 2. Select unmatched needed brokers (needed but not in brokerMap)
export const selectUnmatchedNeededBrokers = createSelector(
  [
    (state: RootState, appletId: string) => selectAllNeededBrokers(state, appletId),
    (state: RootState, appletId: string) => selectAppletBrokerMappings(state, appletId),
  ],
  (neededBrokers: NeededBroker[], brokerMap: BrokerMapping[] | null) => {
    if (!brokerMap || brokerMap.length === 0) {
      return neededBrokers;
    }
    const mappedBrokerIds = new Set(brokerMap.map((mapping) => mapping.brokerId));
    return neededBrokers.filter((broker) => !mappedBrokerIds.has(broker.id));
  }
);

// 3. Select count of all needed brokers
export const selectNeededBrokerCount = createSelector(
  [(state: RootState, appletId: string) => selectAllNeededBrokers(state, appletId)],
  (neededBrokers: NeededBroker[]) => neededBrokers.length
);

// 4. Select count of unmatched needed brokers
export const selectUnmatchedNeededBrokerCount = createSelector(
  [(state: RootState, appletId: string) => selectUnmatchedNeededBrokers(state, appletId)],
  (unmatchedBrokers: NeededBroker[]) => unmatchedBrokers.length
);

// 5. Check broker map integrity (no duplicate broker IDs in brokerMap)
export const selectIsBrokerMapIntegrity = createSelector(
  [(state: RootState, appletId: string) => selectAppletBrokerMappings(state, appletId)],
  (brokerMap: BrokerMapping[] | null) => {
    if (!brokerMap || brokerMap.length === 0) {
      return true; // Empty or null map is valid
    }
    const brokerIds = brokerMap.map((mapping) => mapping.brokerId);
    const uniqueBrokerIds = new Set(brokerIds);
    return brokerIds.length === uniqueBrokerIds.size; // True if no duplicates
  }
);

// Select required needed brokers
export const selectRequiredNeededBrokers = createSelector(
  [(state: RootState, appletId: string) => selectAllNeededBrokers(state, appletId)],
  (neededBrokers: NeededBroker[]) => neededBrokers.filter((broker) => broker.required)
);

// Select count of required needed brokers
export const selectRequiredNeededBrokerCount = createSelector(
  [(state: RootState, appletId: string) => selectRequiredNeededBrokers(state, appletId)],
  (requiredBrokers: NeededBroker[]) => requiredBrokers.length
);

// Check if all required brokers are mapped
export const selectIsAllRequiredBrokersMapped = createSelector(
  [
    (state: RootState, appletId: string) => selectRequiredNeededBrokers(state, appletId),
    (state: RootState, appletId: string) => selectAppletBrokerMappings(state, appletId),
  ],
  (requiredBrokers: NeededBroker[], brokerMappings: BrokerMapping[] | null) => {
    if (!brokerMappings || requiredBrokers.length === 0) {
      return true; // No required brokers or no mappings means valid
    }
    const mappedBrokerIds = new Set(brokerMappings.map((mapping) => mapping.brokerId));
    return requiredBrokers.every((broker) => mappedBrokerIds.has(broker.id));
  }
);

// Select count of mapped brokers
export const selectMappedBrokerCount = createSelector(
  [
    (state: RootState, appletId: string) => selectNeededBrokerCount(state, appletId),
    (state: RootState, appletId: string) => selectUnmatchedNeededBrokerCount(state, appletId),
  ],
  (neededBrokerCount: number, unmatchedBrokerCount: number) => neededBrokerCount - unmatchedBrokerCount
);

// Check if a specific broker is mapped
export const selectIsBrokerMapped = createSelector(
  [
    (state: RootState, appletId: string, brokerId: string) => selectAppletBrokerMappings(state, appletId),
    (_state: RootState, _appletId: string, brokerId: string) => brokerId
  ],
  (brokerMappings, brokerId) => {
    if (!brokerMappings || brokerMappings.length === 0) {
      return false;
    }
    return brokerMappings.some((mapping) => mapping.brokerId === brokerId);
  }
);


// Return sorted brokers with unmapped ones first, then required status, then alphabetically
export const selectBrokerMappedStatus = createSelector(
  [
    (state: RootState, appletId: string) => selectAllNeededBrokers(state, appletId),
    (state: RootState, appletId: string) => selectAppletBrokerMappings(state, appletId)
  ],
  (neededBrokers, brokerMappings) => {
    // Create a set of mapped broker IDs for efficient lookup
    const mappedBrokerIds = new Set(
      brokerMappings ? brokerMappings.map(mapping => mapping.brokerId) : []
    );
    
    // Return a stable reference - an object mapping broker IDs to mapped status
    return neededBrokers.reduce((acc, broker) => {
      acc[broker.id] = mappedBrokerIds.has(broker.id);
      return acc;
    }, {} as Record<string, boolean>);
  }
);

export const selectSortedNeededBrokers = createSelector(
  [
    (state: RootState, appletId: string) => selectAllNeededBrokers(state, appletId),
    (state: RootState, appletId: string) => selectBrokerMappedStatus(state, appletId)
  ],
  (neededBrokers, mappedStatus) => {
    // Create a copy to avoid mutating the original array
    return [...neededBrokers].sort((a, b) => {
      const isAMapped = mappedStatus[a.id] || false;
      const isBMapped = mappedStatus[b.id] || false;
      
      // Primary sort: unmapped brokers first
      if (isAMapped && !isBMapped) return 1;
      if (!isAMapped && isBMapped) return -1;
      
      // Secondary sort: required brokers first within each group
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      
      // Tertiary sort: alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }
);

// Calculate broker mapping completion percentage
export const selectBrokerMappingCompletionPercentage = createSelector(
  [
    (state: RootState, appletId: string) => selectNeededBrokerCount(state, appletId),
    (state: RootState, appletId: string) => selectMappedBrokerCount(state, appletId)
  ],
  (neededBrokerCount: number, mappedBrokerCount: number) => {
    if (neededBrokerCount === 0) return 100; // If no brokers needed, consider it 100% complete
    return Math.round((mappedBrokerCount / neededBrokerCount) * 100);
  }
);

// ================================ Used Fields Selectors ================================

// Returns a Set of all field IDs that are used in any container in the applet
export const selectAllUsedFieldsInApplet = createSelector(
  [(state: RootState, appletId: string) => selectContainersForApplet(state, appletId)],
  (containers) => {
    // Create a Set to track unique field IDs
    const usedFieldIds = new Set<string>();
    
    // Process each container
    containers.forEach(container => {
      // Skip containers without fields
      if (!container.fields) return;
      
      // Add each field ID to the set
      container.fields.forEach(field => {
        usedFieldIds.add(field.id);
      });
    });
    
    return usedFieldIds;
  }
);

