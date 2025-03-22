// lib/redux/sagas/SagaCoordinator.ts
import { channel, Channel } from "redux-saga";
import { all, call } from "redux-saga/effects";
import { EntityKeys } from "@/types/entityTypes";
import { watchEntitySagas } from "@/lib/redux/entity/sagas/watcherSaga";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import { callbackManager, Callback } from "@/utils/callbackManager";

const trace = "SagaCoordinator";
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, "NoEntity");

export class SagaCoordinator {
    private static instance: SagaCoordinator | null = null;
    private coordinationChannel: Channel<any>;
    private entityNames: EntityKeys[] = [];

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
        sagaLogger.log("debug", "-Set Entity Names", { entityNames });
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    *initializeEntitySagas() {
        yield all(this.entityNames.map((entityKey) => call(watchEntitySagas(entityKey))));
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
}
