"use client";

import { useMemo } from "react";
import { BrokerComponentType, BROKER_COMPONENT_OPTIONS } from "@/components/brokers/value-components";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BasicSettings, StyleSettings, NumberSettings, OptionsSettings, OrientationSettings } from "./ComponentSettingsBuilder";
import { SingleBrokerSection } from "@/components/brokers/value-sections/single-broker/SingleBrokerSection";
import { DataInputComponent } from "@/components/brokers/types";
import useCreateUpdateRecord from "@/app/entities/hooks/crud/useCreateUpdateRecord";

const BUILDER_GUIDANCE_TEXT = `1. BUILD COMPONENTS: Used for one or more Brokers.
2. MORE REUSABLE:  Inputs, Textareas, "True/False" or "Yes/No".
3. MORE CUSTOM: Select, Radio Group, Checkbox.
4. ADVANCED: Use Custom Styling.`;

const INITIAL_DATA = {
    name: "This nmae is for you to identify the component",
    description: "Edit this text to provide users with guidance when they use this component",
    placeholder: "Edit this text to provide placeholder text, or clear it if you don't want to have a placeholder",
    component: "BrokerTextarea",
    options: ["Option 1", "Option 2", "Option 3"],
    includeOther: false,
    orientation: "vertical",
    min: 0,
    max: 100,
    step: 1,
    containerClassName:
        "grid flex flex-col w-full h-full pb-5 space-y-2 rounded-t-2xl rounded-b-lg border border-blue-100 dark:border-blue-600",
    collapsibleClassName: "w-full pr-2 bg-blue-100 dark:bg-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-t-xl",
    labelClassName: "text-base pt-1 min-h-6 cursor-pointer select-none",
    descriptionClassName: "pt-2 pb-2 px-7 text-md text-accent-foreground bg-blue-500",
    componentClassName: "w-full h-full px-4",
};

const debug = false;

export default function ComponentEditor() {
    const {
        start,
        updateField,
        save,
        recordDataWithDefaults,
    } = useCreateUpdateRecord({
        entityKey: "dataInputComponent",
    });

    const componentInfo = recordDataWithDefaults as DataInputComponent;

    const componentId = useMemo(() => {
        return start(INITIAL_DATA);
    }, []);

    const handleUpdateField = (value: BrokerComponentType) => {
        updateField("component", value);
    };

    const handleSave = () => {
        save();
    };

    const handleReset = () => {
        start(INITIAL_DATA);
    };

    const showNumberSettings =
        componentInfo?.component && ["BrokerNumberInput", "BrokerSlider", "BrokerNumberPicker"].includes(componentInfo.component);

    const showOptionsSettings =
        componentInfo?.component && ["BrokerSelect", "BrokerRadioGroup", "BrokerCheckbox"].includes(componentInfo.component);

    const showOrientationSettings =
        componentInfo?.component && ["BrokerRadioGroup", "BrokerCheckbox"].includes(componentInfo.component);

    return (
        <div className="h-screen bg-background">
            <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-1/4 border-r flex flex-col">
                    {/* Component Type Select */}
                    <div className="p-4 border-b shrink-0">
                        <Select value={componentInfo?.component || ""} onValueChange={handleUpdateField}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose component type" />
                            </SelectTrigger>
                            <SelectContent>
                                {BROKER_COMPONENT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Settings ScrollArea */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4">
                                <div className="space-y-6">
                                    <BasicSettings updateField={updateField} initialData={componentInfo} />
                                    {showNumberSettings && <NumberSettings updateField={updateField} initialData={componentInfo} />}
                                    {showOptionsSettings && <OptionsSettings updateField={updateField} initialData={componentInfo} />}
                                    {showOrientationSettings && <OrientationSettings updateField={updateField} initialData={componentInfo} />}

                                    {/* Configuration Debug View */}
                                    {debug && (
                                        <div className="mt-4 p-4 bg-muted rounded-lg">
                                            <h3 className="text-sm font-medium mb-2">Current Configuration</h3>
                                            <pre className="text-xs break-words whitespace-pre-wrap">
                                                {JSON.stringify(componentInfo, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Main Content Area */}   
                <div className="w-3/4 flex flex-col overflow-hidden">
                    {/* Page Title */}
                    <div className="p-8 border-b shrink-0">
                        <h1 className="text-3xl font-bold">Broker Component Builder</h1>
                    </div>

                    {/* Component Preview Area */}
                    <div className="flex-1 overflow-auto">
                        <div className="flex flex-col items-center p-8 space-y-8">
                            {/* Guidance Text */}
                            <div className="w-full max-w-2xl">
                                <p className="text-sm text-secondary-foreground">
                                    {BUILDER_GUIDANCE_TEXT.split("\n").map((text, index) => (
                                        <span key={index} className="block mb-1">
                                            {text}
                                        </span>
                                    ))}
                                </p>
                            </div>

                            {/* Preview Component */}
                            {componentInfo?.component && (
                                <div className="w-full max-w-2xl space-y-6" id={componentId}>
                                    <SingleBrokerSection
                                        componentInfo={componentInfo}
                                        broker={undefined}
                                        sectionTitle="Build, Customize, and Preview Your New Component"
                                        sectionMaxHeight=""
                                        sectionClassName="pt-2 w-full h-full bg-matrx-background"
                                        sectionCardClassName="bg-matrx-background"
                                        sectionCardHeaderClassName="p-4"
                                        sectionCardTitleClassName="text-xl font-bold"
                                        sectionCardContentClassName="grid gap-6 pb-8 flex-1 overflow-auto"
                                        isDemo={true}
                                    />

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4">
                                        <Button variant="outline" onClick={handleReset}>
                                            Reset to Defaults
                                        </Button>
                                        <Button onClick={handleSave}>Save Changes</Button>
                                    </div>

                                    {/* Style Settings */}
                                    <div className="pt-8 border-t">
                                        <h2 className="text-lg font-semibold mb-6">Advanced Styling Options</h2>
                                        <StyleSettings updateField={updateField} initialData={componentInfo} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}