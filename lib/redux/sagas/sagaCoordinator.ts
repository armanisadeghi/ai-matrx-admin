// lib/redux/sagas/sagaCoordinator.ts
import { channel, Channel } from 'redux-saga';
import { put, take, select, fork, all, call } from 'redux-saga/effects';
import { TableNames, AutomationTableStructure } from '@/types/automationTableTypes';

// Central coordinator for cross-saga communication
export class SagaCoordinator {
    private static instance: SagaCoordinator;
    private coordinationChannel: Channel<any>;
    private schema: AutomationTableStructure;

    private constructor(schema: AutomationTableStructure) {
        this.coordinationChannel = channel();
        this.schema = schema;
    }

    static getInstance(schema?: AutomationTableStructure): SagaCoordinator {
        if (!SagaCoordinator.instance && schema) {
            SagaCoordinator.instance = new SagaCoordinator(schema);
        }
        return SagaCoordinator.instance;
    }

    getChannel(): Channel<any> {
        return this.coordinationChannel;
    }

    getSchema(): AutomationTableStructure {
        return this.schema;
    }
}
