// app/page.tsx
'use client';

import { VariableTextArea } from './VariableTextArea';
import { useVariableTextArea } from './useVariableTextArea';

export default function Home() {
    const {
        state,
        updateVariables,
        createVariable,
        deleteVariable,
        setVariableReady,
    } = useVariableTextArea();

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Variable Text Editor</h1>
            <VariableTextArea
                text={state.text}
                variables={state.variables}
                onTextChange={updateVariables}
                onCreateVariable={createVariable}
                onDeleteVariable={deleteVariable}
                onSetVariableReady={setVariableReady}
            />
        </main>
    );
}
