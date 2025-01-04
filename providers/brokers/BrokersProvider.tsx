'use client';

import React, { createContext, useContext } from 'react';
import { useBrokersStore } from './useBrokersStore';
import { Broker } from './types';
import { BrokerDataType, DataTypeToValueType } from '../brokerSync/types';

export type { Broker };

export interface EditorInstance {
  id: string;
  brokers: Set<string>;
  ref: React.RefObject<HTMLDivElement>;
}

interface BrokersContextType {
  // Core Broker Operations
  addBroker: (broker: Broker) => void;
  convertSelectionToBroker: (content: string) => Broker;
  createBroker: () => Broker;
  
  // State
  brokers: Record<string, Broker>;
  brokerCount: number;
  linkedEditors: Record<string, EditorInstance>;

  // Broker Management
  updateBroker: (id: string, data: Partial<Broker>) => void;
  deleteBroker: (id: string) => void;
  getBroker: (id: string) => Broker | undefined;

  // Type-safe Value Management
  updateBrokerValue: <T extends BrokerDataType>(
    id: string,
    value: DataTypeToValueType<T>,
    dataType: T
  ) => void;

  // Sync State Management
  markBrokerAsReady: (id: string) => void;
  markBrokerAsNotReady: (id: string) => void;

  // Editor Linking
  linkEditor: (
    brokerId: string,
    editorId: string,
    editorRef: React.RefObject<HTMLDivElement>
  ) => void;
  unlinkEditor: (brokerId: string, editorId: string) => void;
  getLinkedEditors: (brokerId: string) => string[];
}

const BrokersContext = createContext<BrokersContextType | null>(null);

export const useBrokers = () => {
  const context = useContext(BrokersContext);
  if (!context) {
    throw new Error('useBrokers must be used within BrokersProvider');
  }
  return context;
};

export const BrokersProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const store = useBrokersStore();

  const value: BrokersContextType = {
    // Core Operations
    addBroker: store.addExistingBroker,
    convertSelectionToBroker: store.createBrokerFromText,
    createBroker: store.createNewBroker,
    
    // State
    brokers: store.brokers,
    brokerCount: store.brokerCount,
    linkedEditors: store.linkedEditors,

    // Management
    updateBroker: store.updateBroker,
    deleteBroker: store.deleteBroker,
    getBroker: store.getBroker,

    // Type-safe Value Management
    updateBrokerValue: store.updateBrokerValue,

    // Sync State Management
    markBrokerAsReady: store.markBrokerAsReady,
    markBrokerAsNotReady: store.markBrokerAsNotReady,

    // Editor functions
    linkEditor: store.linkBrokerToEditor,
    unlinkEditor: store.unlinkBrokerFromEditor,
    getLinkedEditors: store.getLinkedEditors,
  };

  return (
    <BrokersContext.Provider value={value}>
      {children}
    </BrokersContext.Provider>
  );
};