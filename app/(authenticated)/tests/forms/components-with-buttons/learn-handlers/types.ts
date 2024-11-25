

// Type Definitions
export interface ProcessingChoice {
    choice1: string[];
    choice2: string[];
    choice3: string[];
}

export interface OptionConfig {
    id: string;
    label: string;
    processingChoices: ProcessingChoice;
}

export interface AppSettings {
    sheetTitle: string;
    sheetDescription: string;
    options: OptionConfig[];
    validIdPattern: RegExp;
}

// Component Types
export interface ProcessingChoices {
    choice1: string;
    choice2: string;
    choice3: string;
}

export interface ProcessingState {
    step: number;
    loading: boolean;
    choices: ProcessingChoices;
    newChoice: string;
    showNewChoiceInput: boolean;
}

export interface ProcessingResults {
    inputValue: string;
    selectedOption: string;
    choice1: string;
    choice2: string;
    choice3: string;
    customChoice?: string;
    timestamp: string;
}

export interface InitialData {
    inputValue: string;
    selectedOption: string;
}

export interface ProcessingComponentProps {
    initialData: InitialData;
    settings: AppSettings;
    onComplete: (results: ProcessingResults) => void;
    allowNewCreation?: boolean;
}

export interface TriggerData {
    inputValue: string;
    selectedOption: string;
    timestamp: string;
}

export interface TriggerState {
    isActive: boolean;
    isProcessing: boolean;
}

export interface TriggerProps {
    settings: AppSettings;
    inputValue: string;
    selectedOption: string;
    onProcessingComplete: (results: ProcessingResults) => void;
    onTriggerAction: (data: TriggerData) => void;
}

export interface SheetState {
    isProcessing: boolean;
    results: ProcessingResults | null;
    allowNewCreation: boolean;
}

export interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    initialData: InitialData;
    onProcessingComplete: (results: ProcessingResults) => void;
}

export interface MainPageState {
    selectedOption: string;
    textAreaValue: string;
    currentResults: ProcessingResults | null;
    finalResults: (ProcessingResults & { additionalNotes: string }) | null;
}

export interface IntelligentInputProps {
    onProcessingComplete: (results: ProcessingResults) => void;
    settings: AppSettings;
    selectedOption: string;
}

export interface IntelligentInputState {
    inputValue: string;
    isProcessing: boolean;
}

export interface IntelligentInputProps {
    onProcessingComplete: (results: ProcessingResults) => void;
    settings: AppSettings;
    selectedOption: string;
    label?: string;
}

export interface IntelligentTriggerState extends TriggerState {
    isSheetOpen: boolean;
}

