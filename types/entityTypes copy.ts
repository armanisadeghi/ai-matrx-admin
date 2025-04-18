// File: types/entityTypes.ts
export type Action = {
    id: string;
    name: string;
    matrix: string;
    transformer: string;
    nodeType: string;
    referenceId: string;
}

export type AiAgent = {
    id: string;
    name: string;
    recipeId: string;
    aiSettingsId: string;
    systemMessageOverride: string;
}

export type AiEndpoint = {
    id: string;
    name: string;
    provider: string;
    description: string;
    additionalCost: boolean;
    costDetails: Record<string, unknown>;
    params: Record<string, unknown>;
}

export type AiModel = {
    id: string;
    name: string;
    commonName: string;
    modelClass: string;
    provider: string;
    endpoints: Record<string, unknown>;
    contextWindow: number;
    maxTokens: number;
    capabilities: Record<string, unknown>;
    controls: Record<string, unknown>;
    modelProvider: string;
}

export type AiModelEndpoint = {
    id: string;
    aiModelId: string;
    aiEndpointId: string;
    available: boolean;
    endpointPriority: number;
    configuration: Record<string, unknown>;
    notes: string;
    createdAt: Date;
}

export type AiProvider = {
    id: string;
    name: string;
    companyDescription: string;
    documentationLink: string;
    modelsLink: string;
}

export type AiSettings = {
    id: string;
    aiEndpoint: string;
    aiProvider: string;
    aiModel: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stream: boolean;
    responseFormat: string;
    size: string;
    quality: string;
    count: number;
    audioVoice: string;
    audioFormat: string;
    modalities: Record<string, unknown>;
    tools: Record<string, unknown>;
    presetName: string;
}

export type Applet = {
    id: string;
    name: string;
    description: string;
    creator: string;
    type: "other" | "recipe" | "workflow" | undefined;
    compiledRecipeId: string;
    slug: string;
    createdAt: Date;
    userId: string;
    isPublic: boolean;
    dataSourceConfig: Record<string, unknown>;
    resultComponentConfig: Record<string, unknown>;
    nextStepConfig: Record<string, unknown>;
    subcategoryId: string;
    ctaText: string;
    theme: string;
}

export type Arg = {
    id: string;
    name: string;
    required: boolean;
    default: string;
    dataType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    ready: boolean;
    registeredFunction: string;
}

export type AudioLabel = {
    id: string;
    createdAt: Date;
    name: string;
    description: string;
}

export type AudioRecording = {
    id: string;
    createdAt: Date;
    userId: string;
    name: string;
    label: string;
    fileUrl: string;
    duration: number;
    localPath: string;
    size: number;
    isPublic: boolean;
}

export type AudioRecordingUsers = {
    id: string;
    createdAt: Date;
    firstName: string;
    lastName: string;
    email: string;
}

export type AutomationBoundaryBroker = {
    id: string;
    matrix: string;
    broker: string;
    sparkSource: "api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined;
    beaconDestination: "api_response" | "database" | "file" | "function" | "user_output" | undefined;
}

export type AutomationMatrix = {
    id: string;
    name: string;
    description: string;
    averageSeconds: number;
    isAutomated: boolean;
    cognitionMatrices: "agent_crew" | "agent_mixture" | "conductor" | "hypercluster" | "knowledge_matrix" | "monte_carlo" | "the_matrix" | "workflow" | undefined;
}

export type Broker = {
    id: string;
    name: string;
    value: Record<string, unknown>;
    dataType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    ready: boolean;
    defaultSource: "api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined;
    displayName: string;
    description: string;
    tooltip: string;
    validationRules: Record<string, unknown>;
    sampleEntries: string;
    customSourceComponent: string;
    additionalParams: Record<string, unknown>;
    otherSourceParams: Record<string, unknown>;
    defaultDestination: "api_response" | "database" | "file" | "function" | "user_output" | undefined;
    outputComponent: "3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined;
    tags: Record<string, unknown>;
    stringValue: string;
}

export type BrokerValue = {
    id: string;
    userId: string;
    dataBroker: string;
    data: Record<string, unknown>;
    category: string;
    subCategory: string;
    tags: string[];
    comments: string;
    createdAt: Date;
}

export type BucketStructures = {
    bucketId: string;
    structure: Record<string, unknown>;
    lastUpdated: Date;
}

