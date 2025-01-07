import { BrokerInstance, BrokerSyncAction, TrackedBroker } from './types';

export const TAILWIND_COLORS = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'indigo', 'teal'] as const;

export function getNextAvailableColor(colorAssignments: Map<string, string>): string {
    const usedColors = new Set(colorAssignments.values());
    return TAILWIND_COLORS.find((color) => !usedColors.has(color)) || TAILWIND_COLORS[0];
}

interface BrokerSyncState {
    trackedBrokers: Map<string, TrackedBroker>;
    orphanedInstances: Map<string, BrokerInstance>;
    colorAssignments: Map<string, string>;
    callbacks: Map<string, Set<Function>>;
}


const initialState: BrokerSyncState = {
    trackedBrokers: new Map(),
    orphanedInstances: new Map(),
    colorAssignments: new Map(),
};

// Now the reducer
export function brokerSyncReducer(state: BrokerSyncState, action: BrokerSyncAction): BrokerSyncState {
    switch (action.type) {
        
        case 'TRACK_BROKER': {
            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.id, {
                id: action.payload.id,
                displayName: action.payload.displayName,
                stringValue: action.payload.stringValue,
                editorId: action.payload.editorId,
                isConnected: action.payload.isConnected,
                progressStep: action.payload.progressStep,
                color: action.payload.color,
                instances: []
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'UNTRACK_BROKER': {
            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.delete(action.payload);
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'UPDATE_BROKER_NAME': {
            const broker = state.trackedBrokers.get(action.payload.id);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.id, {
                ...broker,
                displayName: action.payload.displayName
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'UPDATE_BROKER_PROGRESS': {
            const broker = state.trackedBrokers.get(action.payload.id);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.id, {
                ...broker,
                progressStep: action.payload.progressStep
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'UPDATE_BROKER_CONNECTION': {
            const broker = state.trackedBrokers.get(action.payload.id);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.id, {
                ...broker,
                isConnected: action.payload.isConnected
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'ADD_BROKER_INSTANCE': {
            const broker = state.trackedBrokers.get(action.payload.brokerId);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.brokerId, {
                ...broker,
                instances: [...broker.instances, action.payload.instance]
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'REMOVE_BROKER_INSTANCE': {
            const broker = state.trackedBrokers.get(action.payload.brokerId);
            if (!broker) return state;

            const newInstances = broker.instances.filter(
                instance => instance.editorId !== action.payload.editorId
            );

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.brokerId, {
                ...broker,
                instances: newInstances
            });
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'UNLINK_BROKER': {
            const broker = state.trackedBrokers.get(action.payload.brokerId);
            if (!broker) return state;

            const newInstances = broker.instances.filter(
                instance => instance.editorId !== action.payload.editorId
            );

            const newTrackedBrokers = new Map(state.trackedBrokers);
            if (newInstances.length === 0) {
                newTrackedBrokers.delete(action.payload.brokerId);
            } else {
                newTrackedBrokers.set(action.payload.brokerId, {
                    ...broker,
                    instances: newInstances,
                    isConnected: false
                });
            }
            return {
                ...state,
                trackedBrokers: newTrackedBrokers
            };
        }

        case 'MOVE_INSTANCE': {
            const { blockId, fromBrokerId, toBrokerId, fromOrphaned } = action.payload;
            const newState = { ...state };

            if (fromOrphaned) {
                // Remove from orphaned instances
                const newOrphanedInstances = new Map(state.orphanedInstances);
                const instance = newOrphanedInstances.get(blockId);
                newOrphanedInstances.delete(blockId);
                newState.orphanedInstances = newOrphanedInstances;

                if (instance) {
                    // Add to target broker
                    const targetBroker = state.trackedBrokers.get(toBrokerId);
                    if (targetBroker) {
                        const newTrackedBrokers = new Map(state.trackedBrokers);
                        newTrackedBrokers.set(toBrokerId, {
                            ...targetBroker,
                            instances: [...targetBroker.instances, instance],
                        });
                        newState.trackedBrokers = newTrackedBrokers;
                    }
                }
            } else if (fromBrokerId) {
                // Move between brokers
                const sourceBroker = state.trackedBrokers.get(fromBrokerId);
                const targetBroker = state.trackedBrokers.get(toBrokerId);

                if (sourceBroker && targetBroker) {
                    const instance = sourceBroker.instances.find((i) => i.blockId === blockId);
                    if (instance) {
                        const newTrackedBrokers = new Map(state.trackedBrokers);
                        newTrackedBrokers.set(fromBrokerId, {
                            ...sourceBroker,
                            instances: sourceBroker.instances.filter((i) => i.blockId !== blockId),
                        });
                        newTrackedBrokers.set(toBrokerId, {
                            ...targetBroker,
                            instances: [...targetBroker.instances, instance],
                        });
                        newState.trackedBrokers = newTrackedBrokers;
                    }
                }
            }

            return newState;
        }

        case 'UPDATE_BROKER_ID': {
            const broker = state.trackedBrokers.get(action.payload.oldId);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.delete(action.payload.oldId);
            newTrackedBrokers.set(action.payload.newId, {
                ...broker,
                id: action.payload.newId,
                isTemporary: false,
            });

            return {
                ...state,
                trackedBrokers: newTrackedBrokers,
            };
        }

        case 'ADD_ORPHANED_INSTANCE': {
            const newOrphanedInstances = new Map(state.orphanedInstances);
            newOrphanedInstances.set(action.payload.blockId, {
                blockId: action.payload.blockId,
                editorId: action.payload.editorId,
                content: action.payload.content,
            });

            return {
                ...state,
                orphanedInstances: newOrphanedInstances,
            };
        }

        case 'UPDATE_INSTANCE_CONTENT': {
            const broker = state.trackedBrokers.get(action.payload.brokerId);
            if (!broker) return state;

            const newTrackedBrokers = new Map(state.trackedBrokers);
            newTrackedBrokers.set(action.payload.brokerId, {
                ...broker,
                instances: broker.instances.map((instance) =>
                    instance.blockId === action.payload.blockId ? { ...instance, content: action.payload.content } : instance
                ),
            });

            return {
                ...state,
                trackedBrokers: newTrackedBrokers,
            };
        }

        case 'UPDATE_ORPHANED_CONTENT': {
            const instance = state.orphanedInstances.get(action.payload.blockId);
            if (!instance) return state;

            const newOrphanedInstances = new Map(state.orphanedInstances);
            newOrphanedInstances.set(action.payload.blockId, {
                ...instance,
                content: action.payload.content,
            });

            return {
                ...state,
                orphanedInstances: newOrphanedInstances,
            };
        }

        default:
            return state;
    }
}
