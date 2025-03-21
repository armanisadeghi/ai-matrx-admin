import React, { useMemo, useState } from "react";
import { ChatMode } from "@/types/chat/chat.types";
import { MessageSquare, Image, Video, Search, SquarePlay, Lightbulb, BarChart, Code } from "lucide-react";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import { LuWorkflow } from "react-icons/lu";
import { BsChatLeftText } from "react-icons/bs";
import { MdOutlineImage } from "react-icons/md";
import { TbTopologyComplex } from "react-icons/tb";
import { GiBrainstorm } from "react-icons/gi";
import { SiStudyverse } from "react-icons/si";
import { FaChartLine } from "react-icons/fa";
import { IoCodeWorkingSharp } from "react-icons/io5";
import { SiDassaultsystemes } from "react-icons/si";
import HierarchicalToggleMenu from "@/components/matrx/toggles/HierarchicalToggleMenu";
import { programmingLibraries } from "./constants";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { ChatResult } from "@/hooks/ai/chat/new/useChat";

interface ActionButtonsProps {
    onModeSelect?: (mode: ChatMode) => void;
    className?: string;
    initialMode?: ChatMode;
    chatHook: ChatResult;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onModeSelect, className = "", chatHook }) => {
    const { mode: currentMode, updateMode } = chatHook;

    const { quickReferenceKeyDisplayPairs } = useFetchQuickRef("recipe");

    const quickRefOptions = useMemo(
        () =>
            quickReferenceKeyDisplayPairs.map(({ recordKey, displayValue }) => ({
                id: recordKey,
                label: displayValue,
                icon: <LuWorkflow />,
            })),
        [quickReferenceKeyDisplayPairs]
    );

    const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
    const [selectedQuickRef, setSelectedQuickRef] = useState<string | null>(null);

    const handleModeSelect = (mode: ChatMode) => {
        updateMode(mode);
        console.log("mode", mode);
        if (mode !== "recipe") {
            setSelectedQuickRef(null);
        }
        if (mode !== "code") {
            setSelectedLibraries([]);
        }
        if (onModeSelect) {
            onModeSelect(mode);
        }
    };

    const handleQuickRefSelection = (selectedIds: string[]) => {
        if (selectedIds.length > 0) {
            handleModeSelect("recipe");
            setSelectedQuickRef(selectedIds[0]);
        } else {
            setSelectedQuickRef(null);
            handleModeSelect("general");
        }
    };

    const handleLibrarySelection = (selectedIds: string[]) => {
        handleModeSelect("code");
        setSelectedLibraries(selectedIds);
    };

    const actionButtons = [
        {
            label: "Text",
            mode: "general" as const,
            defaultIcon: <MessageSquare />,
            enabledIcon: <BsChatLeftText />,
            tooltip: "General text chat",
        },
        {
            label: "Images",
            mode: "images" as const,
            defaultIcon: <MdOutlineImage />,
            enabledIcon: <Image />,
            tooltip: "Generate images",
        },
        {
            label: "Videos",
            mode: "video" as const,
            defaultIcon: <SquarePlay />,
            enabledIcon: <Video />,
            tooltip: "Generate video content",
        },
        {
            label: "Research",
            mode: "research" as const,
            defaultIcon: <TbTopologyComplex />,
            enabledIcon: <SiStudyverse />,
            tooltip: "Research information",
        },
        {
            label: "Brainstorm",
            mode: "brainstorm" as const,
            defaultIcon: <Lightbulb />,
            enabledIcon: <GiBrainstorm />,
            tooltip: "Generate ideas and brainstorm",
        },
        {
            label: "Data",
            mode: "analyze" as const,
            defaultIcon: <BarChart />,
            enabledIcon: <FaChartLine />,
            tooltip: "Analyze and visualize data",
        },
    ];

    return (
        <div className={`flex justify-center flex-wrap gap-1 ${className}`}>
            {actionButtons.map(({ label, mode, defaultIcon, enabledIcon, tooltip }) => (
                <ToggleButton
                    key={mode}
                    isEnabled={currentMode === mode}
                    onClick={() => handleModeSelect(mode)}
                    label={label}
                    defaultIcon={defaultIcon}
                    enabledIcon={enabledIcon}
                    tooltip={tooltip}
                />
            ))}
            <HierarchicalToggleMenu
                label="Recipe"
                defaultIcon={<LuWorkflow />}
                enabledIcon={<SiDassaultsystemes />}
                options={quickRefOptions}
                selectedIds={selectedQuickRef ? [selectedQuickRef] : []}
                onSelectionChange={handleQuickRefSelection}
                tooltip="Select a recipe to use"
                direction="top"
                size="md"
                maxHeight="400px"
                minWidth="280px"
                enableSearch={true}
                selectionMode="single"
                collapsibleCategories={false}
                defaultExpandedCategories={false}
            />
            <HierarchicalToggleMenu
                label="Code"
                defaultIcon={<Code />}
                enabledIcon={<IoCodeWorkingSharp />}
                options={programmingLibraries}
                selectedIds={selectedLibraries}
                onSelectionChange={handleLibrarySelection}
                tooltip="Select libraries for code generation"
                direction="bottom"
                size="md"
                maxHeight="400px"
                minWidth="280px"
                enableSearch={true}
                selectionMode="multiple"
                collapsibleCategories={true}
                defaultExpandedCategories={true}
            />
        </div>
    );
};

export default ActionButtons;
