// File: components/PlaygroundCollapsable.tsx

"use client";

import React from "react";
import {
    Button,
    Select,
    SelectItem,
    Popover,
    PopoverTrigger,
    PopoverContent,
    Selection,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { presets, Preset } from "../next-components/constants/playground-constants";
import PlaygroundControls from "../next-components/PlaygroundControls";
import PromptContainerWithConversation from "../next-components/prompt-container-with-conversation";

const PlaygroundCollapsable: React.FC = () => {
    const [selectedPreset, setSelectedPreset] = React.useState<Preset | null>(null);
    const [selectedModel, setSelectedModel] = React.useState<React.Key>("gpt-4o-mini");
    const [systemMessage, setSystemMessage] = React.useState<string>("");
    const [temperature, setTemperature] = React.useState<number>(0.5);
    const [maxLength, setMaxLength] = React.useState<number>(1024);
    const [topP, setTopP] = React.useState<number>(0.5);
    const [frequencyPenalty, setFrequencyPenalty] = React.useState<number>(0);
    const [presencePenalty, setPresencePenalty] = React.useState<number>(0);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);

    const onSelectedPresetChange = (key: React.Key) => {
        const preset = presets.find((preset) => preset.id === key.toString());
        if (preset) {
            setSelectedPreset(preset);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const onModelChange = (keys: Selection) => {
        const newModel = Array.from(keys)[0];
        if (newModel) {
            setSelectedModel(newModel.toString());
        }
    };

    const controlsContent = (
        <PlaygroundControls
            systemMessage={systemMessage}
            setSystemMessage={setSystemMessage}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            temperature={temperature}
            setTemperature={setTemperature}
            maxLength={maxLength}
            setMaxLength={setMaxLength}
            topP={topP}
            setTopP={setTopP}
            frequencyPenalty={frequencyPenalty}
            setFrequencyPenalty={setFrequencyPenalty}
            presencePenalty={presencePenalty}
            setPresencePenalty={setPresencePenalty}
        />
    );

    return (
        <section className="h-full w-full">
            <header className="flex w-full flex-col items-start gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={toggleSidebar}
                        className="hidden lg:flex"
                    >
                        <Icon icon={isSidebarCollapsed ? "mdi:chevron-right" : "mdi:chevron-left"} width={18} />
                    </Button>
                    <h1 className="text-large font-medium">Playground</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        aria-label="Saved presets"
                        className="w-[200px] max-w-[120px] lg:max-w-[230px]"
                        labelPlacement="outside"
                        placeholder="Select a preset"
                        selectedKeys={selectedPreset ? [selectedPreset.id] : []}
                        size="sm"
                        onChange={(e) => {
                            onSelectedPresetChange(e.target.value);
                        }}
                    >
                        {presets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                                {preset.name}
                            </SelectItem>
                        ))}
                    </Select>
                    <Button size="sm" variant="flat">
                        Save
                    </Button>
                    <Button size="sm" variant="flat">
                        Update
                    </Button>
                    <Button color="danger" size="sm" variant="flat">
                        Delete
                    </Button>
                    <Popover placement="bottom-end">
                        <PopoverTrigger>
                            <Button isIconOnly size="sm" variant="flat" className="lg:hidden">
                                <Icon icon="solar:menu-dots-bold" width={18} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="flex flex-col max-h-[80vh] w-[300px] justify-start gap-3 overflow-auto p-4">
                            {controlsContent}
                        </PopoverContent>
                    </Popover>
                </div>
            </header>
            <main className="flex flex-col lg:flex-row">
                {/* Collapsible Sidebar */}
                <div className={`hidden lg:block transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-1/4'}`}>
                    {!isSidebarCollapsed && (
                        <div className="w-full flex-none flex-col gap-4">
                            {controlsContent}
                        </div>
                    )}
                </div>
                {/* Chat */}
                <div className={`relative flex flex-col gap-2 transition-all duration-300 ease-in-out w-full ${isSidebarCollapsed ? 'lg:w-full' : 'lg:w-3/4'}`}>
                    <PromptContainerWithConversation
                        className="max-w-full px-0 lg:pl-10"
                        scrollShadowClassname="h-[40vh] lg:h-[50vh]"
                    />
                </div>
            </main>
        </section>
    );
};

export default PlaygroundCollapsable;