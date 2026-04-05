# `features.prompts.components` — Module Overview

> This document is partially auto-generated. Sections tagged `<!-- AUTO:id -->` are refreshed by the generator.
> Everything else is yours to edit freely and will never be overwritten.

<!-- AUTO:meta -->
## About This Document

This file is **partially auto-generated**. Sections wrapped in `<!-- AUTO:id -->` tags
are overwritten each time the generator runs. Everything else is yours to edit freely.

| Field | Value |
|-------|-------|
| Module | `features/prompts/components` |
| Last generated | 2026-04-05 07:15 |
| Output file | `features/prompts/components/MODULE_README.md` |
| Signature mode | `signatures` |

**To refresh auto-sections:**
```bash
python utils/code_context/generate_module_readme.py features/prompts/components --mode signatures
```

**To add permanent notes:** Write anywhere outside the `<!-- AUTO:... -->` blocks.
<!-- /AUTO:meta -->

<!-- HUMAN-EDITABLE: This section is yours. Agents & Humans can edit this section freely — it will not be overwritten. -->

## Architecture

> **Fill this in.** Describe the execution flow and layer map for this module.
> See `utils/code_context/MODULE_README_SPEC.md` for the recommended format.
>
> Suggested structure:
>
> ### Layers
> | File | Role |
> |------|------|
> | `entry.py` | Public entry point — receives requests, returns results |
> | `engine.py` | Core dispatch logic |
> | `models.py` | Shared data types |
>
> ### Call Flow (happy path)
> ```
> entry_function() → engine.dispatch() → implementation()
> ```


<!-- AUTO:tree -->
## Directory Tree

> Auto-generated. 162 files across 19 directories.

```
features/prompts/components/
├── FullScreenEditor.tsx
├── HighlightedText.tsx
├── MODULE_README.md
├── PromptEditorContextMenu.tsx
├── PromptErrorMessage.tsx
├── PromptInput.tsx
├── PromptInputButton.tsx
├── PromptModeNavigation.tsx
├── PromptRunPage.tsx
├── PromptSearchDialog.tsx
├── PromptSettingsModal.tsx
├── PromptSwitcherSheet.tsx
├── VariableSelector.tsx
├── actions/
│   ├── PromptExecutionButton.tsx
│   ├── prompt-generator/
│   │   ├── HighlightedMessageContent.tsx
│   │   ├── PromptGenerator.tsx
│   │   ├── PromptJsonDisplay.tsx
│   │   ├── progressive-json-parser.ts
│   ├── prompt-optimizers/
│   │   ├── FullPromptOptimizer.tsx
│   │   ├── SystemPromptOptimizer.tsx
├── builder/
│   ├── AICustomizerPromptBuilder.tsx
│   ├── CreatorOptionsModal.tsx
│   ├── InstantChatAssistant.tsx
│   ├── ModelChangeConflictModal.tsx
│   ├── PromptAssistantMessage.tsx
│   ├── PromptBuilder.tsx
│   ├── PromptBuilderDesktop.tsx
│   ├── PromptBuilderErrorBoundary.tsx
│   ├── PromptBuilderLeftPanel.tsx
│   ├── PromptBuilderMobile.tsx
│   ├── PromptBuilderRightPanel.tsx
│   ├── PromptMessages.tsx
│   ├── PromptStats.tsx
│   ├── PromptSystemMessage.tsx
│   ├── PromptUserMessage.tsx
│   ├── SharedPromptWarningModal.tsx
│   ├── TabBasedPromptBuilder.tsx
│   ├── types.ts
├── builder-new/
│   ├── AgentSettingsBridge.tsx
│   ├── AgentSettingsPanelWrapper.tsx
│   ├── PromptBuilderRedux.tsx
│   ├── PromptMessageList.tsx
│   ├── PromptSettingsPanel.tsx
│   ├── PromptTestPanel.tsx
│   ├── PromptVariableManager.tsx
├── common/
│   ├── GeneratePromptButton.tsx
│   ├── ImportPromptButton.tsx
│   ├── PromptImporter.tsx
├── configuration/
│   ├── ModelConfiguration.tsx
│   ├── ModelSettings.tsx
│   ├── ModelSettingsDialog.tsx
│   ├── SettingControl.tsx
│   ├── SettingsJsonEditor.tsx
│   ├── SystemMessage.tsx
│   ├── ToolsManager.tsx
│   ├── VariableEditor.tsx
│   ├── VariableEditorModal.tsx
│   ├── VariableValidationPanel.tsx
│   ├── VariablesManager.tsx
│   ├── index.ts
├── dynamic/
│   ├── DynamicButtons.tsx
│   ├── DynamicCards.tsx
│   ├── DynamicContextMenu.tsx
│   ├── PromptExecutionCard.tsx
│   ├── index.ts
├── layouts/
│   ├── ConvertToBuiltinModal.tsx
│   ├── DesktopFilterPanel.tsx
│   ├── DesktopSearchBar.tsx
│   ├── FavoriteButton.tsx
│   ├── FilterModal.tsx
│   ├── FloatingActionBar.tsx
│   ├── NewPromptModal.tsx
│   ├── PromptActionModal.tsx
│   ├── PromptActionsMenu.tsx
│   ├── PromptBuilderHeaderCompact.tsx
│   ├── PromptBuilderModal.tsx
│   ├── PromptCard.tsx
│   ├── PromptListItem.tsx
│   ├── PromptMetadataModal.tsx
│   ├── PromptsFilter.tsx
│   ├── PromptsGrid.tsx
│   ├── PromptsPageHeader.tsx
│   ├── SharedPromptCard.tsx
│   ├── SharedPromptListItem.tsx
│   ├── TemplateCard.tsx
│   ├── TemplatesGrid.tsx
├── resource-display/
│   ├── ResourceChips.tsx
│   ├── ResourceDebugModal.tsx
│   ├── ResourceDisplay.tsx
│   ├── ResourcePreviewSheet.tsx
│   ├── index.ts
├── resource-picker/
│   ├── AudioResourcePicker.tsx
│   ├── FileUrlResourcePicker.tsx
│   ├── FilesResourcePicker.tsx
│   ├── ImageUrlResourcePicker.tsx
│   ├── NotesResourcePicker.tsx
│   ├── ResourcePickerButton.tsx
│   ├── ResourcePickerMenu.tsx
│   ├── TablesResourcePicker.tsx
│   ├── TasksResourcePicker.tsx
│   ├── UploadResourcePicker.tsx
│   ├── WebpageResourcePicker.tsx
│   ├── YouTubeResourcePicker.tsx
│   ├── index.ts
├── results-display/
│   ├── ActivePromptResults.tsx
│   ├── AdditionalInfoModal.tsx
│   ├── ContextAwarePromptCompactModal.tsx
│   ├── ContextAwarePromptRunner.tsx
│   ├── PreExecutionInputModalContainer.tsx
│   ├── PromptCompactModal.tsx
│   ├── PromptFlexiblePanel.tsx
│   ├── PromptInlineOverlay.tsx
│   ├── PromptRunner.tsx
│   ├── PromptRunner.types.ts
│   ├── PromptRunnerModal.tsx
│   ├── PromptSidebarRunner.tsx
│   ├── PromptToast.tsx
│   ├── QuickAIResultsSheet.tsx
│   ├── index.ts
├── runner-tester/
│   ├── PromptExecutionTestModal.tsx
│   ├── PromptRunnerModalSidebarTester.tsx
├── smart/
│   ├── CompactPromptInput.tsx
│   ├── CompactPromptModal.tsx
│   ├── SmartMessageList.tsx
│   ├── SmartPromptInput.tsx
│   ├── SmartPromptRunner.tsx
│   ├── SmartResourcePickerButton.tsx
│   ├── StreamingAssistantMessage.tsx
│   ├── index.ts
├── tabbed-builder/
│   ├── AudienceTab.tsx
│   ├── ConstraintsTab.tsx
│   ├── ContextTab.tsx
│   ├── EmphasisTab.tsx
│   ├── EvaluationTab.tsx
│   ├── ExamplesTab.tsx
│   ├── FormatTab.tsx
│   ├── GenericTextareaTab.tsx
│   ├── KnowledgeTab.tsx
│   ├── MainPromptBuilder.tsx
│   ├── MotivationTab.tsx
│   ├── PreviewTab.tsx
│   ├── PromptBuilderContext.tsx
│   ├── TabBase.tsx
│   ├── TabTemplate.tsx
│   ├── TaskTab.tsx
│   ├── ToneTab.tsx
│   ├── constants.tsx
├── universal-editor/
│   ├── EXAMPLE.tsx
│   ├── UniversalPromptEditor.tsx
│   ├── editors/
│   │   ├── BuiltinEditor.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── TemplateEditor.tsx
│   │   ├── index.ts
│   ├── index.ts
│   ├── types.ts
├── variable-inputs/
│   ├── CheckboxGroupInput.tsx
│   ├── NumberInput.tsx
│   ├── RadioGroupInput.tsx
│   ├── SelectInput.tsx
│   ├── TextareaInput.tsx
│   ├── ToggleInput.tsx
│   ├── index.tsx
# excluded: 11 .md, 1 .json
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="signatures"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.

```
---
Filepath: features/prompts/components/PromptSettingsModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptSettingsModal({ isOpen, onClose, promptId, promptName, promptDescription, variableDefaults, messages, settings, models, availableTools, tags, category, isFavorite, isArchived, modelId, outputFormat, outputSchema, onUpdate, onLocalStateUpdate })
    Props: PromptSettingsModalProps
      # isOpen: boolean
      # onClose: () => void
      # promptId?: string
      # promptName: string
      # promptDescription?: string
      # variableDefaults: PromptVariable[]
      # messages: PromptMessage[]
      # settings: Record<string, any>
      #   # ... 43 more fields
  # Types & Interfaces
    interface PromptSettingsModalProps


---
Filepath: features/prompts/components/PromptInputButton.tsx  [typescript/react]

  # Components
    [Component] export function PromptInputButton({ icon, text, tooltip, onClick, active, disabled, variant, className })
    Props: PromptInputButtonProps
      # icon?: LucideIcon
      # text?: string
      # tooltip: string
      # onClick: () => void
      # active?: boolean
      # disabled?: boolean
      # variant?: "ghost" | "default"
      # className?: string
  # Types & Interfaces
    interface PromptInputButtonProps


---
Filepath: features/prompts/components/PromptErrorMessage.tsx  [typescript/react]

  # Components
    [Component] export function PromptErrorMessage({ message }: PromptErrorMessageProps)
    Props: PromptErrorMessageProps
      # message: string
  # Types & Interfaces
    interface PromptErrorMessageProps


---
Filepath: features/prompts/components/PromptRunPage.tsx  [typescript/react]

  # Components
    [Component] export function PromptRunPage({ promptData, accessInfo }: PromptRunnerProps)
  # Types & Interfaces
    interface PromptRunnerProps
    # promptData: {
    # id: string
    # name: string
    # description?: string | null
    # messages: Json | null
    # variableDefaults: Json | null
    # settings: Json | null
    # userId?: string | null
    # ... 9 more fields


