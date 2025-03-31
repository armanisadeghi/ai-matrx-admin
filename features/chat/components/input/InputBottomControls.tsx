import React, { useState, useCallback, useEffect, useRef } from "react";
import { Paperclip, Search, ArrowUp, Mic } from "lucide-react";
import { LiaLightbulbSolid } from "react-icons/lia";
import { HiOutlineLightBulb } from "react-icons/hi";
import { LuSearchCheck } from "react-icons/lu";
import { MatrxRecordId } from "@/types";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import ModelSelection from "@/features/chat/components/input/ModelSelection";
import { ListTodo } from "lucide-react";
import AIToolsSheet from "./AIToolsSheet";
import { FaMicrophoneLines } from "react-icons/fa6";
import { LuBrainCircuit } from "react-icons/lu";
import { LuBrain } from "react-icons/lu";
import { CgAttachment } from "react-icons/cg";
import { MdOutlineChecklist } from "react-icons/md";
import { MdOutlineQuestionMark } from "react-icons/md";
import { BsPatchQuestion } from "react-icons/bs";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { FileManager } from "@/hooks/ai/chat/useFileManagement";
import MobileInputBottomControls from "./mobile/MobileInputBottomControls";
import { useIsMobile } from "@/hooks/use-mobile";

interface InputBottomControlsProps {
    isDisabled: boolean;
    onSendMessage: () => void;
    onToggleTools?: () => void;
    fileManager: FileManager;
}

