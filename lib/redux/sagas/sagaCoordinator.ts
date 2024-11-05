// lib/redux/sagas/SagaCoordinator.ts

import {channel, Channel, eventChannel, EventChannel} from 'redux-saga';
import { all, call, take, put, fork } from 'redux-saga/effects';
import { EntityKeys } from '@/types/entityTypes';
import { watchEntitySagas } from '@/lib/redux/entity/sagas';
import { SocketManager } from '@/lib/socket/SocketManager';

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
        console.log('Setting entity names:', entityNames);
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    *initializeEntitySagas() {
        const sagas = this.entityNames.map((entityKey) => {
            const saga = watchEntitySagas(entityKey);
            console.log('Creating saga for entity:', entityKey);
            return call(saga);
        });

        yield all([
            ...sagas,
            call([this, this.watchSocketEvents]),
            call([this, this.initializeSocketConnection]),
        ]);
    }

    private *initializeSocketConnection() {
        const socketManager = SocketManager.getInstance();
        socketManager.connect();
        this.createSocketEventChannel();
    }

    private createSocketEventChannel() {
        const socket = SocketManager.getInstance().getSocket();
        this.socketEventChannel = eventChannel((emit) => {
            socket.onAny((eventName, ...args) => {
                emit({ eventName, args });
            });
            return () => {
                socket.offAny();
            };
        });
    }

    *watchSocketEvents() {
        if (!this.socketEventChannel) {
            throw new Error('Socket event channel is not initialized.');
        }

        while (true) {
            const payload = yield take(this.socketEventChannel);
            yield fork(this.handleSocketEvent, payload);
        }
    }

    *handleSocketEvent({ eventName, args }: { eventName: string; args: any[] }) {
        // Assume eventName is like 'entity/ENTITYKEY/eventType'
        const [prefix, entityKey, eventType] = eventName.split('/');
        if (prefix === 'entity' && entityKey && eventType) {
            yield put({
                type: 'SOCKET_ENTITY_EVENT',
                payload: { entityKey, eventType, data: args[0] }, // Assuming args[0] contains the data
            });
        } else {
            // Handle other socket events
            yield put({ type: `SOCKET_${eventName.toUpperCase()}`, payload: args });
        }
    }


    emitSocketEvent(event: { eventName: string; args: any[] }) {
        // This can be used by the SocketManager to forward events
        this.coordinationChannel.put(event);
    }
}
