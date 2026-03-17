import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Maximize2, Settings, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { PromptHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { PromptBuilderRightPanel } from "./PromptBuilderRightPanel";
import { PromptBuilderLeftPanel } from "./PromptBuilderLeftPanel";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { ModelSettingsDialog } from "@/features/prompts/components/configuration/ModelSettingsDialog";
import { FullScreenEditor } from "@/features/prompts/components/FullScreenEditor";
import { PromptSettingsModal } from "@/features/prompts/components/PromptSettingsModal";
import { SharedPromptBanner } from "./SharedPromptWarningModal";
import { SystemPromptOptimizer } from "@/features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer";
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

        // Back navigation
        backHref,
        backLabel,
        contextLabel,

        // Model conflict resolution
        hasPendingConflict,
        onOpenSettingsConflictModal,
    } = props;

    const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);

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
                        {/* Standalone header for non-prompt routes (e.g. admin builtin editor) */}
                        {backHref && (
                            <div className="border-b bg-card flex items-center justify-between gap-1 h-8 px-2 shrink-0">
                                {/* Left: breadcrumb */}
                                <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
                                    <Link
                                        href={backHref}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap flex-shrink-0 px-1 py-0.5 rounded hover:bg-accent"
                                    >
                                        <ArrowLeft className="w-3 h-3" />
                                        {contextLabel ?? backLabel ?? 'Back'}
                                    </Link>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={promptName}
                                        onChange={(e) => {
                                            onPromptNameChange(e.target.value);
                                        }}
                                        className="text-[11px] font-medium bg-transparent border-0 outline-none text-foreground min-w-0 truncate px-1 py-0.5 rounded hover:bg-accent/50 focus:bg-accent/50 w-full max-w-[280px]"
                                        placeholder="Untitled"
                                    />
                                    {isDirty && (
                                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes" />
                                    )}
                                </div>

                                {/* Right: action buttons */}
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => setIsOptimizerOpen(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                        title="Optimize System Message"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => setIsFullScreenEditorOpen(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                        title="Full Editor"
                                    >
                                        <Maximize2 className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => setIsSettingsModalOpen(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                        title="Settings"
                                    >
                                        <Settings className="h-3 w-3" />
                                    </button>
                                    <div className="w-px h-3.5 bg-border mx-0.5" />
                                    <button
                                        onClick={onSave}
                                        disabled={isSaving || !isDirty}
                                        className="h-6 flex items-center gap-1 px-2 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Save"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Save className="h-3 w-3" />
                                        )}
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Optimizer (only for standalone header mode) */}
                        {backHref && (
                            <SystemPromptOptimizer
                                isOpen={isOptimizerOpen}
                                onClose={() => setIsOptimizerOpen(false)}
                                currentSystemMessage={developerMessage}
                                onAccept={(optimizedText) => onDeveloperMessageChange(optimizedText)}
                                fullPromptObject={fullPromptObject}
                                onAcceptFullPrompt={handleAcceptFullPrompt}
                                onAcceptAsCopy={handleAcceptFullPromptAsCopy}
                            />
                        )}
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
                        hasPendingConflict={hasPendingConflict}
                        onOpenSettingsConflictModal={onOpenSettingsConflictModal}
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
                        isTtsRequest={!!modelConfig.tts_voice}
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
                tags={initialData?.tags}
                category={initialData?.category}
                isFavorite={initialData?.isFavorite}
                isArchived={initialData?.isArchived}
                modelId={initialData?.modelId}
                outputFormat={initialData?.outputFormat}
                outputSchema={initialData?.outputSchema}
                onUpdate={handleSettingsUpdate}
                onLocalStateUpdate={handleLocalStateUpdate}
            />
        </>
    );
}