---
Filepath: features/prompts/components/VariableSelector.tsx  [typescript/react]

  # Components
    [Component] export function VariableSelector({ variables, onVariableSelected, onBeforeOpen, }: VariableSelectorProps)
    Props: VariableSelectorProps
      # variables: string[]
      # onVariableSelected: (variable: string) => void
      # onBeforeOpen?: () => void
  # Types & Interfaces
    interface VariableSelectorProps


---
Filepath: features/prompts/components/PromptInput.tsx  [typescript/react]

  # Components
    [Component] export function PromptInput({ variableDefaults, onVariableValueChange, expandedVariable, onExpandedVariableChange, chatInput, onChatInputChange, onSendMessage, isTestingPrompt, submitOnEnter, onSubmitOnEnterChange, messages, showVariables, showAutoClear, autoClear, onAutoClearChange, showAttachments, attachmentCapabilities, supportsFileUrls, supportsYoutubeVideos })
    Props: PromptInputProps
      # variableDefaults: PromptVariable[]
      # onVariableValueChange: (variableName: string, value: string) => void
      # expandedVariable: string | null
      # onExpandedVariableChange: (variable: string | null) => void
      # chatInput: string
      # onChatInputChange: (value: string) => void
      # onSendMessage: () => void
      # isTestingPrompt: boolean
      #   # ... 22 more fields
  # Types & Interfaces
    interface PromptInputProps


---
Filepath: features/prompts/components/HighlightedText.tsx  [typescript/react]

  # Components
    [Component] export const HighlightedText = ({ text, validVariables = [] }: HighlightedTextProps) =>
    Props: HighlightedTextProps
      # text: string
      # validVariables?: string[]
  # Types & Interfaces
    interface HighlightedTextProps


---
Filepath: features/prompts/components/PromptModeNavigation.tsx  [typescript/react]

  # Components
    [Component] export function PromptModeNavigation({ promptId, promptName, currentMode, onPromptNameChange })
    Props: PromptModeNavigationProps
      # promptId: string
      # promptName: string
      # currentMode: "edit" | "run"
      # onPromptNameChange?: (value: string) => void
  # Types & Interfaces
    interface PromptModeNavigationProps


---
Filepath: features/prompts/components/PromptSwitcherSheet.tsx  [typescript/react]

  # Components
    [Component] export function PromptSwitcherSheet(props: PromptSwitcherSheetProps)
    Props: PromptSwitcherSheetProps
      # open: boolean
      # onOpenChange: (open: boolean) => void
      # currentPromptId: string
      # mode: "edit" | "run"
    [Component] export function PromptSwitcherButton({ promptId, mode, }: { promptId: string; mode: "edit" | "run"; })
  # Types & Interfaces
    interface MinimalPrompt
    # id: string
    # name: string
    # description: string | null
    interface PromptSwitcherSheetProps


---
Filepath: features/prompts/components/PromptSearchDialog.tsx  [typescript/react]

  # Components
    [Component] export function PromptSearchDialog({ isOpen, onClose, prompts }: PromptSearchDialogProps)
    Props: PromptSearchDialogProps
      # isOpen: boolean
      # onClose: () => void
      # prompts: Prompt[]
  # Types & Interfaces
    interface Prompt
    interface PromptSearchDialogProps


---
Filepath: features/prompts/components/PromptEditorContextMenu.tsx  [typescript/react]

  # Components
    [Component] export const PromptEditorContextMenu = ({ getTextarea, children, onContentInserted, useDatabase, quickAccessBlocks, className }) =>
    Props: PromptEditorContextMenuProps
      # getTextarea: () => HTMLTextAreaElement | null
      # children: React.ReactNode
      # onContentInserted?: () => void
      # useDatabase?: boolean
      # quickAccessBlocks?: string[]
      # className?: string
  # Types & Interfaces
    interface PromptEditorContextMenuProps


---
Filepath: features/prompts/components/FullScreenEditor.tsx  [typescript/react]

  # Components
    [Component] export function FullScreenEditor({ isOpen, onClose, developerMessage, onDeveloperMessageChange, messages, onMessageContentChange, onMessageRoleChange, initialSelection, onAddMessage, model, models, modelConfig, onModelChange, onModelConfigChange, variableDefaults, onAddVariable, onUpdateVariable, onRemoveVariable, selectedTools, availableTools, onAddTool, onRemoveTool, modelSupportsTools, onSave, isSaving, isDirty })
    Props: FullScreenEditorProps
      # isOpen: boolean
      # onClose: () => void
      # developerMessage: string
      # onDeveloperMessageChange: (value: string) => void
      # messages: PromptMessage[]
      # onMessageContentChange: (index: number, content: string) => void
      # onMessageRoleChange: (index: number, role: string) => void
      # initialSelection?: MessageItem | null
      #   # ... 18 more fields
  # Types & Interfaces
    interface FullScreenEditorProps


---
Filepath: features/prompts/components/configuration/VariableEditorModal.tsx  [typescript/react]

  # Components
    [Component] export function VariableEditorModal({ isOpen, onClose, onSave, existingVariable, existingNames, mode })
    Props: VariableEditorModalProps
      # isOpen: boolean
      # onClose: () => void
      # onSave: (name: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void
      # existingVariable?: {
      # name: string
      # defaultValue: string
      # customComponent?: VariableCustomComponent
      # required?: boolean
      #   # ... 4 more fields
  # Types & Interfaces
    interface VariableEditorModalProps


---
Filepath: features/prompts/components/configuration/ModelSettingsDialog.tsx  [typescript/react]

  # Components
    [Component] export function ModelSettingsDialog({ isOpen, onClose, modelId, models, settings, onSettingsChange, availableTools, showModelSelector, onModelChange, requireConfirmation, confirmationMessage, footer })
    Props: ModelSettingsDialogProps
      # isOpen: boolean
      # onClose: () => void
      # modelId: string
      # models: any[]
      # settings: PromptSettings
      # onSettingsChange: (settings: PromptSettings) => void
      # availableTools?: any[]
      # /** Show a model selector at the top of the settings panel. Default: false */
      #   # ... 19 more fields
  # Types & Interfaces
    interface ModelSettingsDialogProps


---
Filepath: features/prompts/components/configuration/ToolsManager.tsx  [typescript/react]

  # Components
    [Component] export function ToolsManager({ selectedTools, availableTools, isAddingTool, onIsAddingToolChange, onAddTool, onRemoveTool, modelSupportsTools })
    Props: ToolsManagerProps
      # selectedTools: string[]
      # availableTools: any[]; // Array of database tool objects
      # isAddingTool: boolean
      # onIsAddingToolChange: (value: boolean) => void
      # onAddTool: (tool: string) => void
      # onRemoveTool: (tool: string) => void
      # modelSupportsTools: boolean
  # Types & Interfaces
    interface ToolsManagerProps


---
Filepath: features/prompts/components/configuration/SettingsJsonEditor.tsx  [typescript/react]

  # Components
    [Component] export function SettingsJsonEditor({ isOpen, onClose, settings, onSave, }: SettingsJsonEditorProps)
    Props: SettingsJsonEditorProps
      # isOpen: boolean
      # onClose: () => void
      # settings: PromptSettings
      # onSave: (settings: PromptSettings) => void
  # Types & Interfaces
    interface SettingsJsonEditorProps


---
Filepath: features/prompts/components/configuration/VariableEditor.tsx  [typescript/react]

  # Components
    [Component] export default function VariableEditor({ name, defaultValue, customComponent, required, helpText, existingNames, originalName, onNameChange, onDefaultValueChange, onCustomComponentChange, onRequiredChange, onHelpTextChange, readonly })
    Props: VariableEditorProps
      # name: string
      # defaultValue: string
      # customComponent?: VariableCustomComponent
      # required?: boolean
      # helpText?: string
      # existingNames?: string[]; // For duplicate checking
      # originalName?: string; // For edit mode - allows keeping same name
      # onNameChange?: (name: string) => void
      #   # ... 7 more fields
  # Types & Interfaces
    interface VariableEditorProps


---
Filepath: features/prompts/components/configuration/ModelSettings.tsx  [typescript/react]

  # Components
    [Component] export function ModelSettings({ modelId, models, settings, onSettingsChange, availableTools, showModelSelector, onModelChange })
    Props: ModelSettingsProps
      # modelId: string
      # models: any[]
      # settings: PromptSettings
      # onSettingsChange: (settings: PromptSettings) => void
      # availableTools?: any[]
      # showModelSelector?: boolean
      # onModelChange?: (modelId: string) => void
  # Types & Interfaces
    interface NumberInputProps
    # value: number
    # onChange: (val: number) => void
    # onSliderChange?: (val: number) => void
    # min?: number
    # max?: number
    # step?: number
    # isInteger?: boolean
    # disabled?: boolean
    # ... 1 more fields
    interface ModelSettingsProps


---
Filepath: features/prompts/components/configuration/VariableValidationPanel.tsx  [typescript/react]

  # Components
    [Component] export function VariableValidationPanel({ validation, onAddVariable }: VariableValidationPanelProps)
    Props: VariableValidationPanelProps
      # validation: VariableValidationResult
      # onAddVariable?: (name: string) => void
  # Types & Interfaces
    interface VariableValidationPanelProps


---
Filepath: features/prompts/components/configuration/index.ts  [typescript]



---
Filepath: features/prompts/components/configuration/VariablesManager.tsx  [typescript/react]

  # Components
    [Component] export function VariablesManager({ variableDefaults, onAddVariable, onUpdateVariable, onRemoveVariable, messages, systemMessage })
    Props: VariablesManagerProps
      # variableDefaults: ExtendedPromptVariable[]
      # onAddVariable: (name: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void
      # onUpdateVariable: (oldName: string, newName: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void
      # onRemoveVariable: (variableName: string) => void
      # messages?: PromptMessage[]
      # systemMessage?: string
  # Types & Interfaces
    export interface ExtendedPromptVariable
    # name: string
    # defaultValue: string
    # customComponent?: VariableCustomComponent
    # required?: boolean
    # helpText?: string
    interface VariablesManagerProps


---
Filepath: features/prompts/components/configuration/SettingControl.tsx  [typescript/react]

  # Components
    [Component] export function SettingControl({ label, isOptional, isEnabled, onToggle, children, className })
    Props: SettingControlProps
      # label: string
      # isOptional?: boolean
      # isEnabled?: boolean
      # onToggle?: (enabled: boolean) => void
      # children: ReactNode
      # className?: string
  # Types & Interfaces
    interface SettingControlProps


