// redux/features/broker/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../rootReducer';
import { BrokerValue } from './types';

export const getBrokerInstancesForRecipe = (recipeId: string) =>
    createSelector(
        (state: RootState) => state.brokers.brokerInstances[recipeId] || {},
        (brokerInstances) => brokerInstances
    );

export const getReadyBrokerInstancesForRecipe = (recipeId: string) =>
    createSelector(
        getBrokerInstancesForRecipe(recipeId),
        (brokerInstances) => Object.values(brokerInstances).filter(broker => broker.ready)
    );

export const areAllBrokersReadyForRecipe = (recipeId: string) =>
    createSelector(
        getBrokerInstancesForRecipe(recipeId),
        (brokerInstances) => Object.values(brokerInstances).every(broker => broker.ready)
    );

export const getBrokerTemplate = (brokerId: string) =>
    (state: RootState) => state.brokers.brokerTemplates[brokerId];

export const getAllBrokerTemplates =
    (state: RootState) => state.brokers.brokerTemplates;

export const getBrokerValuesForSubmission = (recipeId: string) =>
    createSelector(
        getBrokerInstancesForRecipe(recipeId),
        (brokerInstances): BrokerValue[] => Object.values(brokerInstances).map(instance => ({
            id: instance.id,
            name: instance.displayName,
            value: instance.value,
            official_name: instance.officialName,
            data_type: instance.dataType,
            ready: instance.ready,
        }))
    );