const InputBottomControls: React.FC<InputBottomControlsProps> = ({ isDisabled, onSendMessage, onToggleTools, fileManager }) => {
    const isMobile = useIsMobile();
    const dispatch = useAppDispatch();
    const { chatActions, chatSelectors, messageKey } = useChatBasics();
    const messageMetadata = useAppSelector(chatSelectors.activeMessageMetadata);
    const conversationMetadata = useAppSelector(chatSelectors.activeConversationMetadata);
    const models = useAppSelector(chatSelectors.aiModels);
    
    // Internal state management
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isToolsSheetOpen, setIsToolsSheetOpen] = useState<boolean>(false);
    const [hasUploadedFiles, setHasUploadedFiles] = useState<boolean>(false);
    const [settings, setSettings] = useState({
        searchEnabled: false,
        toolsEnabled: false,
        thinkEnabled: false,
        researchEnabled: false,
        recipesEnabled: false,
        planEnabled: false,
        audioEnabled: false,
        enableAskQuestions: false,
    });
    const prevSettingsRef = useRef(settings);
    
    useEffect(() => {
        const changedSettings = Object.entries(settings).reduce((acc, [key, value]) => {
            if (prevSettingsRef.current[key] !== value) {
                acc.push({ field: "metadata", nestedKey: key, value });
            }
            return acc;
        }, []);
        if (changedSettings.length > 0) {
            dispatch(chatActions.updateMultipleNestedFields({ updates: changedSettings }));
            prevSettingsRef.current = settings;

            if (changedSettings.some((setting) => setting.nestedKey === "thinkEnabled")) {
                dispatch(chatActions.updateMode({ value: "thinking" }));
            }
            if (changedSettings.some((setting) => setting.nestedKey === "planEnabled")) {
                dispatch(chatActions.updateMode({ value: "plan" }));
            }
            if (changedSettings.some((setting) => setting.nestedKey === "enableAskQuestions")) {
                dispatch(chatActions.updateMode({ value: "askQuestions" }));
            }
        }
    }, [settings, dispatch, chatActions]);
    
    useEffect(() => {
        if (messageMetadata?.availableTools?.length > 0) {
            setSettings((prev) => ({ ...prev, toolsEnabled: true }));
        } else {
            setSettings((prev) => ({ ...prev, toolsEnabled: false }));
        }
    }, [isToolsSheetOpen]);
    
    // Update settings without rewriting all properties
    const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
    }, []);
    
    useEffect(() => {
        if (!messageKey) return;
        if (messageMetadata?.files?.length > 0) {
            setHasUploadedFiles(true);
        } else {
            setHasUploadedFiles(false);
        }
    }, [messageMetadata?.files, messageKey]);
    
    // Handler functions
    const handleToggleSearch = useCallback(() => {
        updateSettings({ searchEnabled: !settings.searchEnabled });
    }, [settings.searchEnabled, updateSettings]);
    
    const handleToggleTools = useCallback(() => {
        setIsToolsSheetOpen(!isToolsSheetOpen);
    }, [settings.toolsEnabled, updateSettings, isToolsSheetOpen]);
    
    const handleToggleThink = useCallback(() => {
        updateSettings({ thinkEnabled: !settings.thinkEnabled });
    }, [settings.thinkEnabled, updateSettings]);
    
    const handleToggleResearch = useCallback(() => {
        updateSettings({ researchEnabled: !settings.researchEnabled });
    }, [settings.researchEnabled, updateSettings]);
    
    const handleToggleRecipes = useCallback(() => {
        updateSettings({ recipesEnabled: !settings.recipesEnabled });
    }, [settings.recipesEnabled, updateSettings]);
    
    const handleToggleAskQuestions = useCallback(() => {
        updateSettings({ enableAskQuestions: !settings.enableAskQuestions });
    }, [settings.enableAskQuestions, updateSettings]);
    
    const handleTogglePlan = useCallback(() => {
        updateSettings({ planEnabled: !settings.planEnabled });
    }, [settings.planEnabled, updateSettings]);
    
    const handleToggleMicrophone = useCallback(() => {
        setIsListening(!isListening);
        updateSettings({ audioEnabled: !settings.audioEnabled });
    }, [isListening, settings.audioEnabled, updateSettings]);
    
    const handleModelSelect = useCallback(
        (modelKey: MatrxRecordId) => {
            dispatch(chatActions.updateModel({ value: modelKey }));
        },
        [dispatch, chatActions]
    );
    
    const modelId = messageMetadata?.currentModel || conversationMetadata?.currentModel || "";
    
    // Conditionally render mobile or desktop version
    if (isMobile) {
        return (
            <MobileInputBottomControls 
                isDisabled={isDisabled} 
                onSendMessage={onSendMessage} 
                onToggleTools={handleToggleTools} 
                fileManager={fileManager} 
            />
        );
    }
    
    // Desktop version
    return (
        <>
            <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5 rounded-full">
                {/* Left side controls */}
                <div className="absolute bottom-2 left-4 flex items-center space-x-2">
                    <ToggleButton
                        isEnabled={hasUploadedFiles}
                        isWaiting={fileManager.showFileUpload}
                        isLoading={fileManager.isUploading}
                        onClick={fileManager.toggleFileUpload}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<CgAttachment />}
                        enabledIcon={<Paperclip />}
                        tooltip="Upload Files"
                    />
                    {/* Search Toggle Button */}
                    <ToggleButton
                        isEnabled={settings.searchEnabled}
                        onClick={handleToggleSearch}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<Search />}
                        enabledIcon={<LuSearchCheck />}
                        tooltip="Allow Web Search"
                    />
                    {/* Tools Toggle Button */}
                    <ToggleButton
                        isEnabled={settings.thinkEnabled}
                        onClick={handleToggleThink}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<LuBrain />}
                        enabledIcon={<LuBrainCircuit />}
                        tooltip="Enable Thinking"
                    />
                    <ToggleButton
                        isEnabled={settings.planEnabled}
                        onClick={handleTogglePlan}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<MdOutlineChecklist />}
                        enabledIcon={<ListTodo />}
                        tooltip="Create Structured Plan"
                    />
                    <ToggleButton
                        isEnabled={settings.enableAskQuestions}
                        onClick={handleToggleAskQuestions}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<MdOutlineQuestionMark />}
                        enabledIcon={<BsPatchQuestion />}
                        tooltip="Ask me questions"
                    />
                    {/* Tools Toggle Button */}
                    <ToggleButton
                        isEnabled={settings.toolsEnabled}
                        isWaiting={isToolsSheetOpen}
                        onClick={handleToggleTools}
                        disabled={isDisabled}
                        label="Tools"
                        defaultIcon={<LiaLightbulbSolid />}
                        enabledIcon={<HiOutlineLightBulb />}
                        tooltip="Choose AI Tools"
                    />
                </div>
                {/* Right side controls */}
                <div className="absolute bottom-2 right-4 flex items-center space-x-3">
                    <ToggleButton
                        isEnabled={settings.audioEnabled}
                        onClick={handleToggleMicrophone}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<Mic />}
                        enabledIcon={<FaMicrophoneLines />}
                        tooltip="Listen for Speech Input"
                    />
                    <div className="flex items-center ml-1 relative">
                        {/* Model selection component */}
                        <ModelSelection
                            models={models}
                            selectedModelKey={`id:${modelId}` as MatrxRecordId}
                            onModelSelect={handleModelSelect}
                        />
                        <button
                            className={`p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 ${
                                isDisabled ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            onClick={onSendMessage}
                            disabled={isDisabled}
                        >
                            <ArrowUp size={18} />
                        </button>
                    </div>
                </div>
            </div>
            <AIToolsSheet isOpen={isToolsSheetOpen} onClose={() => setIsToolsSheetOpen(false)} />
        </>
    );
};

export default InputBottomControls;