export type BucketTreeStructures = {
    bucketId: string;
    treeStructure: Record<string, unknown>;
    lastUpdated: Date;
}

export type Category = {
    id: string;
    name: string;
    description: string;
    slug: string;
    icon: string;
    createdAt: Date;
}

export type CompiledRecipe = {
    id: string;
    recipeId: string;
    version: number;
    compiledRecipe: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    authenticatedRead: boolean;
}

export type DataBroker = {
    id: string;
    name: string;
    dataType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    defaultValue: string;
    inputComponent: string;
    color: "amber" | "blue" | "cyan" | "emerald" | "fuchsia" | "gray" | "green" | "indigo" | "lime" | "neutral" | "orange" | "pink" | "purple" | "red" | "rose" | "sky" | "slate" | "stone" | "teal" | "violet" | "yellow" | "zinc" | undefined;
    outputComponent: string;
}

export type DataInputComponent = {
    id: string;
    options: string[];
    includeOther: boolean;
    min: number;
    max: number;
    step: number;
    acceptableFiletypes: Record<string, unknown>;
    src: string;
    colorOverrides: Record<string, unknown>;
    additionalParams: Record<string, unknown>;
    subComponent: string;
    component: "Accordion_Selected" | "Accordion_View" | "Accordion_View_Add_Edit" | "BrokerCheckbox" | "BrokerColorPicker" | "BrokerCustomInput" | "BrokerCustomSelect" | "BrokerInput" | "BrokerNumberInput" | "BrokerNumberPicker" | "BrokerRadio" | "BrokerRadioGroup" | "BrokerSelect" | "BrokerSlider" | "BrokerSwitch" | "BrokerTailwindColorPicker" | "BrokerTextArrayInput" | "BrokerTextarea" | "BrokerTextareaGrow" | "Button" | "Checkbox" | "Chip" | "Color_Picker" | "Date_Picker" | "Drawer" | "File_Upload" | "Image_Display" | "Input" | "Json_Editor" | "Menu" | "Number_Input" | "Phone_Input" | "Radio_Group" | "Relational_Button" | "Relational_Input" | "Search_Input" | "Select" | "Sheet" | "Slider" | "Star_Rating" | "Switch" | "Textarea" | "Time_Picker" | "UUID_Array" | "UUID_Field" | undefined;
    name: string;
    description: string;
    placeholder: string;
    containerClassName: string;
    collapsibleClassName: string;
    labelClassName: string;
    descriptionClassName: string;
    componentClassName: string;
    size: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    height: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    width: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    minHeight: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    maxHeight: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    minWidth: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    maxWidth: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    orientation: "default" | "horizontal" | "vertical" | undefined;
}

export type DataOutputComponent = {
    id: string;
    componentType: "3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined;
    uiComponent: string;
    props: Record<string, unknown>;
    additionalParams: Record<string, unknown>;
}

export type DisplayOption = {
    id: string;
    name: string;
    defaultParams: Record<string, unknown>;
    customizableParams: Record<string, unknown>;
    additionalParams: Record<string, unknown>;
}

export type Emails = {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    timestamp: Date;
    isRead: boolean;
}

export type Extractor = {
    id: string;
    name: string;
    outputType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    defaultIdentifier: string;
    defaultIndex: number;
}

