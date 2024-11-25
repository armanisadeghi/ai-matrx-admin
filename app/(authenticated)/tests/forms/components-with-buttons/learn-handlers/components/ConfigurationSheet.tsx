import React, {useState} from 'react';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {
    ProcessingResults, SheetProps, SheetState
} from "../types";
import ProcessingComponent from './ProcessingComponent';


export const ConfigurationSheet: React.FC<SheetProps> = (
    {
        isOpen,
        onClose,
        settings,
        initialData,
        onProcessingComplete
    }) => {
    const [state, setState] = useState<SheetState>({
        isProcessing: false,
        results: null,
        allowNewCreation: false
    });

    const handleProcessingComplete = (results: ProcessingResults): void => {
        setState(prev => ({
            ...prev,
            isProcessing: false,
            results
        }));
        onProcessingComplete(results);
        onClose();
    };

    const handleAllowNewCreationToggle = (checked: boolean): void => {
        setState(prev => ({
            ...prev,
            allowNewCreation: checked
        }));
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{settings.sheetTitle}</SheetTitle>
                    <SheetDescription>{settings.sheetDescription}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 flex-1">
                    <ProcessingComponent
                        initialData={initialData}
                        settings={settings}
                        onComplete={handleProcessingComplete}
                        allowNewCreation={state.allowNewCreation}
                    />
                </div>
                <SheetFooter className="mt-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={state.allowNewCreation}
                            onCheckedChange={handleAllowNewCreationToggle}
                        />
                        <Label>Allow Custom Choices</Label>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
