'use client';

// pages/variables.tsx
import { useVariablesStore } from '@/app/(authenticated)/tests/recipe-creation/brokers-two/hooks/useVariablesStore';

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import InlineChipEditor from "@/app/(authenticated)/tests/recipe-creation/inline-chip-editor/InlineChipEditor";
import { VariableContentEditor } from '../brokers-five/VariableContentEditor';
import { VariablesDisplay } from '../brokers-five/VariablesDisplay';

export default function VariablesPage() {
    const {
        variables,
        addVariable,
        updateVariable,
        deleteVariable,
        editor
    } = useVariablesStore();

    return (
        <div className="flex h-screen bg-background">
            <main className="flex-1 p-6 flex flex-col">
                <div className="flex-none">
                    <h1 className="text-2xl font-bold mb-4">Content Variables</h1>
                    <VariablesDisplay />
                </div>

                <div className="flex-1 mt-6">
                    <h2 className="text-lg font-semibold mb-4">Content Editor</h2>
                    <InlineChipEditor />
                </div>
            </main>

            <aside className="w-96 border-l bg-muted/10">
                <div className="p-4 border-b">
                    <Button
                        onClick={() => addVariable()}
                        className="w-full"
                        variant="outline"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Variable
                    </Button>
                </div>

                <ScrollArea className="h-[calc(100vh-5rem)] p-4">
                    {Object.values(variables)
                        .filter(v => !v.isDeleted)
                        .map((variable) => (
                            <VariableContentEditor
                                key={variable.id}
                                data={variable}
                                onChange={(data) => updateVariable(variable.id, data)}
                                // onDelete={() => deleteVariable(variable.id)}
                            />
                        ))}
                </ScrollArea>
            </aside>
        </div>
    );
}
