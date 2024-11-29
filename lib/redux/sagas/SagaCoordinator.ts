// lib/redux/sagas/SagaCoordinator.ts

import {channel, Channel, eventChannel, EventChannel} from 'redux-saga';
import { all, call, take, put, fork } from 'redux-saga/effects';
import { EntityKeys } from '@/types/entityTypes';
import { watchEntitySagas } from '@/lib/redux/entity/sagas/watcherSaga';
import {SocketManager} from "@/lib/redux/socket/manager";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import { callbackManager, Callback } from '@/utils/callbackManager';
const trace = "SagaCoordinator";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

export class SagaCoordinator {
    private static instance: SagaCoordinator | null = null;
    private coordinationChannel: Channel<any>;
    private entityNames: EntityKeys[] = [];
    private socketEventChannel: EventChannel<any> | null = null;

    private constructor() {
        this.coordinationChannel = channel();
    }

    static getInstance(): SagaCoordinator {
        if (!SagaCoordinator.instance) {
            SagaCoordinator.instance = new SagaCoordinator();
        }
        return SagaCoordinator.instance;
    }

    setEntityNames(entityNames: EntityKeys[]) {
        this.entityNames = entityNames;
        sagaLogger.log('debug', '-Set Entity Names', {entityNames});

    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    *initializeEntitySagas() {

        yield all(this.entityNames.map((entityKey) => call(watchEntitySagas(entityKey))));

        yield take('SOCKET_INITIALIZED');

        yield all([
            call([this, this.initializeSocketConnection]),
            call([this, this.watchSocketEvents]),
        ]);
    }

    private *initializeSocketConnection() {
        if (typeof window !== 'undefined') {
            try {
                const socketManager = SocketManager.getInstance();
                yield call([socketManager, socketManager.connect]);
                this.createSocketEventChannel();
            } catch (error) {
                console.error('SagaCoordinator: Error initializing socket connection', error);
            }
        } else {
            console.log('SagaCoordinator: window is undefined, skipping socket initialization');
            this.socketEventChannel = null; // Explicitly set to null
        }
    }

    private createSocketEventChannel() {
        if (typeof window !== 'undefined') {
            const socket = SocketManager.getInstance().getSocket();
            this.socketEventChannel = eventChannel((emit) => {
                socket.onAny((eventName: string, ...args: any[]) => {
                    emit({ eventName, args });
                });
                return () => {
                    socket.offAny();
                };
            });
        } else {
            console.log('SagaCoordinator: window is undefined, cannot create socket event channel');
            this.socketEventChannel = null; // Explicitly set to null
        }
    }

    emitActionWithCallback(action: any, callback?: Callback<unknown>) {
        const callbackId = callback ? callbackManager.register(callback) : null;

        this.coordinationChannel.put({
            ...action,
            payload: {
                ...action.payload,
                callbackId,
            },
        });
    }

    triggerCallback(callbackId: string, data: any) {
        callbackManager.trigger(callbackId, data);
    }

    *watchSocketEvents() {
        if (this.socketEventChannel) {
            while (true) {
                const payload = yield take(this.socketEventChannel);
                yield fork([this, this.handleSocketEvent], payload);
            }
        } else {
            console.log('SagaCoordinator: Socket event channel is not initialized, skipping watchSocketEvents');
        }
    }

    *handleSocketEvent({ eventName, args }: { eventName: string; args: any[] }) {
        // Handle events with dynamic naming like '<sid>_<eventName>_<taskIndex>'
        const parts = eventName.split('_');

        if (parts.length === 3) {
            const [sid, baseEventName, taskIndex] = parts;

            yield put({
                type: `SOCKET_RESPONSE_RECEIVED`,
                payload: {
                    sid,
                    eventName: baseEventName,
                    taskIndex,
                    data: args[0], // Assuming args[0] contains the response payload
                },
            });
        } else {
            // Fallback to existing logic for other events
            const [prefix, entityKey, eventType] = eventName.split('/');
            if (prefix === 'entity' && entityKey && eventType) {
                yield put({
                    type: 'SOCKET_ENTITY_EVENT',
                    payload: { entityKey, eventType, data: args[0] }, // Assuming args[0] contains the data
                });
            } else {
                // Handle generic socket events
                yield put({ type: `SOCKET_${eventName.toUpperCase()}`, payload: args });
            }
        }
    }

    emitSocketEvent(event: { eventName: string; args: any[] }) {
        // This can be used by the SocketManager to forward events
        this.coordinationChannel.put(event);
    }
}
