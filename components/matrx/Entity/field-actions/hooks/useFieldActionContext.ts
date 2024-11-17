// hooks/useFieldActionContext.ts
import { useContext } from 'react';
import { FieldActionContext } from '../contexts/FieldActionContext';

export const useFieldActionContext = () => {
    const context = useContext(FieldActionContext);
    if (!context) {
        throw new Error('useFieldActionContext must be used within a FieldActionProvider');
    }
    return context;
};
