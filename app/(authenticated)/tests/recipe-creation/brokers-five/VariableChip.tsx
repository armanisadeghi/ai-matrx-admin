// components/VariableChip.tsx
import React from 'react';
import {Variable} from './types';

interface VariableChipProps {
    variable: Variable;
    onDelete?: (id: string) => void;
    onRestore?: (id: string) => void;
    isInteractive?: boolean;
}

export const VariableChip: React.FC<VariableChipProps> = (
    {
        variable,
        onDelete,
        onRestore,
        isInteractive = true
    }) => {
    return (
        <span
            className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md ${isInteractive ? 'mx-1' : ''}`}
            style={{
                backgroundColor: `${variable.color}20`,
                color: variable.color,
                border: `1px solid ${variable.color}40`
            }}
            data-variable-id={variable.id}
            contentEditable="false"
        >
            <span>{variable.displayName}</span>
            {variable.isReady && <span>✓</span>}
            {isInteractive && onDelete && !variable.isDeleted && (
                <button
                    onClick={() => onDelete(variable.id)}
                    className="ml-1 hover:opacity-75"
                >
                    ×
                </button>
            )}
            {isInteractive && onRestore && variable.isDeleted && (
                <button
                    onClick={() => onRestore(variable.id)}
                    className="ml-1 hover:opacity-75"
                >
                    ↺
                </button>
            )}
        </span>
    );
};
