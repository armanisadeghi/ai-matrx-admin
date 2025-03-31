import React, { useState, useCallback, useEffect, useRef } from "react";
import { Paperclip, Search, ArrowUp, Mic, ChevronUp, MoreHorizontal } from "lucide-react";
import { LuSearchCheck } from "react-icons/lu";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import AIToolsSheet from "@/features/chat/components/input/AIToolsSheet";
import { FaMicrophoneLines } from "react-icons/fa6";
import { CgAttachment } from "react-icons/cg";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import MobileMenu from "./MobileMenu";
import { MatrxRecordId } from "@/types";
import ModelSelection from "@/features/chat/components/input/ModelSelection";

// Mobile version of InputBottomControls
const MobileInputBottomControls = ({ isDisabled, onSendMessage, onToggleTools, fileManager }) => {
    const dispatch = useAppDispatch();
    const { chatActions, chatSelectors, messageKey } = useChatBasics();
    const messageMetadata = useAppSelector(chatSelectors.activeMessageMetadata);
    const conversationMetadata = useAppSelector(chatSelectors.activeConversationMetadata);
    const models = useAppSelector(chatSelectors.aiModels);

    // Internal state management
    const [isListening, setIsListening] = useState(false);
    const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
    const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
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
    const updateSettings = useCallback((newSettings) => {
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
    }, [isToolsSheetOpen]);

    const handleToggleMicrophone = useCallback(() => {
        setIsListening(!isListening);
        updateSettings({ audioEnabled: !settings.audioEnabled });
    }, [isListening, settings.audioEnabled, updateSettings]);

    const handleModelSelect = useCallback(
        (modelKey) => {
            dispatch(chatActions.updateModel({ value: modelKey }));
        },
        [dispatch, chatActions]
    );

    const modelId = messageMetadata?.currentModel || conversationMetadata?.currentModel || "";

    return (
        <>
            <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5 rounded-full">
                {/* Left side controls - only show 3 most important controls */}
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

                    <ToggleButton
                        isEnabled={settings.searchEnabled}
                        onClick={handleToggleSearch}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<Search />}
                        enabledIcon={<LuSearchCheck />}
                        tooltip="Allow Web Search"
                    />

                    {/* Mobile dropdown menu for the rest of the options */}
                    <MobileMenu
                        settings={settings}
                        updateSettings={updateSettings}
                        isDisabled={isDisabled}
                        handleToggleTools={handleToggleTools}
                    />
                </div>

                {/* Right side controls */}
                <div className="absolute bottom-2 right-4 flex items-center space-x-3">
                    <div className="flex items-center ml-1 relative">
                        {/* Model selection component */}
                        <ModelSelection
                            models={models}
                            selectedModelKey={`id:${modelId}` as MatrxRecordId}
                            onModelSelect={handleModelSelect}
                            isMobile={true}
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
                    <ToggleButton
                        isEnabled={settings.audioEnabled}
                        onClick={handleToggleMicrophone}
                        disabled={isDisabled}
                        label=""
                        defaultIcon={<Mic />}
                        enabledIcon={<FaMicrophoneLines />}
                        tooltip="Listen for Speech Input"
                    />
                </div>
            </div>
            <AIToolsSheet isOpen={isToolsSheetOpen} onClose={() => setIsToolsSheetOpen(false)} isMobile={true} />
        </>
    );
};

export default MobileInputBottomControls;
