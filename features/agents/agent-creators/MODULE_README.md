# `features.agents.agent-creators` — Module Overview

> This document is partially auto-generated. Sections tagged `<!-- AUTO:id -->` are refreshed by the generator.
> Everything else is yours to edit freely and will never be overwritten.

<!-- AUTO:meta -->
## About This Document

This file is **partially auto-generated**. Sections wrapped in `<!-- AUTO:id -->` tags
are overwritten each time the generator runs. Everything else is yours to edit freely.

| Field | Value |
|-------|-------|
| Module | `features/agents/agent-creators` |
| Last generated | 2026-04-11 13:14 |
| Output file | `features/agents/agent-creators/MODULE_README.md` |
| Signature mode | `signatures` |

**To refresh auto-sections:**
```bash
python utils/code_context/generate_module_readme.py features/agents/agent-creators --mode signatures
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

> Auto-generated. 50 files across 10 directories.

```
features/agents/agent-creators/
├── PromptBuilderModal.tsx
├── PromptExecutionButton.tsx
├── chatbot-customizer/
│   ├── AICustomizerPromptBuilder.tsx
│   ├── AIOptionComponents.tsx
│   ├── CustomizationCards.tsx
│   ├── ai-customization.tsx
│   ├── aiCustomizationConfig.ts
│   ├── base-components.tsx
│   ├── types.ts
├── common/
│   ├── GeneratePromptButton.tsx
│   ├── ImportPromptButton.tsx
│   ├── PromptImporter.tsx
├── instant-assistant/
│   ├── InstantChatAssistant.tsx
│   ├── constants.ts
├── interactive-builder/
│   ├── AgentBuilderPicker.tsx
│   ├── AgentGenerator.tsx
│   ├── ComprehensiveBuilder.tsx
│   ├── ExperienceCustomizerBuilder.tsx
│   ├── InstantAssistantBuilder.tsx
│   ├── agent-generator.constants.ts
│   ├── index.ts
├── prompt-generator/
│   ├── HighlightedMessageContent.tsx
│   ├── PromptGenerator.tsx
│   ├── PromptJsonDisplay.tsx
│   ├── progressive-json-parser.ts
├── prompt-optimizers/
│   ├── FullPromptOptimizer.tsx
│   ├── SystemPromptOptimizer.tsx
├── services/
│   ├── agentBuilderService.ts
│   ├── prompt-import-service.ts
│   ├── promptBuilderService.ts
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
│   ├── TabBasedPromptBuilder.tsx
│   ├── TabTemplate.tsx
│   ├── TaskTab.tsx
│   ├── ToneTab.tsx
│   ├── constants.tsx
├── utils/
│   ├── agent-config-extractor.ts
# excluded: 2 .md
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="signatures"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.

