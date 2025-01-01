// page.tsx
'use client';

import { useVariablesStore } from '../../../../contexts/old/useVariablesStoreTwo';
import { VariableComponent } from './VariableComponent';
import { ContentArea } from './ContentArea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Home() {
    const {
        variables,
        addVariable,
        updateVariable,
        deleteVariable,
        getAllVariables,
    } = useVariablesStore();

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-96 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-2">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Variables</h2>
                    <Button
                        size="sm"
                        onClick={() => addVariable()}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Variable
                    </Button>
                </div>

                <div className="space-y-4">
                    {variables.map((variable) => (
                        !variable.isDeleted && (
                            <VariableComponent
                                key={variable.uuid}
                                variable={variable}
                                onVariableChange={(updates) =>
                                    updateVariable(variable.uuid, updates)
                                }
                                onDelete={() => deleteVariable(variable.uuid)}
                            />
                        )
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <ContentArea
                    variables={getAllVariables()}
                    onVariableClick={(uuid) => {
                        // Implement focus/scroll to variable logic
                    }}
                />
            </div>
        </div>
    );
}
