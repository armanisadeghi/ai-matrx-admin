import React from 'react';
import { useVariablesStore } from '@/app/(authenticated)/tests/recipe-creation/brokers-two/hooks/useVariablesStore';

export const VariableChip = ({ id }: { id: string }) => {
    const variable = useVariablesStore(state => state.variables[id]);

    if (!variable || variable.isDeleted) return null;

    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md mx-1"
            style={{
                backgroundColor: `${variable.color}20`,
                color: variable.color,
                border: `1px solid ${variable.color}40`
            }}
        >
            {variable.displayName}{variable.isReady ? '✓' : ''}
        </span>
    );
};

export const VariablesDisplay = () => {
    const variables = useVariablesStore(state =>
        Object.values(state.variables).filter(v => !v.isDeleted)
    );

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Available Variables</h2>
            <div className="flex flex-wrap gap-2">
                {variables.map(variable => (
                    <VariableChip key={variable.id} id={variable.id} />
                ))}
            </div>
        </div>
    );
};
