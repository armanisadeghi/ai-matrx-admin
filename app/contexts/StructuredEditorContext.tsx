'use client';

// contexts/StructuredEditorContext.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { useVariablesStore } from './useVariablesStore';


interface StructuredEditorContextType {
  createVariableFromText: (text: string) => Promise<{ id: string; displayName: string }>;
  updateVariableDisplayName: (id: string, displayName: string) => void;
}

const StructuredEditorContext = createContext<StructuredEditorContextType | null>(null);

export const useStructuredEditor = () => {
  const context = useContext(StructuredEditorContext);
  if (!context) {
    throw new Error('useStructuredEditor must be used within StructuredEditorProvider');
  }
  return context;
};

export const StructuredEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addVariable, updateVariable } = useVariablesStore();

  const createVariableFromText = useCallback(async (text: string) => {
    // Extract a reasonable display name from the text
    const createDisplayName = (text: string) => {
      // Remove any special characters and extra whitespace
      const cleaned = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      // Take first 10 characters, but try to end at a word boundary
      const truncated = cleaned.slice(0, 10);
      return truncated.length > 0 ? truncated : 'New Variable';
    };

    const displayName = createDisplayName(text);
    const id = addVariable({
      displayName,
      value: text,
      componentType: 'input', // default type
    });

    return { id, displayName };
  }, [addVariable]);

  const updateVariableDisplayName = useCallback((id: string, displayName: string) => {
    updateVariable(id, { displayName });
  }, [updateVariable]);

  return (
    <StructuredEditorContext.Provider value={{
      createVariableFromText,
      updateVariableDisplayName,
    }}>
      {children}
    </StructuredEditorContext.Provider>
  );
};