---
Filepath: features/prompts/components/configuration/SystemMessage.tsx  [typescript/react]

  # Components
    [Component] export function SystemMessage({ developerMessage, onDeveloperMessageChange, onDeveloperMessageClear, variableDefaults, variablePopoverOpen, onVariablePopoverOpenChange, onInsertVariable, textareaRefs, cursorPositions })
    Props: SystemMessageProps
      # developerMessage: string
      # onDeveloperMessageChange: (value: string) => void
      # onDeveloperMessageClear: () => void
      # variableDefaults?: PromptVariable[]
      # variablePopoverOpen?: boolean
      # onVariablePopoverOpenChange?: (open: boolean) => void
      # onInsertVariable?: (variable: string) => void
      # textareaRefs?: RefObject<Record<number, HTMLTextAreaElement | null>>
      #   # ... 8 more fields
  # Types & Interfaces
    interface SystemMessageProps


---
Filepath: features/prompts/components/configuration/ModelConfiguration.tsx  [typescript/react]

  # Components
    [Component] export function ModelConfiguration({ models, model, onModelChange, modelConfig, onSettingsClick, showSettingsDetails, hasPendingConflict, onOpenSettingsConflictModal })
    Props: ModelConfigurationProps
      # models: any[]
      # model: string
      # onModelChange: (value: string) => void
      # modelConfig: PromptSettings
      # onSettingsClick: () => void
      # showSettingsDetails?: boolean; // Controls visibility of settings badges
      # hasPendingConflict?: boolean
      # onOpenSettingsConflictModal?: () => void
  # Types & Interfaces
    interface ModelConfigurationProps


---
Filepath: features/prompts/components/dynamic/DynamicContextMenu.tsx  [typescript/react]

  # Components
    [Component] export function DynamicContextMenu({ children, uiContext })
    Props: DynamicContextMenuProps
      # children: React.ReactNode
      # uiContext?: UIContext
      # category?: string
      # subcategory?: string
      # className?: string
      # /** For text editors: callbacks to modify text */
      # onTextReplace?: (newText: string) => void
      # onTextInsertBefore?: (text: string) => void
      #   # ... 3 more fields
  # Types & Interfaces
    interface DynamicContextMenuProps
    interface GroupedPrompts


---
Filepath: features/prompts/components/dynamic/DynamicCards.tsx  [typescript/react]

  # Components
    [Component] export function DynamicCards({ category, context, renderAs, className, emptyMessage })
    Props: DynamicCardsProps
      # category?: string
      # context?: string
      # renderAs?: 'grid' | 'list'
      # className?: string
      # emptyMessage?: string
  # Types & Interfaces
    interface DynamicCardsProps


---
Filepath: features/prompts/components/dynamic/index.ts  [typescript]



---
Filepath: features/prompts/components/dynamic/DynamicButtons.tsx  [typescript/react]

  # Components
    [Component] export function DynamicButtons({ category, context })
    Props: DynamicButtonsProps
      # category?: string
      # context?: UIContext
      # renderAs?: 'inline' | 'grid' | 'stack'
      # className?: string
  # Types & Interfaces
    interface DynamicButtonsProps


---
Filepath: features/prompts/components/dynamic/PromptExecutionCard.tsx  [typescript/react]

  # Components
    [Component] export function PromptExecutionCard({ systemPrompt, systemPromptId, title, description, context, auto_run, allow_chat, show_variables, apply_variables, track_in_runs, use_pre_execution_input, className, onExecutionStart, onExecutionComplete })
    Props: PromptExecutionCardProps
      # systemPrompt?: SystemPromptDB
      # systemPromptId?: string
      # title: string
      # description: string
      # context: string
      # auto_run?: boolean
      # allow_chat?: boolean
      # show_variables?: boolean
      #   # ... 6 more fields
    [Component] export function PromptExecutionCardsGrid({ children, columns = 3, className, }: PromptExecutionCardsGridProps)
    Props: PromptExecutionCardsGridProps
      # children: React.ReactNode
      # columns?: 1 | 2 | 3 | 4
      # className?: string
  # Types & Interfaces
    interface PromptExecutionCardProps
    interface CreatePromptCardConfig
    # systemPromptId: string
    # auto_run?: boolean
    # allow_chat?: boolean
    # show_variables?: boolean
    # apply_variables?: boolean
    # track_in_runs?: boolean
    # use_pre_execution_input?: boolean
    # className?: string
    interface PromptExecutionCardsGridProps
  # Utilities
    export function createPromptCard(config: CreatePromptCardConfig)


---
Filepath: features/prompts/components/universal-editor/types.ts  [typescript]

  # Types
    export type PromptSourceType = 'prompt' | 'template' | 'builtin'
  # Interfaces
    export interface UniversalPromptData
    # id?: string
    # name: string
    # description?: string
    # messages: PromptMessage[]
    # variable_defaults?: PromptVariable[]
    # tools?: string[]
    # settings?: PromptSettings & { model_id?: string }
    # sourceType: PromptSourceType
    # ... 4 more fields
    export interface UniversalPromptEditorProps
    # /** Whether the editor modal is open */
    # isOpen: boolean
    # /** Callback when the editor is closed without saving */
    # onClose: () => void
    # /** The prompt data to edit */
    # promptData: UniversalPromptData
    # /** Array of available AI models */
    # models: any[]
    # ... 8 more fields
  # Functions
    export function normalizePromptData(record: any, sourceType: PromptSourceType): UniversalPromptData
    export function denormalizePromptData(data: UniversalPromptData): Record<string, any>


---
Filepath: features/prompts/components/universal-editor/index.ts  [typescript]



---
Filepath: features/prompts/components/universal-editor/EXAMPLE.tsx  [typescript/react]

  # Components
    [Component] export function ExamplePromptEditor({ promptId }: { promptId: string })
    [Component] export function ExampleTemplateEditor({ templateId }: { templateId: string })
    [Component] export function ExampleBuiltinEditor({ builtinId }: { builtinId: string })
    [Component] export function ExampleCreatePrompt()
    [Component] export function ExampleAdvancedEditor({ promptId }: { promptId: string })


---
Filepath: features/prompts/components/universal-editor/UniversalPromptEditor.tsx  [typescript/react]

  # Components
    [Component] export function UniversalPromptEditor({ isOpen, onClose, promptData, models, availableTools, onSave, isSaving, initialSelection })


---
Filepath: features/prompts/components/universal-editor/editors/BuiltinEditor.tsx  [typescript/react]

  # Components
    [Component] export function BuiltinEditor({ builtinId, isOpen, onClose, onSaveSuccess, initialSelection, builtinData, tools })
    Props: BuiltinEditorProps
      # builtinId: string
      # isOpen: boolean
      # onClose: () => void
      # onSaveSuccess?: () => void
      # initialSelection?: any
      # builtinData?: any
      # /** @deprecated Pass nothing — models come from Redux automatically */
      # models?: any[]
      #   # ... 1 more fields
  # Types & Interfaces
    interface BuiltinEditorProps


---
Filepath: features/prompts/components/universal-editor/editors/TemplateEditor.tsx  [typescript/react]

  # Components
    [Component] export function TemplateEditor({ templateId, isOpen, onClose, onSaveSuccess, initialSelection, templateData, tools })
    Props: TemplateEditorProps
      # templateId: string
      # isOpen: boolean
      # onClose: () => void
      # onSaveSuccess?: () => void
      # initialSelection?: any
      # templateData?: any
      # /** @deprecated Pass nothing — models come from Redux automatically */
      # models?: any[]
      #   # ... 1 more fields
  # Types & Interfaces
    interface TemplateEditorProps


---
Filepath: features/prompts/components/universal-editor/editors/index.ts  [typescript]



---
Filepath: features/prompts/components/universal-editor/editors/PromptEditor.tsx  [typescript/react]

  # Components
    [Component] export function PromptEditor({ promptId, isOpen, onClose, onSaveSuccess, initialSelection, promptData, tools })
    Props: PromptEditorProps
      # promptId: string
      # isOpen: boolean
      # onClose: () => void
      # onSaveSuccess?: () => void
      # initialSelection?: any
      # promptData?: any
      # /** @deprecated Pass nothing — models come from Redux automatically */
      # models?: any[]
      #   # ... 1 more fields
  # Types & Interfaces
    interface PromptEditorProps


---
Filepath: features/prompts/components/results-display/AdditionalInfoModal.tsx  [typescript/react]

  # Components
    [Component] export function AdditionalInfoModal({ isOpen, onContinue, onCancel, customMessage, countdownSeconds })
    Props: AdditionalInfoModalProps
      # isOpen: boolean
      # onContinue: (additionalInfo?: string) => void
      # onCancel: () => void
      # customMessage?: string; // Optional custom message to display
      # countdownSeconds?: number; // Optional override for countdown timer
  # Types & Interfaces
    interface AdditionalInfoModalProps


---
Filepath: features/prompts/components/results-display/PromptCompactModal.tsx  [typescript/react]

  # Components
    [Component] export default function PromptCompactModal({ isOpen, onClose, runId, }: PromptCompactModalProps)
    Props: PromptCompactModalProps
      # isOpen: boolean
      # onClose: () => void
      # runId: string
  # Types & Interfaces
    interface PromptCompactModalProps


---
Filepath: features/prompts/components/results-display/PromptFlexiblePanel.tsx  [typescript/react]

  # Components
    [Component] export default function PromptFlexiblePanel({ isOpen, onClose, runId, position, title, onExecutionComplete })
    Props: PromptFlexiblePanelProps
      # /** Whether the panel is open */
      # isOpen: boolean
      # /** Callback when panel closes */
      # onClose: () => void
      # /** Required: The run ID - instance must exist in Redux */
      # runId: string
      # /** Panel position */
      # position?: 'left' | 'right' | 'top' | 'bottom'
      #   # ... 4 more fields
  # Types & Interfaces
    interface PromptFlexiblePanelProps


---
Filepath: features/prompts/components/results-display/QuickAIResultsSheet.tsx  [typescript/react]

  # Components
    [Component] export function QuickAIResultsSheet()
  # Types & Interfaces
    interface RunListItem
    # id: string
    # name: string | null
    # source_type: string
    # source_id: string | null
    # message_count: number
    # is_starred: boolean
    # last_activity: string
    # isInRedux: boolean


---
Filepath: features/prompts/components/results-display/PromptSidebarRunner.tsx  [typescript/react]

  # Components
    [Component] export default function PromptSidebarRunner({ isOpen, onClose, runId, position, size, title })
    Props: PromptSidebarRunnerProps
      # /** Whether the sidebar is open */
      # isOpen: boolean
      # /** Callback when sidebar closes */
      # onClose: () => void
      # /** Required: The run ID - instance must exist in Redux */
      # runId: string
      # /** Sidebar position */
      # position?: 'left' | 'right'
      #   # ... 4 more fields
  # Types & Interfaces
    interface PromptSidebarRunnerProps


