import { useEntitySelectionCrud } from '@/app/entities/hooks/crud/useCrudById';
import useTrackedCreateRecord from '@/app/entities/hooks/crud/useTrackedCreateRecord';
import { useUpdateFields } from '@/app/entities/hooks/crud/useUpdateFields';
import { useRefManager } from '@/lib/refs/hooks';
import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { BrokerSyncContextValue } from './types';
import { brokerSyncReducer, getNextAvailableColor } from './brokerSyncReducer';

const BrokerSyncContext = createContext<BrokerSyncContextValue | null>(null);

export const BrokerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const entityName = 'broker';
    // Core hooks for state management
    const { selectedRecordsOrDefaultsWithKeys, selectedRecordIds } = useEntitySelectionCrud(entityName);
    const { updateFields } = useUpdateFields(entityName);
    const refManager = useRefManager();
    const { startCreate, createRecord, getProgress, getFinalId } = useTrackedCreateRecord(entityName);

    // Enhanced broker tracking state
    interface BrokerInstance {
        blockId: string;
        editorId: string;
        content?: string;
    }

    interface TrackedBroker {
        id: string;
        instances: BrokerInstance[];
        color: string;
        isTemporary: boolean;
        originalContent?: string; // Track initial content for temp brokers
    }

    const [state, dispatch] = useReducer(brokerSyncReducer, {
        trackedBrokers: new Map<string, TrackedBroker>(),
        orphanedInstances: new Map<string, BrokerInstance>(),
        colorAssignments: new Map<string, string>(),
    });

    // Watch selections for sync
    useEffect(() => {
        // Handle new selections
        selectedRecordIds.forEach((id) => {
            const broker = selectedRecordsOrDefaultsWithKeys[id];
            if (!state.trackedBrokers.has(id)) {
                // New broker selected - track it
                dispatch({
                    type: 'TRACK_BROKER',
                    payload: {
                        id,
                        isTemporary: false,
                        color: getNextAvailableColor(state.colorAssignments),
                    },
                });
            }
        });

        // Handle removals from selection
        state.trackedBrokers.forEach((broker, id) => {
            if (!selectedRecordIds.includes(id)) {
                // Check if this broker has instances
                if (broker.instances.length > 0) {
                    // Move instances to orphaned state
                    broker.instances.forEach((instance) => {
                        dispatch({
                            type: 'ADD_ORPHANED_INSTANCE',
                            payload: {
                                ...instance,
                                originalBrokerId: id,
                            },
                        });
                    });
                }

                dispatch({
                    type: 'UNTRACK_BROKER',
                    payload: id,
                });
            }
        });
    }, [selectedRecordIds, selectedRecordsOrDefaultsWithKeys]);

    // Track creation lifecycle
    useEffect(() => {
        state.trackedBrokers.forEach((broker) => {
            if (broker.isTemporary) {
                const progress = getProgress(broker.id);
                if (progress?.step === 'complete') {
                    const finalId = getFinalId(broker.id);
                    if (finalId) {
                        // Update all references to this broker
                        dispatch({
                            type: 'UPDATE_BROKER_ID',
                            payload: {
                                oldId: broker.id,
                                newId: finalId,
                            },
                        });

                        // Update refs in all editors
                        broker.instances.forEach((instance) => {
                            refManager.call(instance.editorId, 'updateBrokerId', broker.id, finalId);
                        });
                    }
                }
            }
        });
    }, [state.trackedBrokers]);

    const initializeBroker = useCallback(
        async (editorId: string, displayName: string, stringValue: string) => {
            // Get a temp ID from our tracking system
            const tempId = startCreate();

            // Update redux state with initial values
            updateFields(tempId, {
                name: displayName, // both name and displayName for consistency
                displayName: displayName,
                value: { broker_value: stringValue }, // match our expected format
            });

            // Track in our local state
            dispatch({
                type: 'TRACK_BROKER',
                payload: {
                    id: tempId,
                    displayName,
                    stringValue,
                    editorId,
                    isConnected: false,
                    progressStep: 'tempRequested',
                    color: getNextAvailableColor(state.colorAssignments),
                },
            });

            return tempId;
        },
        [startCreate, updateFields]
    );

    // Update addBrokerInstance to match our new patterns
    const addBrokerInstance = useCallback((brokerId: string, editorId: string, blockId: string, stringValue?: string) => {
        dispatch({
            type: 'ADD_BROKER_INSTANCE',
            payload: {
                brokerId,
                instance: {
                    editorId,
                    blockId,
                    stringValue,
                    status: 'active',
                },
            },
        });
    }, []);

    // Handle orphaned instances and relationship changes
    const handleOrphanedInstance = useCallback(
        async (blockId: string, action: 'create-new' | 'connect-existing', targetBrokerId?: string) => {
            const orphanedInstance = state.orphanedInstances.get(blockId);
            if (!orphanedInstance) return;

            if (action === 'create-new') {
                const newBrokerId = await initializeBroker(orphanedInstance.editorId, orphanedInstance.content);

                dispatch({
                    type: 'MOVE_INSTANCE',
                    payload: {
                        blockId,
                        fromOrphaned: true,
                        toBrokerId: newBrokerId,
                    },
                });

                // Update editor reference
                refManager.call(orphanedInstance.editorId, 'updateBrokerReference', blockId, newBrokerId);
            } else if (targetBrokerId) {
                // Connect to existing broker
                dispatch({
                    type: 'MOVE_INSTANCE',
                    payload: {
                        blockId,
                        fromOrphaned: true,
                        toBrokerId: targetBrokerId,
                    },
                });

                // Update editor reference
                refManager.call(orphanedInstance.editorId, 'updateBrokerReference', blockId, targetBrokerId);
            }
        },
        [state.orphanedInstances, initializeBroker, refManager]
    );

    // Handle broker relationship changes
    const changeBrokerRelationship = useCallback(
        async (sourceBlockId: string, targetBrokerId: string, shouldMergeContent: boolean = false) => {
            // Find the instance
            let instance: BrokerInstance | undefined;
            let sourceBrokerId: string | undefined;

            // Check tracked brokers
            for (const [brokerId, broker] of state.trackedBrokers) {
                const found = broker.instances.find((i) => i.blockId === sourceBlockId);
                if (found) {
                    instance = found;
                    sourceBrokerId = brokerId;
                    break;
                }
            }

            // Check orphaned instances
            if (!instance) {
                const orphaned = state.orphanedInstances.get(sourceBlockId);
                if (orphaned) {
                    instance = orphaned;
                }
            }

            if (!instance) return;

            // If merging content, update target broker's content
            if (shouldMergeContent && instance.content) {
                await updateFields(targetBrokerId, {
                    value: instance.content,
                });
            }

            // Move instance to target broker
            dispatch({
                type: 'MOVE_INSTANCE',
                payload: {
                    blockId: sourceBlockId,
                    fromBrokerId: sourceBrokerId,
                    toBrokerId: targetBrokerId,
                },
            });

            // Update editor reference
            refManager.call(instance.editorId, 'updateBrokerReference', sourceBlockId, targetBrokerId);

            // Check if source broker should be removed
            if (sourceBrokerId) {
                const sourceBroker = state.trackedBrokers.get(sourceBrokerId);
                if (sourceBroker && sourceBroker.instances.length === 0) {
                    dispatch({
                        type: 'UNTRACK_BROKER',
                        payload: sourceBrokerId,
                    });
                }
            }
        },
        [state.trackedBrokers, state.orphanedInstances, updateFields, refManager]
    );

    // Editor management
    const handleEditorRegistration = useCallback(
        (editorId: string, editorRef: React.RefObject<HTMLDivElement>) => {
            dispatch({
                type: 'REGISTER_EDITOR',
                payload: {
                    id: editorId,
                    ref: editorRef,
                },
            });

            // Check for brokers that should be in this editor
            selectedRecordIds.forEach((brokerId) => {
                const broker = selectedRecordsOrDefaultsWithKeys[brokerId];
                if (broker) {
                    refManager.call(editorId, 'syncBroker', broker);
                }
            });
        },
        [selectedRecordIds, selectedRecordsOrDefaultsWithKeys, refManager]
    );

    const handleEditorCleanup = useCallback(
        (editorId: string) => {
            // Track any unsaved changes before cleanup
            const editorsWithUnsavedChanges = new Set<string>();

            state.trackedBrokers.forEach((broker, brokerId) => {
                const editorInstances = broker.instances.filter((i) => i.editorId === editorId);

                editorInstances.forEach((instance) => {
                    if (instance.content) {
                        editorsWithUnsavedChanges.add(editorId);
                    }
                });
            });

            if (editorsWithUnsavedChanges.size > 0) {
                console.warn(`Editor ${editorId} has unsaved changes in brokers`);
                // Could trigger a confirmation dialog here
            }

            dispatch({
                type: 'UNREGISTER_EDITOR',
                payload: editorId,
            });
        },
        [state.trackedBrokers]
    );

    // Content update tracking
    const trackContentUpdate = useCallback(
        async (blockId: string, content: string, editorId: string) => {
            // Find which broker this belongs to
            let brokerId: string | undefined;

            // Check tracked brokers
            for (const [id, broker] of state.trackedBrokers) {
                if (broker.instances.some((i) => i.blockId === blockId)) {
                    brokerId = id;
                    break;
                }
            }

            if (brokerId) {
                // Update content in our tracking
                dispatch({
                    type: 'UPDATE_INSTANCE_CONTENT',
                    payload: {
                        brokerId,
                        blockId,
                        content,
                    },
                });

                // Update broker field
                await updateFields(brokerId, {
                    value: content,
                });
            } else {
                // Must be an orphaned instance
                dispatch({
                    type: 'UPDATE_ORPHANED_CONTENT',
                    payload: {
                        blockId,
                        content,
                    },
                });
            }
        },
        [state.trackedBrokers, updateFields]
    );

    // Add to context and implement in provider
    const updateBrokerName = useCallback(
        (brokerId: string, displayName: string) => {
            // Update redux
            updateFields(brokerId, {
                name: displayName,
                displayName,
            });

            // Update our tracking
            dispatch({
                type: 'UPDATE_BROKER_NAME',
                payload: {
                    id: brokerId,
                    displayName,
                },
            });
        },
        [updateFields]
    );

    const unlinkBroker = useCallback((brokerId: string, editorId: string) => {
        dispatch({
            type: 'UNLINK_BROKER',
            payload: {
                brokerId,
                editorId,
            },
        });
    }, []);

    const removeBroker = useCallback(
        (brokerId: string, editorId: string) => {
            // Check if this is the last instance
            const brokerInstances = getBrokerInstances(brokerId);
            if (brokerInstances.length <= 1) {
                // Last instance - untrack completely
                dispatch({
                    type: 'UNTRACK_BROKER',
                    payload: brokerId,
                });
            } else {
                // Just remove this instance
                dispatch({
                    type: 'REMOVE_BROKER_INSTANCE',
                    payload: {
                        brokerId,
                        editorId,
                    },
                });
            }
        },
        [getBrokerInstances]
    );

    // Expose the context
    const value = {
        initializeBroker,
        addBrokerInstance,
        handleOrphanedInstance,
        changeBrokerRelationship,
        handleEditorRegistration,
        handleEditorCleanup,
        trackContentUpdate,
        getBrokerInstances: (brokerId: string) => state.trackedBrokers.get(brokerId)?.instances || [],
        getOrphanedInstances: () => Array.from(state.orphanedInstances.entries()),
        getBrokerColor: (brokerId: string) => state.trackedBrokers.get(brokerId)?.color,
    };

    return <BrokerSyncContext.Provider value={value}>{children}</BrokerSyncContext.Provider>;
};

export const useBrokerSync = () => {
    const context = useContext(BrokerSyncContext);
    if (!context) {
        throw new Error('useBrokerSync must be used within a BrokerSyncProvider');
    }
    return context;
};