export type FileStructure = {
    id: number;
    bucketId: string;
    path: string;
    isFolder: boolean;
    fileId: string;
    parentPath: string;
    name: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export type FlashcardData = {
    id: string;
    userId: string;
    topic: string;
    lesson: string;
    difficulty: string;
    front: string;
    back: string;
    example: string;
    detailedExplanation: string;
    audioExplanation: string;
    personalNotes: string;
    isDeleted: boolean;
    public: boolean;
    sharedWith: string[];
    createdAt: Date;
    updatedAt: Date;
}

export type FlashcardHistory = {
    id: string;
    flashcardId: string;
    userId: string;
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export type FlashcardImages = {
    id: string;
    flashcardId: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
}

export type FlashcardSetRelations = {
    flashcardId: string;
    setId: string;
    order: number;
}

export type FlashcardSets = {
    setId: string;
    userId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    sharedWith: string[];
    public: boolean;
    topic: string;
    lesson: string;
    difficulty: string;
    audioOverview: string;
}

export type MessageBroker = {
    id: string;
    messageId: string;
    brokerId: string;
    defaultValue: string;
    defaultComponent: string;
}

export type MessageTemplate = {
    id: string;
    role: "assistant" | "system" | "user" | undefined;
    type: "base64_image" | "blob" | "image_url" | "other" | "text" | undefined;
    createdAt: Date;
    content: string;
}

export type Processor = {
    id: string;
    name: string;
    dependsDefault: string;
    defaultExtractors: Record<string, unknown>;
    params: Record<string, unknown>;
}

export type ProjectMembers = {
    id: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: Date;
}

export type Projects = {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

export type Recipe = {
    id: string;
    name: string;
    description: string;
    tags: Record<string, unknown>;
    sampleOutput: string;
    isPublic: boolean;
    status: "active_testing" | "archived" | "draft" | "in_review" | "live" | "other" | undefined;
    version: number;
    postResultOptions: Record<string, unknown>;
}

export type RecipeBroker = {
    id: string;
    recipe: string;
    broker: string;
    brokerRole: "input_broker" | "output_broker" | undefined;
    required: boolean;
}

export type RecipeDisplay = {
    id: string;
    recipe: string;
    display: string;
    priority: number;
    displaySettings: Record<string, unknown>;
}

export type RecipeFunction = {
    id: string;
    recipe: string;
    function: string;
    role: "comparison" | "decision" | "other" | "post_processing" | "pre-Processing" | "rating" | "save_data" | "validation" | undefined;
    params: Record<string, unknown>;
}

export type RecipeMessage = {
    id: string;
    messageId: string;
    recipeId: string;
    order: number;
}

export type RecipeModel = {
    id: string;
    recipe: string;
    aiModel: string;
    role: "primary_model" | "trial_model" | "verified_model" | undefined;
    priority: number;
}

export type RecipeProcessor = {
    id: string;
    recipe: string;
    processor: string;
    params: Record<string, unknown>;
}

export type RecipeTool = {
    id: string;
    recipe: string;
    tool: string;
    params: Record<string, unknown>;
}

export type RegisteredFunction = {
    id: string;
    name: string;
    modulePath: string;
    className: string;
    description: string;
    returnBroker: string;
}

export type Subcategory = {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    slug: string;
    icon: string;
    features: string[];
    createdAt: Date;
}

export type SystemFunction = {
    id: string;
    name: string;
    description: string;
    sample: string;
    inputParams: Record<string, unknown>;
    outputOptions: Record<string, unknown>;
    rfId: string;
}

export type TaskAssignments = {
    id: string;
    taskId: string;
    userId: string;
    assignedBy: string;
    assignedAt: Date;
}

export type TaskAttachments = {
    id: string;
    taskId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedBy: string;
    uploadedAt: Date;
}

export type TaskComments = {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export type Tasks = {
    id: string;
    title: string;
    description: string;
    projectId: string;
    status: string;
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

export type Tool = {
    id: string;
    name: string;
    source: Record<string, unknown>;
    description: string;
    parameters: Record<string, unknown>;
    requiredArgs: Record<string, unknown>;
    systemFunction: string;
    additionalParams: Record<string, unknown>;
}

export type Transformer = {
    id: string;
    name: string;
    inputParams: Record<string, unknown>;
    outputParams: Record<string, unknown>;
}

export type UserPreferences = {
    userId: string;
    preferences: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export type WcClaim = {
    id: string;
    createdAt: Date;
    applicantName: string;
    personId: string;
    dateOfBirth: Date;
    dateOfInjury: Date;
    ageAtDoi: number;
    occupationalCode: number;
    weeklyEarnings: number;
}

export type WcImpairmentDefinition = {
    id: string;
    impairmentNumber: string;
    fecRank: number;
    name: string;
    attributes: Record<string, unknown>;
    fingerType: "index" | "little" | "middle" | "ring" | "thumb" | undefined;
}

export type WcInjury = {
    id: string;
    createdAt: Date;
    reportId: string;
    impairmentDefinitionId: string;
    digit: number;
    le: number;
    side: "default" | "left" | "right" | undefined;
    ue: number;
    wpi: number;
    pain: number;
    industrial: number;
    rating: number;
    formula: string;
    updatedAt: Date;
}

export type WcReport = {
    id: string;
    createdAt: Date;
    claimId: string;
    finalRating: number;
    leftSideTotal: number;
    rightSideTotal: number;
    defaultSideTotal: number;
    compensationAmount: number;
    compensationWeeks: number;
    compensationDays: number;
}