---
Filepath: features/prompts/components/results-display/PromptRunner.tsx  [typescript/react]

  # Components
    [Component] export function PromptRunner({ runId, onExecutionComplete, title, onClose, className, showSystemMessage, enableInlineCanvas })
    Props: PromptRunnerProps
      # /** Required: The run ID - instance must exist in Redux */
      # runId: string
      # /** Callback when execution completes */
      # onExecutionComplete?: (result: {
      # runId: string
      # response: string
      # metadata: any
      # }) => void
      #   # ... 10 more fields
  # Types & Interfaces
    export interface PromptRunnerProps


---
Filepath: features/prompts/components/results-display/PromptRunnerModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptRunnerModal({ isOpen, onClose, runId, title, onExecutionComplete, }: PromptRunnerModalProps)
    Props: PromptRunnerModalProps
      # /** Whether the modal is open */
      # isOpen: boolean
      # /** Callback when modal closes */
      # onClose: () => void
      # /** Required: The run ID - instance must exist in Redux */
      # runId: string
      # /** Optional title */
      # title?: string
      #   # ... 2 more fields
  # Types & Interfaces
    interface PromptRunnerModalProps


---
Filepath: features/prompts/components/results-display/PreExecutionInputModalContainer.tsx  [typescript/react]

  # Components
    [Component] export function PreExecutionInputModalContainer()


---
Filepath: features/prompts/components/results-display/ContextAwarePromptCompactModal.tsx  [typescript/react]

  # Components
    [Component] export function ContextAwarePromptCompactModal({ isOpen, onClose, promptData, promptId, executionConfig, allow_chat, show_variables, apply_variables, track_in_runs, use_pre_execution_input })
    Props: ContextAwarePromptCompactModalProps
      # isOpen: boolean
      # onClose: () => void
      # promptData?: PromptData
      # promptId?: string
      # executionConfig?: Omit<PromptExecutionConfig, 'result_display'>
      # title?: string
      # customMessage?: string
      # countdownSeconds?: number
      #   # ... 17 more fields
  # Types & Interfaces
    export interface ContextAwarePromptCompactModalProps


---
Filepath: features/prompts/components/results-display/PromptRunner.types.ts  [typescript]

  # Types
    export type PromptRunnerDisplayVariant = 'standard' | 'compact'
  # Interfaces
    export interface CanvasControl
    # isCanvasOpen: boolean
    # canvasContent: any
    # openCanvas: (content: any) => void
    # closeCanvas: () => void
    export interface MobileCanvasControl
    # isMobile: boolean
    # showCanvasOnMobile: boolean
    # setShowCanvasOnMobile: (show: boolean) => void
    export interface PromptRunnerDisplayProps
    # title?: string
    # className?: string
    # promptName: string
    # displayMessages: ConversationMessage[]
    # isExecutingPrompt: boolean
    # conversationStarted: boolean
    # variableDefaults: PromptVariable[]
    # shouldShowVariables: boolean
    # ... 15 more fields


---
Filepath: features/prompts/components/results-display/ActivePromptResults.tsx  [typescript/react]

  # Components
    [Component] export function ActivePromptResults()


---
Filepath: features/prompts/components/results-display/PromptToast.tsx  [typescript/react]

  # Components
    [Component] export default function PromptToast({ toastId, result, promptName, promptData, executionConfig, runId, taskId, isStreaming, onDismiss })
    Props: PromptToastProps
      # toastId: string
      # result: string
      # promptName: string
      # promptData?: any
      # executionConfig?: any
      # runId?: string; // ⭐ Execution instance runId
      # taskId?: string; // Socket.io task ID for loading full result
      # isStreaming?: boolean; // Whether the response is currently streaming
      #   # ... 1 more fields
  # Types & Interfaces
    interface PromptToastProps


---
Filepath: features/prompts/components/results-display/ContextAwarePromptRunner.tsx  [typescript/react]

  # Components
    [Component] export function ContextAwarePromptRunner({ runId, promptId, promptData, promptSource, executionConfig, initialContext, contextType, contextLanguage, contextFilename, onContextChange, onResponseComplete, onContextUpdateReady, staticVariables })
    Props: ContextAwarePromptRunnerProps
      # /** Optional: Pre-generated runId (if not provided, one will be generated) */
      # runId?: string
      # /** Prompt ID to run */
      # promptId?: string
      # /** Prompt data (if available) - will use promptData.id if promptId not provided */
      # promptData?: PromptData | null
      # /** Prompt source */
      # promptSource?: 'prompts' | 'prompt_builtins'
      #   # ... 22 more fields
  # Types & Interfaces
    export interface ContextAwarePromptRunnerProps


---
Filepath: features/prompts/components/results-display/index.ts  [typescript]



---
Filepath: features/prompts/components/results-display/PromptInlineOverlay.tsx  [typescript/react]

  # Components
    [Component] export default function PromptInlineOverlay({ isOpen, onClose, result, originalText, promptName, taskId, isStreaming, onReplace, onInsertBefore, onInsertAfter })
    Props: PromptInlineOverlayProps
      # isOpen: boolean
      # onClose: () => void
      # result: string
      # originalText: string
      # promptName: string
      # runId?: string; // ⭐ Execution instance runId
      # taskId?: string
      # isStreaming: boolean
      #   # ... 3 more fields
  # Types & Interfaces
    interface PromptInlineOverlayProps


