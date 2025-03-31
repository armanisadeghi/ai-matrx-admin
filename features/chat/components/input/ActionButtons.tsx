import React, { useState } from "react";
import { ChatMode } from "@/types/chat/chat.types";
import { MessageSquare, Image, Video, SquarePlay, Lightbulb, BarChart, Code } from "lucide-react";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import { BsChatLeftText } from "react-icons/bs";
import { MdOutlineImage } from "react-icons/md";
import { TbTopologyComplex } from "react-icons/tb";
import { GiBrainstorm } from "react-icons/gi";
import { SiStudyverse } from "react-icons/si";
import { FaChartLine } from "react-icons/fa";
import { IoCodeWorkingSharp } from "react-icons/io5";
import HierarchicalToggleMenu from "@/components/matrx/toggles/HierarchicalToggleMenu";
import { programmingLibraries } from "./constants";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import RecipeSelectionButton from "./RecipeSelectionButton";

interface ActionButtonsProps {
    onModeSelect?: (mode: ChatMode) => void;
    className?: string;
    initialMode?: ChatMode;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onModeSelect, className = "" }) => {
    const dispatch = useAppDispatch();
    const { chatActions, chatSelectors, conversationKey } = useChatBasics();

    const currentMode = useAppSelector(chatSelectors.currentMode);
    const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
    const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);

    const handleModeSelect = (mode: ChatMode) => {
        if (!conversationKey) return;
        dispatch(chatActions.updateMode({ value: mode }));
        console.log("HANDLE MODE SELECT mode", mode);

        if (mode !== "recipe") {
            setSelectedRecipeIds([]);
        }
        if (mode !== "code") {
            setSelectedLibraries([]);
        }

        if (onModeSelect) {
            onModeSelect(mode);
        }
    };

    const handleRecipeSelection = (selectedIds: string[]) => {
        setSelectedRecipeIds(selectedIds);

        if (selectedIds.length > 0) {
            handleModeSelect("recipe");
            dispatch(chatActions.updateSelectedRecipe({ recipeId: selectedIds[0] }));
        } else {
            handleModeSelect("general");
        }
    };

    const handleLibrarySelection = (selectedIds: string[]) => {
        setSelectedLibraries(selectedIds);
        handleModeSelect("code");
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
            <RecipeSelectionButton
                selectedRecipeIds={selectedRecipeIds}
                onRecipeSelection={handleRecipeSelection}
                tooltip="Select a recipe to use"
                isEnabled={currentMode === "recipe"}
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
