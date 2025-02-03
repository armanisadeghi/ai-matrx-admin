'use client';

import React from 'react';
import { useDoubleJoinedActiveParentProcessing } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';
import PlaygroundHeader from '@/components/playground/header/PlaygroundHeader';


export default function DynamicPromptSettingsPage() {
    const doubleParentActiveRecipeHook = useDoubleJoinedActiveParentProcessing("recipeMessage", "aiAgent");

    const {
        activeParentMatrxId: activeRecipeId,
        activeParentId,
        firstRelHook: processedRecipeMessagesHook,
        secondRelHook: processedRecipeAgentHook,
    } = doubleParentActiveRecipeHook;
    
        // const recipeAgentSettingsHook = useRecipeAgentSettings(processedRecipeAgentHook)
    
    

    const playgroundControls = {
        doubleParentActiveRecipeHook,
    };

    return (
        <div className="min-h-screen bg-background">
            <PlaygroundHeader {...playgroundControls} />

            <div className="flex">
                {/* Left section with contained select */}
                <div className="p-4 w-64 border-r">
                    <QuickRefSelect entityKey="recipe" />
                </div>

                {/* Main content area */}
                <div className="flex-1" />

                {/* Right sidebar */}
                {/* <div className="w-80 min-h-screen border-l">
                    <ModelSettingsPanel playgroundControls={playgroundControls} />
                </div> */}
            </div>
        </div>
    );
}