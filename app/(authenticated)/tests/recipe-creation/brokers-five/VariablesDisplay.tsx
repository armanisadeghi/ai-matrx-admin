import React from 'react';
import { useVariablesStore } from './hooks/useVariablesStore';
import { VariableChip } from './VariableChip';

export const VariablesDisplay: React.FC = () => {
    const { variables, deleteVariable, restoreVariable } = useVariablesStore();
    const activeVariables = Object.values(variables).filter(v => !v.isDeleted);
    const deletedVariables = Object.values(variables).filter(v => v.isDeleted);

    return (
        <div className="p-4">
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold mb-4">Available Variables</h2>
                    <div className="flex flex-wrap gap-2">
                        {activeVariables.map(variable => (
                            <VariableChip
                                key={variable.id}
                                variable={variable}
                                onDelete={deleteVariable}
                                isInteractive={true}
                            />
                        ))}
                    </div>
                </div>

                {deletedVariables.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold mb-2">Disconnected Variables</h3>
                        <div className="flex flex-wrap gap-2">
                            {deletedVariables.map(variable => (
                                <VariableChip
                                    key={variable.id}
                                    variable={variable}
                                    onRestore={restoreVariable}
                                    isInteractive={true}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
