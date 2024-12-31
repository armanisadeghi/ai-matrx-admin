'use client';

import React, { createContext, useContext } from 'react';
import { useBrokersStore, Broker } from './useBrokersStore';

interface MatrxEditorContextType {
    // Case 1: Add existing broker
    insertExistingBroker: (broker: Broker) => void;
    
    // Case 2: Convert selection to broker
    convertSelectionToBroker: (content: string) => Broker;
    
    // Case 3: Create new broker
    createNewBroker: () => Broker;
    
    // Utility functions
    getBroker: (id: string) => Broker | undefined;
    updateBroker: (id: string, data: Partial<Broker>) => void;
}

const MatrxEditorContext = createContext<MatrxEditorContextType | null>(null);

export const useMatrxEditor = () => {
    const context = useContext(MatrxEditorContext);
    if (!context) {
        throw new Error('useMatrxEditor must be used within MatrxEditorProvider');
    }
    return context;
};

export const MatrxEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        addExistingBroker,
        createBrokerFromText,
        createNewBroker,
        updateBroker,
        getBroker
    } = useBrokersStore();

    const value: MatrxEditorContextType = {
        insertExistingBroker: addExistingBroker,
        convertSelectionToBroker: createBrokerFromText,
        createNewBroker,
        getBroker,
        updateBroker
    };

    return (
        <MatrxEditorContext.Provider value={value}>
            {children}
        </MatrxEditorContext.Provider>
    );
};