```
---
Filepath: features/agents/agent-creators/PromptBuilderModal.tsx  [typescript/react]

  # Components
    [Component] export function PromptBuilderModal({ isOpen, onClose, }: PromptBuilderModalProps)
    Props: PromptBuilderModalProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface PromptBuilderModalProps


---
Filepath: features/agents/agent-creators/PromptExecutionButton.tsx  [typescript/react]

  # Components
    [Component] export default function PromptExecutionButton({ config, label, variant, size, icon, fullWidth, className, disabled, tooltip, onExecutionStart, onExecutionComplete })
    [Component] export function PromptExecutionIconButton({ config, icon, tooltip, variant, size, className, disabled, onExecutionStart, onExecutionComplete })


---
Filepath: features/agents/agent-creators/chatbot-customizer/AICustomizerPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export default function AICustomizerPromptBuilder({ onClose, }: AICustomizerPromptBuilderProps)
    Props: AICustomizerPromptBuilderProps
      # onClose: () => void
  # Types & Interfaces
    interface AICustomizerPromptBuilderProps


---
Filepath: features/agents/agent-creators/chatbot-customizer/base-components.tsx  [typescript/react]

  # Components
    [Component] export const AICustomizationPanel = ({ config, initialState = {}, onSave }) =>


---
Filepath: features/agents/agent-creators/chatbot-customizer/aiCustomizationConfig.ts  [typescript]



---
Filepath: features/agents/agent-creators/chatbot-customizer/AIOptionComponents.tsx  [typescript/react]

  # Utilities
    export const createOptionComponent = (option: any, value: OptionValue, onChange: (id: OptionId, value: OptionValue) =>


---
Filepath: features/agents/agent-creators/chatbot-customizer/CustomizationCards.tsx  [typescript/react]

  # Components
    [Component] export const GenericOptionsCard = ({ state, onChange, options }) =>
    [Component] export const PersonalityCard = (props) =>
    [Component] export const ToneCard = (props) =>
    [Component] export const VerbosityCard = (props) =>
    [Component] export const FormalityCard = (props) =>
    [Component] export const StyleEnhancementsCard = (props) =>
    [Component] export const InteractiveFeaturesCard = (props) =>
    [Component] export const ReasoningDepthCard = (props) =>
    [Component] export const CreativityLevelCard = (props) =>
    [Component] export const MemoryFeaturesCard = (props) =>
    [Component] export const ExpertiseAreasCard = (props) =>
    [Component] export const ContentFormattingCard = (props) =>
    [Component] export const TechnicalFeaturesCard = (props) =>
    [Component] export const PersonalInfoCard = (props) =>


---
Filepath: features/agents/agent-creators/chatbot-customizer/types.ts  [typescript]

  # Types
    export type OptionId = string
    export type OptionValue = string | number | boolean | string[]
    export type OptionConfig = | ToggleOption
  # Interfaces
    export interface ConfigState
    # [key: string]: OptionValue
    export interface CardConfig
    # id: string
    # title: string
    # icon: LucideIcon
    # size?: 'small' | 'normal' | 'medium' | 'large'
    # component: ComponentType<CardComponentProps>
    export interface CardComponentProps
    # config: CardConfig
    # state: ConfigState
    # onChange: (id: OptionId, value: OptionValue) => void
    export interface ToggleOption
    # type: 'toggle'
    # id: OptionId
    # label: string
    # icon: LucideIcon
    # defaultValue?: boolean
    export interface SliderOption
    # type: 'slider'
    # id: OptionId
    # label: string
    # min?: number
    # max?: number
    # step?: number
    # leftLabel?: string
    # rightLabel?: string
    # ... 1 more fields
    export interface SelectOption
    # type: 'select'
    # id: OptionId
    # label: string
    # options: Array<{
    # id: string
    # label: string
    # description?: string
    # }>
    # ... 1 more fields
    export interface MultiSelectOption
    # type: 'multiSelect'
    # id: OptionId
    # label: string
    # options: Array<{
    # id: string
    # label: string
    # description?: string
    # }>
    # ... 1 more fields
    export interface RadioGroupOption
    # type: 'radioGroup'
    # id: OptionId
    # label: string
    # options: Array<{
    # id: string
    # label: string
    # description?: string
    # }>
    # ... 1 more fields
    export interface InputOption
    # type: 'input'
    # id: OptionId
    # label: string
    # placeholder?: string
    # defaultValue?: string
    export interface SectionConfig
    # id: string
    # title: string
    # icon: LucideIcon
    # description?: string
    # cards: CardConfig[]
    export interface AICustomizationConfig
    # sections: SectionConfig[]
    export interface AICustomizationProps
    # initialState?: Record<string, ConfigState>
    # config: AICustomizationConfig
    # onSave?: (state: Record<string, ConfigState>) => void


---
Filepath: features/agents/agent-creators/chatbot-customizer/ai-customization.tsx  [typescript/react]

  # Components
    [Component] export default function AICustomizationPage()


---
Filepath: features/agents/agent-creators/utils/agent-config-extractor.ts  [typescript]

  # Functions
    export function extractAgentConfig(raw: unknown): AgentBuilderConfig | null
    export function extractAgentName(raw: unknown): string | null


---
Filepath: features/agents/agent-creators/tabbed-builder/TabBasedPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export default function TabBasedPromptBuilder({ onClose, }: TabBasedPromptBuilderProps)
    Props: TabBasedPromptBuilderProps
      # onClose: () => void
  # Types & Interfaces
    interface TabBasedPromptBuilderProps


---
Filepath: features/agents/agent-creators/tabbed-builder/PreviewTab.tsx  [typescript/react]

  # Components
    [Component] export const PreviewTab = () =>


---
Filepath: features/agents/agent-creators/tabbed-builder/ToneTab.tsx  [typescript/react]

  # Components
    [Component] export const ToneTab = () =>
  # Types & Interfaces
    interface ToneContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/PromptBuilderContext.tsx  [typescript/react]

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
Filepath: features/agents/agent-creators/tabbed-builder/KnowledgeTab.tsx  [typescript/react]

  # Components
    [Component] export const KnowledgeTab = () =>
  # Types & Interfaces
    interface KnowledgeContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/ContextTab.tsx  [typescript/react]

  # Components
    [Component] export const ContextTab = () =>
  # Types & Interfaces
    interface ContextContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/TabTemplate.tsx  [typescript/react]

  # Components
    [Component] export const NewTab = ({ updateContent }) =>
    Props: NewTabProps
      # updateContent?: (content: string) => void
  # Types & Interfaces
    interface NewTabProps


---
Filepath: features/agents/agent-creators/tabbed-builder/TabBase.tsx  [typescript/react]

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
Filepath: features/agents/agent-creators/tabbed-builder/ExamplesTab.tsx  [typescript/react]

  # Components
    [Component] export const ExamplesTab = () =>
  # Types & Interfaces
    interface ExamplesContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/GenericTextareaTab.tsx  [typescript/react]

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
Filepath: features/agents/agent-creators/tabbed-builder/MainPromptBuilder.tsx  [typescript/react]

  # Components
    [Component] export const MainPromptBuilder = () =>


---
Filepath: features/agents/agent-creators/tabbed-builder/AudienceTab.tsx  [typescript/react]

  # Components
    [Component] export const AudienceTab = () =>
  # Types & Interfaces
    interface AudienceContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/ConstraintsTab.tsx  [typescript/react]

  # Components
    [Component] export const ConstraintsTab = () =>
  # Types & Interfaces
    interface ConstraintsContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/constants.tsx  [typescript/react]



---
Filepath: features/agents/agent-creators/tabbed-builder/EmphasisTab.tsx  [typescript/react]

  # Components
    [Component] export const EmphasisTab = () =>
  # Types & Interfaces
    interface EmphasisContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/EvaluationTab.tsx  [typescript/react]

  # Components
    [Component] export const EvaluationTab = () =>
  # Types & Interfaces
    interface EvaluationContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/TaskTab.tsx  [typescript/react]

  # Components
    [Component] export const TaskTab = () =>
    Props: TaskTabProps
      # updateContent?: (content: string) => void
  # Types & Interfaces
    interface TaskTabProps


---
Filepath: features/agents/agent-creators/tabbed-builder/FormatTab.tsx  [typescript/react]

  # Components
    [Component] export const FormatTab = () =>
  # Types & Interfaces
    interface FormatContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/tabbed-builder/MotivationTab.tsx  [typescript/react]

  # Components
    [Component] export const MotivationTab = () =>
  # Types & Interfaces
    interface MotivationContentProps
    # updateContent?: (content: string) => void


---
Filepath: features/agents/agent-creators/common/PromptImporter.tsx  [typescript/react]

  # Components
    [Component] export function PromptImporter({ isOpen, onClose, onImportSuccess }: PromptImporterProps)
    Props: PromptImporterProps
      # isOpen: boolean
      # onClose: () => void
      # onImportSuccess?: (promptId: string) => void
  # Types & Interfaces
    interface PromptImporterProps


---
Filepath: features/agents/agent-creators/common/ImportPromptButton.tsx  [typescript/react]

  # Components
    [Component] export function ImportPromptButton()


---
Filepath: features/agents/agent-creators/common/GeneratePromptButton.tsx  [typescript/react]

  # Components
    [Component] export function GeneratePromptButton()


---
Filepath: features/agents/agent-creators/interactive-builder/AgentBuilderPicker.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderPicker()


---
Filepath: features/agents/agent-creators/interactive-builder/agent-generator.constants.ts  [typescript]



---
Filepath: features/agents/agent-creators/interactive-builder/ExperienceCustomizerBuilder.tsx  [typescript/react]

  # Components
    [Component] export function ExperienceCustomizerBuilder({ onComplete, }: ExperienceCustomizerBuilderProps)
    Props: ExperienceCustomizerBuilderProps
      # onComplete?: () => void
  # Types & Interfaces
    interface ExperienceCustomizerBuilderProps


---
Filepath: features/agents/agent-creators/interactive-builder/AgentGenerator.tsx  [typescript/react]

  # Components
    [Component] export function AgentGenerator({ onComplete }: AgentGeneratorProps)
    Props: AgentGeneratorProps
      # onComplete?: () => void
  # Types & Interfaces
    interface ErrorBoundaryProps
    # children: ReactNode
    # fallbackContent: string
    # isStreamActive: boolean
    # onError?: (error: Error) => void
    interface ErrorBoundaryState
    # hasError: boolean
    # error: Error | null
    interface AgentGeneratorProps


---
Filepath: features/agents/agent-creators/interactive-builder/InstantAssistantBuilder.tsx  [typescript/react]

  # Components
    [Component] export function InstantAssistantBuilder({ onComplete, }: InstantAssistantBuilderProps)
    Props: InstantAssistantBuilderProps
      # onComplete?: () => void
  # Types & Interfaces
    interface OptionItem
    # id: string
    # label: string
    # prompt: string
    # shortDesc?: string
    interface InstantAssistantBuilderProps


---
Filepath: features/agents/agent-creators/interactive-builder/ComprehensiveBuilder.tsx  [typescript/react]

  # Components
    [Component] export function ComprehensiveBuilder({ onComplete, }: ComprehensiveBuilderProps)
    Props: ComprehensiveBuilderProps
      # onComplete?: () => void
  # Types & Interfaces
    interface ComprehensiveBuilderProps


---
Filepath: features/agents/agent-creators/interactive-builder/index.ts  [typescript]



---
Filepath: features/agents/agent-creators/prompt-optimizers/SystemPromptOptimizer.tsx  [typescript/react]

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
Filepath: features/agents/agent-creators/prompt-optimizers/FullPromptOptimizer.tsx  [typescript/react]

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
Filepath: features/agents/agent-creators/instant-assistant/InstantChatAssistant.tsx  [typescript/react]

  # Types & Interfaces
    interface InstantChatAssistantProps
    # onClose: () => void


---
Filepath: features/agents/agent-creators/instant-assistant/constants.ts  [typescript]



---
Filepath: features/agents/agent-creators/prompt-generator/progressive-json-parser.ts  [typescript]

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
Filepath: features/agents/agent-creators/prompt-generator/PromptJsonDisplay.tsx  [typescript/react]

  # Components
    [Component] export function PromptJsonDisplay(props: PromptJsonDisplayProps)
    Props: PromptJsonDisplayProps
      # content: string
      # isStreamActive?: boolean
      # className?: string
  # Types & Interfaces
    interface PromptJsonDisplayProps


---
Filepath: features/agents/agent-creators/prompt-generator/PromptGenerator.tsx  [typescript/react]

  # Components
    [Component] export function PromptGenerator({ isOpen, onClose }: PromptGeneratorProps)
    Props: PromptGeneratorProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface PromptGeneratorProps


---
Filepath: features/agents/agent-creators/prompt-generator/HighlightedMessageContent.tsx  [typescript/react]

  # Components
    [Component] export function HighlightedMessageContent({ content, isStreamActive = false, }: HighlightedMessageContentProps)
    Props: HighlightedMessageContentProps
      # content: string
      # isStreamActive?: boolean
    [Component] export function HighlightedMessageContentMarkdown({ content, isStreamActive = false, }: HighlightedMessageContentProps)
  # Types & Interfaces
    interface HighlightedMessageContentProps


---
Filepath: features/agents/agent-creators/services/promptBuilderService.ts  [typescript]

  # Interfaces
    export interface PromptBuilderConfig
    # name: string
    # description?: string; // Optional - not shown in UI
    # systemMessage: string
    # userMessage?: string
    # variableDefaults?: Array<{ name: string; defaultValue: string }>
    # settings?: {
    # model_id?: string
    # store?: boolean
    # ... 6 more fields
    export interface PromptBuilderResult
    # success: boolean
    # promptId?: string
    # error?: string
  # Functions
    export async function createPromptFromBuilder(config: PromptBuilderConfig, router: AppRouterInstance, onClose?: ()
    export function usePromptBuilder(router: AppRouterInstance, onClose?: ()


---
Filepath: features/agents/agent-creators/services/agentBuilderService.ts  [typescript]

  # Interfaces
    export interface AgentBuilderConfig
    # name: string
    # description?: string
    # systemMessage: string
    # userMessage?: string
    # variableDefaults?: Array<{ name: string; defaultValue: string }>
    # settings?: Record<string, unknown>
    export interface AgentBuilderResult
    # success: boolean
    # agentId?: string
    # error?: string
  # Functions
    export async function createAgentFromBuilder(config: AgentBuilderConfig,): Promise<AgentBuilderResult>
    export function useAgentBuilder(onComplete?: ()


---
Filepath: features/agents/agent-creators/services/prompt-import-service.ts  [typescript]

  # Functions
    export async function importPrompt(promptData: PromptData,): Promise<PromptImportResult>
    export async function importPromptBatch(batchJSON: PromptsBatchData,): Promise<PromptBatchImportResult>
    export async function exportPromptAsJSON(promptId: string,): Promise<PromptData | null>
```
<!-- /AUTO:signatures -->

<!-- AUTO:config -->
## Generation Config

> Auto-managed. Contains the exact parameters used to generate this README.
> Used by parent modules to auto-refresh this file when it is stale.
> Do not edit manually — changes will be overwritten on the next run.

```json
{
  "subdirectory": "features/agents/agent-creators",
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