---
Filepath: features/prompts/components/smart/CompactPromptInput.tsx  [typescript/react]

  # Components
    [Component] export function CompactPromptInput({ runId, placeholder = "Additional instructions (optional)
    Props: CompactPromptInputProps
      # /**
      # runId?: string
      # /** Optional UI customization props */
      # placeholder?: string
      # /** Upload configuration (with defaults) */
      # uploadBucket?: string
      # uploadPath?: string
      # enablePasteImages?: boolean
      #   # ... 9 more fields
  # Types & Interfaces
    interface CompactPromptInputProps


---
Filepath: features/prompts/components/smart/SmartResourcePickerButton.tsx  [typescript/react]

  # Components
    [Component] export function SmartResourcePickerButton({ runId, uploadBucket, uploadPath })
    Props: SmartResourcePickerButtonProps
      # /**
      # runId: string
      # /**
      # uploadBucket?: string
      # uploadPath?: string
  # Types & Interfaces
    interface SmartResourcePickerButtonProps


---
Filepath: features/prompts/components/smart/SmartPromptRunner.tsx  [typescript/react]

  # Components
    [Component] export function SmartPromptRunner({ promptId, executionConfig, variables, initialMessage, onExecutionComplete, title, runId, onClose, className, isActive, showSystemMessage })
    Props: SmartPromptRunnerProps
      # promptId?: string
      # executionConfig?: Omit<NewExecutionConfig, 'result_display'>
      # variables?: Record<string, string>
      # initialMessage?: string
      # onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void
      # title?: string
      # runId?: string
      # onClose?: () => void
      #   # ... 7 more fields
  # Types & Interfaces
    export interface SmartPromptRunnerProps


---
Filepath: features/prompts/components/smart/CompactPromptModal.tsx  [typescript/react]

  # Components
    [Component] export function CompactPromptModal({ isOpen, onClose, runId, onSubmit, mode, placeholder, uploadBucket, uploadPath, enablePasteImages })
    Props: CompactPromptModalProps
      # /** Control modal visibility */
      # isOpen: boolean
      # onClose: () => void
      # /**
      # runId?: string
      # /** Optional callbacks */
      # onSubmit?: () => void; // Called after successful submission
      # /**
      #   # ... 13 more fields
  # Types & Interfaces
    interface CompactPromptModalProps


---
Filepath: features/prompts/components/smart/index.ts  [typescript]



---
Filepath: features/prompts/components/smart/SmartPromptInput.tsx  [typescript/react]

  # Components
    [Component] export function SmartPromptInput({ runId, placeholder, sendButtonVariant, showShiftEnterHint, showSubmitOnEnterToggle, uploadBucket, uploadPath, enablePasteImages, compact })
    Props: SmartPromptInputProps
      # /**
      # runId?: string
      # /** Optional UI customization props */
      # placeholder?: string
      # sendButtonVariant?: 'gray' | 'blue' | 'default'
      # showShiftEnterHint?: boolean
      # /** Optional display control */
      # showSubmitOnEnterToggle?: boolean; // Controls visibility of submit on enter toggle
      #   # ... 8 more fields
  # Types & Interfaces
    interface SmartPromptInputProps


---
Filepath: features/prompts/components/smart/StreamingAssistantMessage.tsx  [typescript/react]

  # Components
    [Component] export function StreamingAssistantMessage({ taskId, messageIndex, compact, }: StreamingAssistantMessageProps)
    Props: StreamingAssistantMessageProps
      # taskId: string
      # messageIndex: number
      # compact?: boolean
  # Types & Interfaces
    interface StreamingAssistantMessageProps


---
Filepath: features/prompts/components/smart/SmartMessageList.tsx  [typescript/react]

  # Components
    [Component] export function SmartMessageList({ runId, className, emptyStateMessage, showSystemMessage, compact })
    Props: SmartMessageListProps
      # runId: string
      # className?: string
      # emptyStateMessage?: string
      # showSystemMessage?: boolean
      # /** Compact mode: reduces spacing and simplifies message display */
      # compact?: boolean
  # Types & Interfaces
    interface SmartMessageListProps


---
Filepath: features/prompts/components/resource-display/ResourceDisplay.tsx  [typescript/react]

  # Components
    [Component] export function ResourceDisplay({ resource, className }: ResourceDisplayProps)
    Props: ResourceDisplayProps
      # resource: ParsedResource
      # className?: string
    [Component] export function ResourcesContainer({ resources, className }: ResourcesContainerProps)
    Props: ResourcesContainerProps
      # resources: ParsedResource[]
      # className?: string
  # Types & Interfaces
    interface ResourceDisplayProps
    interface ResourcesContainerProps


---
Filepath: features/prompts/components/resource-display/ResourceDebugModal.tsx  [typescript/react]

  # Components
    [Component] export function ResourceDebugModal({ resources, isVisible, chatInput, variableDefaults })
    Props: ResourceDebugModalProps
      # resources: Resource[]
      # isVisible: boolean
      # chatInput?: string
      # variableDefaults?: PromptVariable[]
  # Types & Interfaces
    interface ResourceDebugModalProps


---
Filepath: features/prompts/components/resource-display/ResourcePreviewSheet.tsx  [typescript/react]

  # Types & Interfaces
    interface ResourcePreviewSheetProps
    # isOpen: boolean
    # onClose: () => void
    # resource: Resource | null
    # onRemove?: () => void


---
Filepath: features/prompts/components/resource-display/ResourceChips.tsx  [typescript/react]

  # Components
    [Component] export function ResourceChips({ resources, onRemove, onPreview }: ResourceChipsProps)
    Props: ResourceChipsProps
      # resources: Resource[]
      # onRemove: (index: number) => void
      # onPreview?: (resource: Resource, index: number) => void
  # Types & Interfaces
    interface ResourceChipsProps


---
Filepath: features/prompts/components/resource-display/index.ts  [typescript]



---
Filepath: features/prompts/components/builder-new/AgentSettingsPanelWrapper.tsx  [typescript/react]

  # Components
    [Component] export function AgentSettingsPanelInline({ agentId, }: AgentSettingsPanelWrapperProps)
    [Component] export function AgentSettingsModalTrigger({ agentId, }: AgentSettingsPanelWrapperProps)
  # Types & Interfaces
    interface AgentSettingsPanelWrapperProps
    # agentId: string


---
Filepath: features/prompts/components/builder-new/PromptSettingsPanel.tsx  [typescript/react]

  # Components
    [Component] export const PromptSettingsPanel = () =>


---
Filepath: features/prompts/components/builder-new/AgentSettingsBridge.tsx  [typescript/react]

  # Components
    [Component] export function AgentSettingsBridge({ agentId }: AgentSettingsBridgeProps)
    Props: AgentSettingsBridgeProps
      # agentId: string
  # Types & Interfaces
    interface AgentSettingsBridgeProps


---
Filepath: features/prompts/components/builder-new/PromptBuilderRedux.tsx  [typescript/react]

  # Components
    [Component] export const PromptBuilderRedux = ({ promptId, }) =>
    Props: PromptBuilderReduxProps
      # promptId?: string
  # Types & Interfaces
    interface PromptBuilderReduxProps


---
Filepath: features/prompts/components/builder-new/PromptVariableManager.tsx  [typescript/react]

  # Components
    [Component] export const PromptVariableManager = () =>


---
Filepath: features/prompts/components/builder-new/PromptMessageList.tsx  [typescript/react]

  # Components
    [Component] export const PromptMessageList = () =>


---
Filepath: features/prompts/components/builder-new/PromptTestPanel.tsx  [typescript/react]

  # Components
    [Component] export const PromptTestPanel = () =>


---
Filepath: features/prompts/components/tabbed-builder/PreviewTab.tsx  [typescript/react]

  # Components
    [Component] export const PreviewTab = () =>


---
Filepath: features/prompts/components/tabbed-builder/ToneTab.tsx  [typescript/react]

  # Components
    [Component] export const ToneTab = () =>
  # Types & Interfaces
    interface ToneContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/PromptBuilderContext.tsx  [typescript/react]

  # Components
    [Component] export const PromptBuilderProvider = ({ children }) =>
  # Hooks
    [Hook] export const usePromptBuilder = () =>
  # Types & Interfaces
    interface TabContentMap
    # [tabNumber: number]: string
    interface PromptBuilderContextProps
    # activeTab: string
    # setActiveTab: (tab: string) => void
    # enabledSections: Record<string, boolean>
    # toggleSection: (sectionId: string) => void
    # globalPrompt: string
    # setGlobalPrompt: (prompt: string) => void
    # finalPrompt: string
    # generateFinalPrompt: () => string
    # ... 3 more fields


---
Filepath: features/prompts/components/tabbed-builder/KnowledgeTab.tsx  [typescript/react]

  # Components
    [Component] export const KnowledgeTab = () =>
  # Types & Interfaces
    interface KnowledgeContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/ContextTab.tsx  [typescript/react]

  # Components
    [Component] export const ContextTab = () =>
  # Types & Interfaces
    interface ContextContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/TabTemplate.tsx  [typescript/react]

  # Components
    [Component] export const NewTab = ({ updateContent }) =>
    Props: NewTabProps
      # updateContent?: (content: string) => void
  # Types & Interfaces
    interface NewTabProps


---
Filepath: features/prompts/components/tabbed-builder/TabBase.tsx  [typescript/react]

  # Components
    [Component] export const TabBase = ({ id, tabNumber, title, description, isEnabled, onToggle, children, alwaysEnabled, footer }) =>
    Props: TabBaseProps
      # id: string
      # tabNumber: number
      # title?: string
      # description?: string
      # isEnabled: boolean
      # onToggle: (id: string) => void
      # children: React.ReactNode
      # alwaysEnabled?: boolean
      #   # ... 1 more fields
  # Types & Interfaces
    interface TabBaseProps
    interface ContentComponentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/ExamplesTab.tsx  [typescript/react]

  # Components
    [Component] export const ExamplesTab = () =>
  # Types & Interfaces
    interface ExamplesContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/GenericTextareaTab.tsx  [typescript/react]

  # Components
    [Component] export const GenericTextareaTab = ({ id, tabNumber, alwaysEnabled = false, label, placeholder }) =>
    Props: GenericTextareaTabProps
      # id: string
      # tabNumber: number
      # alwaysEnabled?: boolean
      # label?: string
      # placeholder?: string
  # Types & Interfaces
    interface GenericTextareaContentProps
    # updateContent?: (content: string) => void
    # id: string
    # label?: string
    # placeholder?: string
    # tabNumber: number
    interface GenericTextareaTabProps


---
Filepath: features/prompts/components/tabbed-builder/MainPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export const MainPromptBuilder = () =>


---
Filepath: features/prompts/components/tabbed-builder/AudienceTab.tsx  [typescript/react]

  # Components
    [Component] export const AudienceTab = () =>
  # Types & Interfaces
    interface AudienceContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/ConstraintsTab.tsx  [typescript/react]

  # Components
    [Component] export const ConstraintsTab = () =>
  # Types & Interfaces
    interface ConstraintsContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/constants.tsx  [typescript/react]



---
Filepath: features/prompts/components/tabbed-builder/EmphasisTab.tsx  [typescript/react]

  # Components
    [Component] export const EmphasisTab = () =>
  # Types & Interfaces
    interface EmphasisContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/EvaluationTab.tsx  [typescript/react]

  # Components
    [Component] export const EvaluationTab = () =>
  # Types & Interfaces
    interface EvaluationContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/TaskTab.tsx  [typescript/react]

  # Components
    [Component] export const TaskTab = () =>
    Props: TaskTabProps
      # updateContent?: (content: string) => void
  # Types & Interfaces
    interface TaskTabProps


---
Filepath: features/prompts/components/tabbed-builder/FormatTab.tsx  [typescript/react]

  # Components
    [Component] export const FormatTab = () =>
  # Types & Interfaces
    interface FormatContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/tabbed-builder/MotivationTab.tsx  [typescript/react]

  # Components
    [Component] export const MotivationTab = () =>
  # Types & Interfaces
    interface MotivationContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/prompts/components/common/PromptImporter.tsx  [typescript/react]

  # Components
    [Component] export function PromptImporter({ isOpen, onClose, onImportSuccess }: PromptImporterProps)
    Props: PromptImporterProps
      # isOpen: boolean
      # onClose: () => void
      # onImportSuccess?: (promptId: string) => void
  # Types & Interfaces
    interface PromptImporterProps


---
Filepath: features/prompts/components/common/ImportPromptButton.tsx  [typescript/react]

  # Components
    [Component] export function ImportPromptButton()


---
Filepath: features/prompts/components/common/GeneratePromptButton.tsx  [typescript/react]

  # Components
    [Component] export function GeneratePromptButton()


---
Filepath: features/prompts/components/layouts/FilterModal.tsx  [typescript/react]

  # Components
    [Component] export function FilterModal({ isOpen, onClose, sortBy, onSortChange, includedCats, onIncludedCatsChange, includedTags, onIncludedTagsChange, favFilter, onFavFilterChange, archFilter, onArchFilterChange, favoritesFirst, onFavoritesFirstChange, allCategories, allTags })
    Props: FilterModalProps
      # isOpen: boolean
      # onClose: () => void
      # sortBy: PromptSortOption
      # onSortChange: (value: PromptSortOption) => void
      # includedCats: string[]
      # onIncludedCatsChange: (v: string[]) => void
      # includedTags: string[]
      # onIncludedTagsChange: (v: string[]) => void
      #   # ... 8 more fields
  # Types & Interfaces
    interface FilterModalProps


---
Filepath: features/prompts/components/layouts/PromptsPageHeader.tsx  [typescript/react]

  # Components
    [Component] export function PromptsPageHeader()


---
Filepath: features/prompts/components/layouts/SharedPromptListItem.tsx  [typescript/react]

  # Components
    [Component] export function SharedPromptListItem({ id, name, description, permissionLevel, ownerEmail, onDuplicate, onNavigate, isDuplicating, isNavigating, isAnyNavigating })
    Props: SharedPromptListItemProps
      # id: string
      # name: string
      # description?: string | null
      # permissionLevel: PermissionLevel
      # ownerEmail: string
      # onDuplicate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      # isDuplicating?: boolean
      #   # ... 2 more fields
  # Types & Interfaces
    interface SharedPromptListItemProps


---
Filepath: features/prompts/components/layouts/PromptMetadataModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptMetadataModal({ isOpen, onClose, prompt, }: PromptMetadataModalProps)
    Props: PromptMetadataModalProps
      # isOpen: boolean
      # onClose: () => void
      # prompt: PromptData
  # Types & Interfaces
    interface PromptMetadataModalProps


---
Filepath: features/prompts/components/layouts/ConvertToBuiltinModal.tsx  [typescript/react]

  # Components
    [Component] export function ConvertToBuiltinModal({ isOpen, onClose, promptId, promptName, currentPromptData, onSuccess })
    Props: ConvertToBuiltinModalProps
      # isOpen: boolean
      # onClose: () => void
      # promptId: string
      # promptName: string
      # /** Live in-memory prompt data from the editor — uses DB fallback if not provided */
      # currentPromptData?: CurrentPromptData
      # onSuccess?: () => void
  # Types & Interfaces
    interface CurrentPromptData
    # name: string
    # messages?: unknown
    # variableDefaults?: PromptVariable[]
    # settings?: Record<string, unknown>
    # description?: string
    # tools?: unknown
    interface ConvertToBuiltinModalProps
    interface ShortcutWithRelations extends PromptShortcut
    # category: ShortcutCategory | null
    # builtin: PromptBuiltin | null


---
Filepath: features/prompts/components/layouts/NewPromptModal.tsx  [typescript/react]

  # Components
    [Component] export function NewPromptModal({ isOpen, onClose }: NewPromptModalProps)
    Props: NewPromptModalProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface NewPromptModalProps
    interface ActionButtonProps
    # icon: React.ReactNode
    # title: string
    # description: string
    # gradient: string
    # onClick: () => void


---
Filepath: features/prompts/components/layouts/PromptBuilderModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderModal({ isOpen, onClose, }: PromptBuilderModalProps)
    Props: PromptBuilderModalProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface PromptBuilderModalProps


---
Filepath: features/prompts/components/layouts/PromptBuilderHeaderCompact.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderHeaderCompact({ promptName, onPromptNameChange, isDirty, isSaving, onSave, onOpenFullScreenEditor, onOpenSettings, developerMessage, onDeveloperMessageChange, fullPromptObject, onAcceptFullPrompt, onAcceptAsCopy, mobileActiveTab, onMobileTabChange, promptId })
    Props: PromptBuilderHeaderCompactProps
      # promptName: string
      # onPromptNameChange: (value: string) => void
      # isDirty: boolean
      # isSaving: boolean
      # onSave: () => void
      # onOpenFullScreenEditor?: () => void
      # onOpenSettings?: () => void
      # developerMessage: string
      #   # ... 7 more fields
  # Types & Interfaces
    interface PromptBuilderHeaderCompactProps


---
Filepath: features/prompts/components/layouts/PromptsGrid.tsx  [typescript/react]

  # Components
    [Component] export function PromptsGrid()


---
Filepath: features/prompts/components/layouts/FloatingActionBar.tsx  [typescript/react]

  # Components
    [Component] export function FloatingActionBar({ searchValue, onSearchChange, onFilterClick, onNewClick, showFilterBadge })
    Props: FloatingActionBarProps
      # searchValue: string
      # onSearchChange: (value: string) => void
      # onFilterClick: () => void
      # onNewClick: () => void
      # showFilterBadge?: boolean
  # Types & Interfaces
    interface FloatingActionBarProps


---
Filepath: features/prompts/components/layouts/DesktopFilterPanel.tsx  [typescript/react]

  # Components
    [Component] export function DesktopFilterPanel({ sortBy, setSortBy, activeTab, setActiveTab, includedCats, setIncludedCats, includedTags, setIncludedTags, favFilter, setFavFilter, archFilter, setArchFilter, favoritesFirst, setFavoritesFirst, allCategories, allTags, resetFilters, activeFilterCount, hasShared })
    Props: DesktopFilterPanelProps
      # sortBy: PromptSortOption
      # setSortBy: (v: PromptSortOption) => void
      # activeTab: PromptTab | AgentTab
      # setActiveTab: (v: PromptTab | AgentTab) => void
      # includedCats: string[]
      # setIncludedCats: (v: string[]) => void
      # includedTags: string[]
      # setIncludedTags: (v: string[]) => void
      #   # ... 11 more fields
  # Types & Interfaces
    interface DesktopFilterPanelProps


---
Filepath: features/prompts/components/layouts/DesktopSearchBar.tsx  [typescript/react]

  # Components
    [Component] export function DesktopSearchBar({ searchValue, onSearchChange, onNewClick, }: DesktopSearchBarProps)
    Props: DesktopSearchBarProps
      # searchValue: string
      # onSearchChange: (value: string) => void
      # onNewClick: () => void
      # /** @deprecated No longer used — filter button moved to DesktopFilterPanel */
      # onFilterClick?: () => void
      # /** @deprecated */
      # showFilterBadge?: boolean
      # /** @deprecated */
      #   # ... 1 more fields
  # Types & Interfaces
    interface DesktopSearchBarProps


---
Filepath: features/prompts/components/layouts/TemplatesGrid.tsx  [typescript/react]

  # Components
    [Component] export function TemplatesGrid({ templates }: TemplatesGridProps)
    Props: TemplatesGridProps
      # templates: Template[]
  # Types & Interfaces
    interface Template
    interface TemplatesGridProps


---
Filepath: features/prompts/components/layouts/PromptActionsMenu.tsx  [typescript/react]

  # Components
    [Component] export function PromptActionsMenu({ promptId, promptData, trigger, triggerClassName, align, side, onDuplicateSuccess, onConvertToTemplateSuccess, onConvertToBuiltinSuccess })
    Props: PromptActionsMenuProps
      # /** Prompt ID - required */
      # promptId: string
      # /** Prompt data for operations that need it (duplicate, create app) */
      # promptData?: {
      # name: string
      # messages?: PromptMessage[]
      # variableDefaults?: PromptVariable[]
      # settings?: Record<string, unknown>
      #   # ... 17 more fields
  # Types & Interfaces
    export interface PromptActionsMenuProps


---
Filepath: features/prompts/components/layouts/PromptListItem.tsx  [typescript/react]

  # Components
    [Component] export function PromptListItem({ id, name, description, promptData, onDelete, onDuplicate, onNavigate, isDeleting, isDuplicating, isNavigating, isAnyNavigating })
    Props: PromptListItemProps
      # id: string
      # name: string
      # description?: string
      # promptData?: PromptData
      # onDelete?: (id: string) => void
      # onDuplicate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      # isDeleting?: boolean
      #   # ... 3 more fields
  # Types & Interfaces
    interface PromptListItemProps


---
Filepath: features/prompts/components/layouts/PromptCard.tsx  [typescript/react]

  # Components
    [Component] export function PromptCard({ id, name, description, promptData, isOwner, isAdmin, onDelete, onDuplicate, onNavigate, isDeleting, isDuplicating, isNavigating, isAnyNavigating })
    Props: PromptCardProps
      # id: string
      # name: string
      # description?: string
      # promptData?: PromptData
      # isOwner?: boolean
      # isAdmin?: boolean
      # onDelete?: (id: string) => void
      # onDuplicate?: (id: string) => void
      #   # ... 5 more fields
  # Types & Interfaces
    interface PromptCardProps


---
Filepath: features/prompts/components/layouts/PromptActionModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptActionModal({ isOpen, onClose, promptName, promptDescription, onRun, onEdit, onView, onDuplicate, onShare, onDelete, onCreateApp, showView, showDuplicate, showShare, showDelete, showCreateApp, isDeleting, isDuplicating })
    Props: PromptActionModalProps
      # isOpen: boolean
      # onClose: () => void
      # promptId?: string
      # promptName: string
      # promptDescription?: string
      # onRun: () => void
      # onEdit: () => void
      # onView?: () => void
      #   # ... 11 more fields
  # Types & Interfaces
    interface PrimaryActionButtonProps
    # icon: LucideIcon
    # title: string
    # onClick: (e: React.MouseEvent) => void
    # disabled?: boolean
    # gradientFrom: string
    # gradientTo: string
    # iconBgColor: string
    # iconTextColor: string
    interface PromptActionModalProps


---
Filepath: features/prompts/components/layouts/PromptsFilter.tsx  [typescript/react]

  # Components
    [Component] export function PromptsFilter({ prompts, onFilteredPromptsChange }: PromptsFilterProps)
    Props: PromptsFilterProps
      # prompts: Prompt[]
      # onFilteredPromptsChange: (filtered: Prompt[]) => void
  # Types & Interfaces
    interface Prompt
    interface PromptsFilterProps


---
Filepath: features/prompts/components/layouts/SharedPromptCard.tsx  [typescript/react]

  # Components
    [Component] export function SharedPromptCard({ id, name, description, permissionLevel, ownerEmail, onDuplicate, onNavigate, isDuplicating, isNavigating, isAnyNavigating })
    Props: SharedPromptCardProps
      # id: string
      # name: string
      # description?: string | null
      # permissionLevel: PermissionLevel
      # ownerEmail: string
      # onDuplicate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      # isDuplicating?: boolean
      #   # ... 2 more fields
  # Types & Interfaces
    interface SharedPromptCardProps


---
Filepath: features/prompts/components/layouts/TemplateCard.tsx  [typescript/react]

  # Components
    [Component] export function TemplateCard({ id, name, description, category, isFeatured, useCount, onUseTemplate, onNavigate, isNavigating, isUsingTemplate, isAnyProcessing })
    Props: TemplateCardProps
      # id: string
      # name: string
      # description: string | null
      # category: string | null
      # isFeatured: boolean
      # useCount: number
      # onUseTemplate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      #   # ... 3 more fields
  # Types & Interfaces
    interface TemplateCardProps


---
Filepath: features/prompts/components/layouts/FavoriteButton.tsx  [typescript/react]

  # Components
    [Component] export function FavoriteButton({ id, promptData, isFavorite, variant, disabled, className })
    Props: FavoriteButtonProps
      # id: string
      # promptData?: PromptData
      # isFavorite?: boolean
      # /** "card" = absolute-positioned corner star, "list" = inline icon button */
      # variant?: "card" | "list"
      # disabled?: boolean
      # className?: string
  # Types & Interfaces
    interface FavoriteButtonProps


---
Filepath: features/prompts/components/runner-tester/PromptExecutionTestModal.tsx  [typescript/react]

  # Components
    [Component] export default function PromptExecutionTestModal({ isOpen, onClose, testType, promptId, promptSource, executionConfig, variables })
    Props: PromptExecutionTestModalProps
      # isOpen: boolean
      # onClose: () => void
      # testType: 'direct' | 'inline' | 'background'
      # promptId: string
      # promptSource?: 'prompts' | 'prompt_builtins'
      # executionConfig: PromptExecutionConfig
      # variables?: Record<string, string>
      # resources?: any[]
      #   # ... 1 more fields
  # Types & Interfaces
    interface PromptExecutionTestModalProps


---
Filepath: features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx  [typescript/react]

  # Components
    [Component] export function PromptRunnerModalSidebarTester({ runId }: PromptRunnerModalSidebarTesterProps)
    Props: PromptRunnerModalSidebarTesterProps
      # runId?: string
  # Types & Interfaces
    interface PromptRunnerModalSidebarTesterProps


---
Filepath: features/prompts/components/variable-inputs/index.tsx  [typescript/react]

  # Components
    [Component] export function VariableInputComponent({ value, onChange, variableName, customComponent, onRequestClose, helpText, compact })
    Props: VariableInputComponentProps
      # value: string
      # onChange: (value: string) => void
      # variableName: string
      # customComponent?: VariableCustomComponent
      # onRequestClose?: () => void
      # helpText?: string
      # compact?: boolean
  # Types & Interfaces
    interface VariableInputComponentProps


---
Filepath: features/prompts/components/variable-inputs/RadioGroupInput.tsx  [typescript/react]

  # Components
    [Component] export function RadioGroupInput({ value, onChange, options, variableName, allowOther, compact })
    Props: RadioGroupInputProps
      # value: string
      # onChange: (value: string) => void
      # options: string[]
      # variableName: string
      # allowOther?: boolean
      # compact?: boolean
  # Types & Interfaces
    interface RadioGroupInputProps


---
Filepath: features/prompts/components/variable-inputs/SelectInput.tsx  [typescript/react]

  # Components
    [Component] export function SelectInput({ value, onChange, options, variableName, allowOther, compact })
    Props: SelectInputProps
      # value: string
      # onChange: (value: string) => void
      # options: string[]
      # variableName: string
      # allowOther?: boolean
      # compact?: boolean
  # Types & Interfaces
    interface SelectInputProps


---
Filepath: features/prompts/components/variable-inputs/TextareaInput.tsx  [typescript/react]

  # Components
    [Component] export function TextareaInput({ value, onChange, variableName, onRequestClose, compact })
    Props: TextareaInputProps
      # value: string
      # onChange: (value: string) => void
      # variableName: string
      # onRequestClose?: () => void
      # compact?: boolean
  # Types & Interfaces
    interface TextareaInputProps


---
Filepath: features/prompts/components/variable-inputs/CheckboxGroupInput.tsx  [typescript/react]

  # Components
    [Component] export function CheckboxGroupInput({ value, onChange, options, variableName, allowOther, compact })
    Props: CheckboxGroupInputProps
      # value: string
      # onChange: (value: string) => void
      # options: string[]
      # variableName: string
      # allowOther?: boolean
      # compact?: boolean
  # Types & Interfaces
    interface CheckboxGroupInputProps


---
Filepath: features/prompts/components/variable-inputs/NumberInput.tsx  [typescript/react]

  # Components
    [Component] export function NumberInput({ value, onChange, min, max, step, variableName, compact })
    Props: NumberInputProps
      # value: string
      # onChange: (value: string) => void
      # min?: number
      # max?: number
      # step?: number
      # variableName: string
      # compact?: boolean
  # Types & Interfaces
    interface NumberInputProps


---
Filepath: features/prompts/components/variable-inputs/ToggleInput.tsx  [typescript/react]

  # Components
    [Component] export function ToggleInput({ value, onChange, offLabel, onLabel, variableName, compact })
    Props: ToggleInputProps
      # value: string
      # onChange: (value: string) => void
      # offLabel?: string
      # onLabel?: string
      # variableName: string
      # compact?: boolean
  # Types & Interfaces
    interface ToggleInputProps


---
Filepath: features/prompts/components/actions/PromptExecutionButton.tsx  [typescript/react]

  # Components
    [Component] export default function PromptExecutionButton({ config, label, variant, size, icon, fullWidth, className, disabled, tooltip, onExecutionStart, onExecutionComplete })
    [Component] export function PromptExecutionIconButton({ config, icon, tooltip, variant, size, className, disabled, onExecutionStart, onExecutionComplete })


---
Filepath: features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer.tsx  [typescript/react]

  # Components
    [Component] export function SystemPromptOptimizer({ isOpen, onClose, currentSystemMessage, onAccept, fullPromptObject, onAcceptFullPrompt, onAcceptAsCopy })
    Props: SystemPromptOptimizerProps
      # isOpen: boolean
      # onClose: () => void
      # currentSystemMessage: string
      # onAccept: (optimizedText: string) => void
      # fullPromptObject?: any
      # onAcceptFullPrompt?: (optimizedObject: any) => void
      # onAcceptAsCopy?: (optimizedObject: any) => void
  # Types & Interfaces
    interface SystemPromptOptimizerProps


---
Filepath: features/prompts/components/actions/prompt-optimizers/FullPromptOptimizer.tsx  [typescript/react]

  # Components
    [Component] export function FullPromptOptimizer({ isOpen, onClose, currentPromptObject, onAccept, onAcceptAsCopy })
    Props: FullPromptOptimizerProps
      # isOpen: boolean
      # onClose: () => void
      # currentPromptObject: any
      # onAccept: (optimizedObject: any) => void
      # onAcceptAsCopy?: (optimizedObject: any) => void
  # Types & Interfaces
    interface FullPromptOptimizerProps


---
Filepath: features/prompts/components/actions/prompt-generator/progressive-json-parser.ts  [typescript]

  # Interfaces
    export interface PartialPromptData
    # name?: string
    # description?: string
    # messages?: Array<{
    # role: string
    # content: string
    # }>
    # variableDefaults?: Array<{
    # name: string
    # ... 14 more fields
  # Functions
    export function parsePartialJson(text: string): PartialPromptData
    export function extractJsonBlock(text: string): string | null
    export function extractNonJsonContent(text: string)


---
Filepath: features/prompts/components/actions/prompt-generator/PromptJsonDisplay.tsx  [typescript/react]

  # Components
    [Component] export function PromptJsonDisplay(props: PromptJsonDisplayProps)
    Props: PromptJsonDisplayProps
      # content: string
      # isStreamActive?: boolean
      # className?: string
  # Types & Interfaces
    interface PromptJsonDisplayProps


---
Filepath: features/prompts/components/actions/prompt-generator/PromptGenerator.tsx  [typescript/react]

  # Components
    [Component] export function PromptGenerator({ isOpen, onClose }: PromptGeneratorProps)
    Props: PromptGeneratorProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface PromptGeneratorProps


---
Filepath: features/prompts/components/actions/prompt-generator/HighlightedMessageContent.tsx  [typescript/react]

  # Components
    [Component] export function HighlightedMessageContent({ content, isStreamActive = false, }: HighlightedMessageContentProps)
    Props: HighlightedMessageContentProps
      # content: string
      # isStreamActive?: boolean
    [Component] export function HighlightedMessageContentMarkdown({ content, isStreamActive = false, }: HighlightedMessageContentProps)
  # Types & Interfaces
    interface HighlightedMessageContentProps


---
Filepath: features/prompts/components/resource-picker/NotesResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function NotesResourcePicker({ onBack, onSelect, }: NotesResourcePickerProps)
    Props: NotesResourcePickerProps
      # onBack: () => void
      # onSelect: (note: Note) => void
  # Types & Interfaces
    interface NotesResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/YouTubeResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function YouTubeResourcePicker({ onBack, onSelect, initialUrl }: YouTubeResourcePickerProps)
    Props: YouTubeResourcePickerProps
      # onBack: () => void
      # onSelect: (video: YouTubeVideo) => void
      # initialUrl?: string
  # Types & Interfaces
    interface YouTubeResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/TablesResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function TablesResourcePicker({ onBack, onSelect }: TablesResourcePickerProps)
    Props: TablesResourcePickerProps
      # onBack: () => void
      # onSelect: (reference: TableReference) => void
  # Types & Interfaces
    interface UserTable
    # id: string
    # table_name: string
    # description?: string
    # created_at: string
    # updated_at: string
    # is_public: boolean
    interface TableField
    # id: string
    # field_name: string
    # display_name: string
    # data_type: string
    # field_order: number
    # is_required: boolean
    interface TableRow
    # id: string
    # data: Record<string, any>
    interface TableReference
    # type: 'full_table' | 'table_row' | 'table_column' | 'table_cell'
    # table_id: string
    # table_name: string
    # row_id?: string
    # column_name?: string
    # column_display_name?: string
    # description: string
    interface TablesResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/AudioResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function AudioResourcePicker({ onBack, onSelect }: AudioResourcePickerProps)
    Props: AudioResourcePickerProps
      # onBack: () => void
      # onSelect: (audioData: AudioData) => void
  # Types & Interfaces
    interface AudioResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/ResourcePickerMenu.tsx  [typescript/react]

  # Components
    [Component] export function ResourcePickerMenu({ onResourceSelected, onClose, attachmentCapabilities, onSettingsClick, onDebugClick, showDebugActive })
    Props: ResourcePickerMenuProps
      # onResourceSelected: (resource: any) => void
      # onClose: () => void
      # attachmentCapabilities?: {
      # supportsImageUrls?: boolean
      # supportsFileUrls?: boolean
      # supportsYoutubeVideos?: boolean
      # supportsAudio?: boolean
      # }
      #   # ... 3 more fields
  # Types & Interfaces
    interface ResourcePickerMenuProps


---
Filepath: features/prompts/components/resource-picker/UploadResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function UploadResourcePicker({ onBack, onSelect }: UploadResourcePickerProps)
    Props: UploadResourcePickerProps
      # onBack: () => void
      # onSelect: (files: UploadedFile[]) => void
  # Types & Interfaces
    interface UploadedFile
    # url: string
    # type: string
    # details?: EnhancedFileDetails
    interface UploadResourcePickerProps
    interface FileStatus
    # file: File
    # status: "pending" | "compressing" | "uploading" | "done" | "error"
    # errorMessage?: string
    # compressionNote?: string


---
Filepath: features/prompts/components/resource-picker/FileUrlResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function FileUrlResourcePicker({ onBack, onSelect, onSwitchTo, initialUrl }: FileUrlResourcePickerProps)
    Props: FileUrlResourcePickerProps
      # onBack: () => void
      # onSelect: (fileUrl: FileUrlData) => void
      # onSwitchTo?: (type: 'webpage' | 'youtube' | 'image_url', url: string) => void
      # initialUrl?: string
  # Types & Interfaces
    interface FileUrlResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/ResourcePickerButton.tsx  [typescript/react]

  # Components
    [Component] export function ResourcePickerButton({ onResourceSelected, attachmentCapabilities }: ResourcePickerButtonProps)
    Props: ResourcePickerButtonProps
      # onResourceSelected?: (resource: any) => void
      # attachmentCapabilities?: {
      # supportsImageUrls?: boolean
      # supportsFileUrls?: boolean
      # supportsYoutubeVideos?: boolean
      # }
  # Types & Interfaces
    interface ResourcePickerButtonProps


---
Filepath: features/prompts/components/resource-picker/FilesResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function FilesResourcePicker({ onBack, onSelect, allowedBuckets, }: FilesResourcePickerProps)
    Props: FilesResourcePickerProps
      # onBack: () => void
      # onSelect: (selection: FileSelection) => void
      # allowedBuckets?: string[]; // Optional: filter to specific buckets
  # Types & Interfaces
    interface FilesResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/ImageUrlResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function ImageUrlResourcePicker({ onBack, onSelect, onSwitchTo, initialUrl }: ImageUrlResourcePickerProps)
    Props: ImageUrlResourcePickerProps
      # onBack: () => void
      # onSelect: (imageUrl: ImageUrlData) => void
      # onSwitchTo?: (type: 'webpage' | 'youtube' | 'file_url', url: string) => void
      # initialUrl?: string
  # Types & Interfaces
    interface ImageUrlResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/index.ts  [typescript]



---
Filepath: features/prompts/components/resource-picker/WebpageResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function WebpageResourcePicker({ onBack, onSelect, onSwitchTo, initialUrl, }: WebpageResourcePickerProps)
    Props: WebpageResourcePickerProps
      # onBack: () => void
      # onSelect: (content: WebpageContent) => void
      # onSwitchTo?: (
      # type: "youtube" | "image_url" | "file_url"
      # url: string
      # ) => void
      # initialUrl?: string
  # Types & Interfaces
    interface WebpageContent
    # url: string
    # title: string
    # textContent: string
    # charCount: number
    # scrapedAt: string
    interface WebpageResourcePickerProps


---
Filepath: features/prompts/components/resource-picker/TasksResourcePicker.tsx  [typescript/react]

  # Components
    [Component] export function TasksResourcePicker({ onBack, onSelect }: TasksResourcePickerProps)
    Props: TasksResourcePickerProps
      # onBack: () => void
      # onSelect: (selection: { type: 'task' | 'project'; data: DatabaseTask | ProjectWithTasks }) => void
  # Types & Interfaces
    interface TasksResourcePickerProps


---
Filepath: features/prompts/components/builder/AICustomizerPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export default function AICustomizerPromptBuilder({ onClose }: AICustomizerPromptBuilderProps)
    Props: AICustomizerPromptBuilderProps
      # onClose: () => void
  # Types & Interfaces
    interface AICustomizerPromptBuilderProps


---
Filepath: features/prompts/components/builder/TabBasedPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export default function TabBasedPromptBuilder({ onClose }: TabBasedPromptBuilderProps)
    Props: TabBasedPromptBuilderProps
      # onClose: () => void
  # Types & Interfaces
    interface TabBasedPromptBuilderProps


---
Filepath: features/prompts/components/builder/PromptSystemMessage.tsx  [typescript/react]

  # Components
    [Component] export function PromptSystemMessage({ content, taskId, messageIndex, isStreamActive, onContentChange, metadata, compact })
    Props: PromptSystemMessageProps
      # content: string
      # taskId?: string
      # messageIndex: number
      # isStreamActive?: boolean
      # onContentChange?: (messageIndex: number, newContent: string) => void
      # metadata?: {
      # timeToFirstToken?: number
      # totalTime?: number
      #   # ... 4 more fields
  # Types & Interfaces
    interface PromptSystemMessageProps


---
Filepath: features/prompts/components/builder/SharedPromptWarningModal.tsx  [typescript/react]

  # Components
    [Component] export function SharedPromptWarningModal({ isOpen, onClose, ownerEmail, permissionLevel, onEditOriginal, onCreateCopy, isCreatingCopy })
    Props: SharedPromptWarningModalProps
      # isOpen: boolean
      # onClose: () => void
      # ownerEmail: string | null
      # permissionLevel: PermissionLevel | null
      # onEditOriginal: () => void
      # onCreateCopy: () => void
      # isCreatingCopy?: boolean
    [Component] export function SharedPromptBanner({ ownerEmail, permissionLevel, className = "", }: SharedPromptBannerProps)
    Props: SharedPromptBannerProps
      # ownerEmail: string | null
      # permissionLevel: PermissionLevel | null
      # className?: string
  # Types & Interfaces
    interface SharedPromptWarningModalProps
    interface SharedPromptBannerProps


---
Filepath: features/prompts/components/builder/PromptBuilderLeftPanel.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderLeftPanel({ models, model, onModelChange, modelConfig, onSettingsClick, hasPendingConflict, onOpenSettingsConflictModal, variableDefaults, onAddVariable, onUpdateVariable, onRemoveVariable, selectedTools, availableTools, isAddingTool, onIsAddingToolChange, onAddTool, onRemoveTool, modelSupportsTools, showSettingsOnMainPage, developerMessage, onDeveloperMessageChange, onDeveloperMessageClear, systemMessageVariablePopoverOpen, onSystemMessageVariablePopoverOpenChange, onInsertVariableIntoSystemMessage, isEditingSystemMessage, onIsEditingSystemMessageChange, messages, editingMessageIndex, onEditingMessageIndexChange, variablePopoverOpen, onVariablePopoverOpenChange, onMessageRoleChange, onMessageContentChange, onClearMessage, onDeleteMessage, onInsertVariable, onAddMessage, textareaRefs, cursorPositions, onCursorPositionChange, onOpenFullScreenEditor })
    Props: PromptBuilderLeftPanelProps
      # models: any[]
      # model: string
      # onModelChange: (value: string) => void
      # modelConfig: PromptSettings
      # onSettingsClick: () => void
      # hasPendingConflict?: boolean
      # onOpenSettingsConflictModal?: () => void
      # variableDefaults: PromptVariable[]
      #   # ... 47 more fields
  # Types & Interfaces
    interface PromptBuilderLeftPanelProps


---
Filepath: features/prompts/components/builder/PromptBuilderErrorBoundary.tsx  [typescript/react]

  # Types & Interfaces
    interface AutoSaveData
    # promptId?: string
    # promptName: string
    # developerMessage: string
    # messages: Array<{ role: string; content: string }>
    # variableDefaults: Array<{ name: string; defaultValue: string }>
    # modelConfig: Record<string, unknown>
    # model: string
    # timestamp: number
    interface PromptBuilderErrorBoundaryProps
    # children: React.ReactNode
    # promptId?: string
    interface State
    # hasError: boolean
    # error: Error | null
    # recoveredData: AutoSaveData | null


---
Filepath: features/prompts/components/builder/ModelChangeConflictModal.tsx  [typescript/react]

  # Components
    [Component] export function ModelChangeConflictModal({ isOpen, onClose, conflictData, onConfirm, }: ModelChangeConflictModalProps)
    Props: ModelChangeConflictModalProps
      # isOpen: boolean
      # onClose: () => void
      # conflictData: ModelChangeConflictData | null
      # onConfirm: (resolvedSettings: PromptSettings) => void
  # Types & Interfaces
    export interface ConflictItem
    # key: string
    # currentValue: unknown
    # newModelDefault: unknown
    # reason: "unsupported_key" | "value_out_of_range" | "invalid_enum_value"
    # description: string
    export interface ModelChangeConflictData
    # prevModelName: string
    # newModelName: string
    # newModelId: string
    # currentSettings: PromptSettings
    # supportedKeys: string[]
    # conflicts: ConflictItem[]
    # newModelControls: NormalizedControls | null
    interface ModelChangeConflictModalProps
    interface ConflictTableRowProps
    # conflict: ConflictItem
    # action: "keep" | "reset"
    # newModelName: string
    # aliasHint: string | null
    # onToggle: () => void


---
Filepath: features/prompts/components/builder/PromptBuilderMobile.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderMobile(props: PromptBuilderMobileProps)
    Props: PromptBuilderMobileProps
      # mobileActiveTab: 'edit' | 'test'
      # onMobileTabChange: (tab: 'edit' | 'test') => void
  # Types & Interfaces
    interface PromptBuilderMobileProps extends PromptBuilderSharedProps


---
Filepath: features/prompts/components/builder/InstantChatAssistant.tsx  [typescript/react]

  # Types & Interfaces
    interface InstantChatAssistantProps
    # onClose: () => void


---
Filepath: features/prompts/components/builder/PromptUserMessage.tsx  [typescript/react]

  # Components
    [Component] export function PromptUserMessage({ content, messageIndex, onContentChange, compact })
    Props: PromptUserMessageProps
      # content: string
      # messageIndex: number
      # onContentChange?: (messageIndex: number, newContent: string) => void
      # /** Compact mode: minimal styling, less padding, no left margin */
      # compact?: boolean
  # Types & Interfaces
    interface PromptUserMessageProps


---
Filepath: features/prompts/components/builder/CreatorOptionsModal.tsx  [typescript/react]

  # Components
    [Component] export function CreatorOptionsModal({ runId, isOpen, onClose, }: CreatorOptionsModalProps)
    Props: CreatorOptionsModalProps
      # runId: string
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface CreatorOptionsModalProps


---
Filepath: features/prompts/components/builder/types.ts  [typescript]

  # Types
    export type MessageItem = { type: 'system'
  # Interfaces
    export interface PromptBuilderSharedProps


---
Filepath: features/prompts/components/builder/PromptBuilderDesktop.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderDesktop(props: PromptBuilderSharedProps)


---
Filepath: features/prompts/components/builder/PromptMessages.tsx  [typescript/react]

  # Components
    [Component] export function PromptMessages({ messages, editingMessageIndex, onEditingMessageIndexChange, variablePopoverOpen, onVariablePopoverOpenChange, onMessageRoleChange, onMessageContentChange, onClearMessage, onDeleteMessage, onInsertVariable, onAddMessage, textareaRefs, cursorPositions, onCursorPositionChange, variableDefaults, onOpenFullScreenEditor, scrollContainerRef, systemMessage, modelConfig })
    Props: PromptMessagesProps
      # messages: PromptMessage[]
      # editingMessageIndex: number | null
      # onEditingMessageIndexChange: (index: number | null) => void
      # variablePopoverOpen: number | null
      # onVariablePopoverOpenChange: (index: number | null) => void
      # onMessageRoleChange: (index: number, role: string) => void
      # onMessageContentChange: (index: number, content: string) => void
      # onClearMessage: (index: number) => void
      #   # ... 11 more fields
  # Types & Interfaces
    interface PromptMessagesProps


---
Filepath: features/prompts/components/builder/PromptBuilderRightPanel.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderRightPanel({ conversationMessages, onClearConversation, variableDefaults, onVariableValueChange, expandedVariable, onExpandedVariableChange, chatInput, onChatInputChange, resources, onResourcesChange, onSendMessage, isTestingPrompt, submitOnEnter, onSubmitOnEnterChange, autoClearResponsesInEditMode, onAutoClearResponsesInEditModeChange, messages, isStreamingMessage, currentTaskId, messageStartTime, timeToFirstTokenRef, lastMessageStats, attachmentCapabilities, supportsFileUrls, supportsYoutubeVideos })
    Props: PromptBuilderRightPanelProps
  # Types & Interfaces
    interface PromptBuilderRightPanelProps


---
Filepath: features/prompts/components/builder/PromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilder(props: PromptBuilderProps)
    Props: PromptBuilderProps
      # models: any[]
      # initialData?: {
      # id?: string
      # name?: string
      # version?: number
      # updatedAt?: string | null
      # messages?: Json | null
      # variableDefaults?: Json | null
      #   # ... 26 more fields
  # Types & Interfaces
    interface PromptBuilderProps


---
Filepath: features/prompts/components/builder/PromptAssistantMessage.tsx  [typescript/react]

  # Components
    [Component] export function PromptAssistantMessage({ content, taskId, messageIndex, isStreamActive, onContentChange, metadata, audioUrl, audioMimeType, isTtsRequest, compact })
    Props: PromptAssistantMessageProps
      # content: string
      # taskId?: string
      # messageIndex: number
      # isStreamActive?: boolean
      # onContentChange?: (messageIndex: number, newContent: string) => void
      # metadata?: {
      # timeToFirstToken?: number
      # totalTime?: number
      #   # ... 8 more fields
  # Types & Interfaces
    interface PromptAssistantMessageProps


---
Filepath: features/prompts/components/builder/PromptStats.tsx  [typescript/react]

  # Components
    [Component] export function PromptStats({ timeToFirstToken, totalTime, tokens }: PromptStatsProps)
    Props: PromptStatsProps
      # timeToFirstToken?: number
      # totalTime?: number
      # tokens?: number
  # Types & Interfaces
    interface PromptStatsProps
```
<!-- /AUTO:signatures -->

<!-- AUTO:config -->
## Generation Config

> Auto-managed. Contains the exact parameters used to generate this README.
> Used by parent modules to auto-refresh this file when it is stale.
> Do not edit manually — changes will be overwritten on the next run.

```json
{
  "subdirectory": "features/prompts/components",
  "mode": "signatures",
  "scope": null,
  "project_noise": null,
  "include_call_graph": true,
  "entry_points": null,
  "call_graph_exclude": [
    "tests"
  ]
}
```
<!-- /AUTO:config -->
