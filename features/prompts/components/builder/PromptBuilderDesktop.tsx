import React from "react";
import { PromptHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { PromptBuilderRightPanel } from "./PromptBuilderRightPanel";
import { PromptBuilderLeftPanel } from "./PromptBuilderLeftPanel";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { ModelSettingsDialog } from "@/features/prompts/components/configuration/ModelSettingsDialog";
import { FullScreenEditor } from "@/features/prompts/components/FullScreenEditor";
import { PromptSettingsModal } from "@/features/prompts/components/PromptSettingsModal";
import { SharedPromptBanner } from "./SharedPromptWarningModal";
import { PromptBuilderSharedProps } from "./types";

export function PromptBuilderDesktop(props: PromptBuilderSharedProps) {
    const {
        // Header props
        promptId,
        promptName,
        onPromptNameChange,
        isDirty,
        isSaving,
        onSave,
        developerMessage,
        onDeveloperMessageChange,
        fullPromptObject,
        handleAcceptFullPrompt,
        handleAcceptFullPromptAsCopy,

        // Modal states
        isFullScreenEditorOpen,
        setIsFullScreenEditorOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isSettingsOpen,
        setIsSettingsOpen,

        // Left panel props
        models,
        model,
        onModelChange,
        modelConfig,
        variableDefaults,
        onAddVariable,
        onUpdateVariable,
        onRemoveVariable,
        availableTools,
        isAddingTool,
        onIsAddingToolChange,
        onAddTool,
        onRemoveTool,
        modelSupportsTools,
        showSettingsOnMainPage,
        onDeveloperMessageClear,
        systemMessageVariablePopoverOpen,
        onSystemMessageVariablePopoverOpenChange,
        onInsertVariableIntoSystemMessage,
        isEditingSystemMessage,
        onIsEditingSystemMessageChange,
        messages,
        editingMessageIndex,
        onEditingMessageIndexChange,
        variablePopoverOpen,
        onVariablePopoverOpenChange,
        onMessageRoleChange,
        onMessageContentChange,
        onClearMessage,
        onDeleteMessage,
        onInsertVariable,
        onAddMessage,
        textareaRefs,
        cursorPositions,
        onCursorPositionChange,
        onOpenFullScreenEditor,

        // Right panel props
        conversationMessages,
        onClearConversation,
        onVariableValueChange,
        expandedVariable,
        onExpandedVariableChange,
        chatInput,
        onChatInputChange,
        resources,
        onResourcesChange,
        onSendMessage,
        isTestingPrompt,
        submitOnEnter,
        onSubmitOnEnterChange,
        autoClearResponsesInEditMode,
        onAutoClearResponsesInEditModeChange,
        isStreamingMessage,
        currentTaskId,
        messageStartTime,
        timeToFirstTokenRef,
        lastMessageStats,
        attachmentCapabilities,
        onConversationMessageContentChange,

        // Full screen editor props
        fullScreenEditorInitialSelection,
        setFullScreenEditorInitialSelection,
        updateMessage,

        // Settings modal props
        initialData,
        promptDescription,
        handleSettingsUpdate,
        handleLocalStateUpdate,
        setModelConfig,
        setIsDirty,

        // Shared prompt info
        accessInfo,
        isSharedPrompt,
    } = props;

    return (
        <>
            <AdaptiveLayout
                className="h-page bg-textured"
                mobileBreakpoint={950}
                leftPanelMaxWidth={640}
                header={
                    <div className="flex flex-col">
                        <PromptHeader
                            promptId={promptId}
                            promptName={promptName}
                            onPromptNameChange={onPromptNameChange}
                            isDirty={isDirty}
                            isSaving={isSaving}
                            onSave={onSave}
                            onOpenFullScreenEditor={() => setIsFullScreenEditorOpen(true)}
                            onOpenSettings={() => setIsSettingsModalOpen(true)}
                            developerMessage={developerMessage}
                            onDeveloperMessageChange={onDeveloperMessageChange}
                            fullPromptObject={fullPromptObject}
                            onAcceptFullPrompt={handleAcceptFullPrompt}
                            onAcceptAsCopy={handleAcceptFullPromptAsCopy}
                        />
                        {/* Shared Prompt Banner */}
                        {isSharedPrompt && accessInfo && (
                            <SharedPromptBanner
                                ownerEmail={accessInfo.ownerEmail}
                                permissionLevel={accessInfo.permissionLevel}
                                className="mx-4 mb-2"
                            />
                        )}
                    </div>
                }
                leftPanel={
                    <PromptBuilderLeftPanel
                        models={models}
                        model={model}
                        onModelChange={onModelChange}
                        modelConfig={modelConfig}
                        onSettingsClick={() => setIsSettingsOpen(true)}
                        variableDefaults={variableDefaults}
                        onAddVariable={onAddVariable}
                        onUpdateVariable={onUpdateVariable}
                        onRemoveVariable={onRemoveVariable}
                        selectedTools={modelConfig.tools || []}
                        availableTools={availableTools}
                        isAddingTool={isAddingTool}
                        onIsAddingToolChange={onIsAddingToolChange}
                        onAddTool={onAddTool}
                        onRemoveTool={onRemoveTool}
                        modelSupportsTools={modelSupportsTools}
                        showSettingsOnMainPage={showSettingsOnMainPage}
                        developerMessage={developerMessage}
                        onDeveloperMessageChange={onDeveloperMessageChange}
                        onDeveloperMessageClear={onDeveloperMessageClear}
                        systemMessageVariablePopoverOpen={systemMessageVariablePopoverOpen}
                        onSystemMessageVariablePopoverOpenChange={onSystemMessageVariablePopoverOpenChange}
                        onInsertVariableIntoSystemMessage={onInsertVariableIntoSystemMessage}
                        isEditingSystemMessage={isEditingSystemMessage}
                        onIsEditingSystemMessageChange={onIsEditingSystemMessageChange}
                        messages={messages}
                        editingMessageIndex={editingMessageIndex}
                        onEditingMessageIndexChange={onEditingMessageIndexChange}
                        variablePopoverOpen={variablePopoverOpen}
                        onVariablePopoverOpenChange={onVariablePopoverOpenChange}
                        onMessageRoleChange={onMessageRoleChange}
                        onMessageContentChange={onMessageContentChange}
                        onClearMessage={onClearMessage}
                        onDeleteMessage={onDeleteMessage}
                        onInsertVariable={onInsertVariable}
                        onAddMessage={onAddMessage}
                        textareaRefs={textareaRefs}
                        cursorPositions={cursorPositions}
                        onCursorPositionChange={onCursorPositionChange}
                        onOpenFullScreenEditor={onOpenFullScreenEditor}
                    />
                }
                rightPanel={
                    <PromptBuilderRightPanel
                        conversationMessages={conversationMessages}
                        onClearConversation={onClearConversation}
                        variableDefaults={variableDefaults}
                        onVariableValueChange={onVariableValueChange}
                        expandedVariable={expandedVariable}
                        onExpandedVariableChange={onExpandedVariableChange}
                        chatInput={chatInput}
                        onChatInputChange={onChatInputChange}
                        resources={resources}
                        onResourcesChange={onResourcesChange}
                        onSendMessage={onSendMessage}
                        isTestingPrompt={isTestingPrompt}
                        submitOnEnter={submitOnEnter}
                        onSubmitOnEnterChange={onSubmitOnEnterChange}
                        autoClearResponsesInEditMode={autoClearResponsesInEditMode}
                        onAutoClearResponsesInEditModeChange={onAutoClearResponsesInEditModeChange}
                        messages={messages}
                        isStreamingMessage={isStreamingMessage}
                        currentTaskId={currentTaskId}
                        messageStartTime={messageStartTime}
                        timeToFirstTokenRef={timeToFirstTokenRef}
                        lastMessageStats={lastMessageStats}
                        attachmentCapabilities={attachmentCapabilities}
                        onMessageContentChange={onConversationMessageContentChange}
                    />
                }
            />

            {/* Shared Modals */}
            <ModelSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                modelId={model}
                models={models}
                settings={modelConfig}
                onSettingsChange={(config) => {
                    setModelConfig(config);
                    setIsDirty(true);
                }}
                availableTools={availableTools}
            />

            <FullScreenEditor
                isOpen={isFullScreenEditorOpen}
                onClose={() => {
                    setIsFullScreenEditorOpen(false);
                    setFullScreenEditorInitialSelection(null);
                }}
                developerMessage={developerMessage}
                onDeveloperMessageChange={onDeveloperMessageChange}
                messages={messages}
                onMessageContentChange={updateMessage}
                onMessageRoleChange={onMessageRoleChange}
                initialSelection={fullScreenEditorInitialSelection}
                onAddMessage={onAddMessage}
                model={model}
                models={models}
                modelConfig={modelConfig}
                onModelChange={onModelChange}
                onModelConfigChange={(config) => {
                    setModelConfig(config);
                    setIsDirty(true);
                }}
                variableDefaults={variableDefaults}
                onAddVariable={onAddVariable}
                onUpdateVariable={onUpdateVariable}
                onRemoveVariable={onRemoveVariable}
                selectedTools={modelConfig.tools || []}
                availableTools={availableTools}
                onAddTool={onAddTool}
                onRemoveTool={onRemoveTool}
                modelSupportsTools={modelSupportsTools}
            />

            <PromptSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                promptId={initialData?.id}
                promptName={promptName}
                promptDescription={promptDescription}
                variableDefaults={variableDefaults}
                messages={[{ role: "system", content: developerMessage }, ...messages]}
                settings={{ model_id: model, ...modelConfig }}
                models={models}
                availableTools={availableTools}
                onUpdate={handleSettingsUpdate}
                onLocalStateUpdate={handleLocalStateUpdate}
            />
        </>
    );
}