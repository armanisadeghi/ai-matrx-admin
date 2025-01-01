// 'use client';

// import React, { createContext, useContext } from 'react';


// interface EditorInstance {
//   id: string;
//   brokers: Set<string>;
//   ref: React.RefObject<HTMLDivElement>;
// }

// interface MatrxEditorContextType {
//   // State
//   brokers: Record<string, Broker>;
//   brokerCount: number;
//   linkedEditors: Record<string, EditorInstance>;

//   // Broker Management
//   addBroker: (broker: Broker) => void;
//   createBroker: (content?: string) => Broker;
//   updateBroker: (id: string, data: Partial<Broker>) => void;
//   deleteBroker: (id: string) => void;
//   getBroker: (id: string) => Broker | undefined;

//   // Editor Linking
//   linkEditor: (
//     brokerId: string,
//     editorId: string,
//     editorRef: React.RefObject<HTMLDivElement>
//   ) => void;
//   unlinkEditor: (brokerId: string, editorId: string) => void;
//   getLinkedEditors: (brokerId: string) => string[];
// }

// const MatrxEditorContext = createContext<MatrxEditorContextType | null>(null);

// export const useMatrxEditor = () => {
//   const context = useContext(MatrxEditorContext);
//   if (!context) {
//     throw new Error('useMatrxEditor must be used within MatrxEditorProvider');
//   }
//   return context;
// };

// export const MatrxEditorProvider: React.FC<{ children: React.ReactNode }> = ({ 
//   children 
// }) => {
//   const store = useBrokersStore();

//   const value: MatrxEditorContextType = {
//     // Expose state directly
//     brokers: store.brokers,
//     brokerCount: store.brokerCount,
//     linkedEditors: store.linkedEditors,

//     // Simplified and consistently named methods
//     addBroker: store.addExistingBroker,
//     createBroker: (content?: string) => 
//       content ? store.createBrokerFromText(content) : store.createNewBroker(),
//     updateBroker: store.updateBroker,
//     deleteBroker: store.deleteBroker,
//     getBroker: store.getBroker,

//     // Editor management
//     linkEditor: store.linkBrokerToEditor,
//     unlinkEditor: store.unlinkBrokerFromEditor,
//     getLinkedEditors: store.getLinkedEditors,
//   };

//   return (
//     <MatrxEditorContext.Provider value={value}>
//       {children}
//     </MatrxEditorContext.Provider>
//   );
// };