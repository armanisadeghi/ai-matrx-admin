// File: types/entities.ts
export type Action = {
    id: string;
    name: string;
    matrix: string;
    transformer?: string;
    nodeType: string;
    referenceId: string;
}

export type Admins = {
    userId: string;
    createdAt?: Date;
}

export type AiAgent = {
    id: string;
    name: string;
    recipeId?: string;
    aiSettingsId?: string;
    systemMessageOverride?: string;
}

export type AiEndpoint = {
    id: string;
    name: string;
    provider?: string;
    description?: string;
    additionalCost?: boolean;
    costDetails?: Record<string, unknown>;
    params?: Record<string, unknown>;
}

export type AiModel = {
    id: string;
    name: string;
    commonName?: string;
    modelClass: string;
    provider?: string;
    endpoints?: Record<string, unknown>;
    contextWindow?: number;
    maxTokens?: number;
    capabilities?: Record<string, unknown>;
    controls?: Record<string, unknown>;
    modelProvider?: string;
}

export type AiModelEndpoint = {
    id: string;
    aiModelId?: string;
    aiEndpointId?: string;
    available: boolean;
    endpointPriority?: number;
    configuration?: Record<string, unknown>;
    notes?: string;
    createdAt: Date;
}

export type AiProvider = {
    id: string;
    name?: string;
    companyDescription?: string;
    documentationLink?: string;
    modelsLink?: string;
}

export type AiSettings = {
    id: string;
    aiEndpoint?: string;
    aiProvider?: string;
    aiModel?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stream?: boolean;
    responseFormat?: string;
    size?: string;
    quality?: string;
    count?: number;
    audioVoice?: string;
    audioFormat?: string;
    modalities?: Record<string, unknown>;
    tools?: Record<string, unknown>;
    presetName?: string;
}

export type AiTrainingData = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    isPublic?: boolean;
    systemPrompt?: string;
    userQuery?: string;
    thinkingContent?: string;
    responseContent?: string;
    reflectionContent?: string;
    qualityScore?: number;
    source?: string;
    metadata?: Record<string, unknown>;
    questionsThinking?: string;
    questionsContent?: string;
    structuredQuestions?: Record<string, unknown>;
    reflectionThinking?: string;
}

export type Applet = {
    id: string;
    name: string;
    description?: string;
    creator?: string;
    type: "other" | "recipe" | "workflow" | undefined;
    compiledRecipeId?: string;
    slug: string;
    createdAt: Date;
    userId?: string;
    isPublic?: boolean;
    dataSourceConfig?: Record<string, unknown>;
    resultComponentConfig?: Record<string, unknown>;
    nextStepConfig?: Record<string, unknown>;
    subcategoryId?: string;
    ctaText?: string;
    theme?: string;
}

export type AppletContainers = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    appletId: string;
    containerId: string;
    order: number;
}

export type Arg = {
    id: string;
    name: string;
    required: boolean;
    defaultJunk?: string;
    dataType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    ready: boolean;
    registeredFunction: string;
    defaultValue: Record<string, unknown>;
    description?: string;
    examples?: string;
}

export type AudioLabel = {
    id: string;
    createdAt: Date;
    name: string;
    description?: string;
}

export type AudioRecording = {
    id: string;
    createdAt: Date;
    userId: string;
    name: string;
    label?: string;
    fileUrl: string;
    duration?: number;
    localPath?: string;
    size?: number;
    isPublic: boolean;
}

export type AudioRecordingUsers = {
    id: string;
    createdAt: Date;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export type AutomationBoundaryBroker = {
    id: string;
    matrix?: string;
    broker?: string;
    sparkSource?: "api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined;
    beaconDestination?: "api_response" | "database" | "file" | "function" | "user_output" | undefined;
}

export type AutomationMatrix = {
    id: string;
    name: string;
    description?: string;
    averageSeconds?: number;
    isAutomated?: boolean;
    cognitionMatrices?: "agent_crew" | "agent_mixture" | "conductor" | "hypercluster" | "knowledge_matrix" | "monte_carlo" | "the_matrix" | "workflow" | undefined;
}

export type Broker = {
    id: string;
    name: string;
    value?: Record<string, unknown>;
    dataType: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    ready?: boolean;
    defaultSource?: "api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined;
    displayName?: string;
    description?: string;
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    defaultDestination?: "api_response" | "database" | "file" | "function" | "user_output" | undefined;
    outputComponent?: "3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined;
    tags?: Record<string, unknown>;
    stringValue?: string;
}

export type BrokerValue = {
    id: string;
    userId?: string;
    dataBroker?: string;
    data?: Record<string, unknown>;
    category?: string;
    subCategory?: string;
    tags?: string[];
    comments?: string;
    createdAt: Date;
}

export type BucketStructures = {
    bucketId: string;
    structure?: Record<string, unknown>;
    lastUpdated?: Date;
}

export type BucketTreeStructures = {
    bucketId: string;
    treeStructure?: Record<string, unknown>;
    lastUpdated?: Date;
}

export type Category = {
    id: string;
    name: string;
    description?: string;
    slug: string;
    icon?: string;
    createdAt: Date;
}

export type CompiledRecipe = {
    id: string;
    recipeId?: string;
    version?: number;
    compiledRecipe: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    userId?: string;
    isPublic: boolean;
    authenticatedRead: boolean;
}

export type ComponentGroups = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    label: string;
    shortLabel?: string;
    description?: string;
    hideDescription?: boolean;
    helpText?: string;
    fields?: Record<string, unknown>;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
}

export type ContainerFields = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    fieldId: string;
    containerId: string;
    order: number;
}

export type Conversation = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    metadata?: Record<string, unknown>;
    label?: string;
    isPublic?: boolean;
    description?: string;
    keywords?: Record<string, unknown>;
    group?: string;
}

export type CustomAppConfigs = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    name: string;
    description?: string;
    slug: string;
    mainAppIcon?: string;
    mainAppSubmitIcon?: string;
    creator?: string;
    primaryColor?: string;
    accentColor?: string;
    appletList?: Record<string, unknown>;
    extraButtons?: Record<string, unknown>;
    layoutType?: string;
    imageUrl?: string;
    appDataContext?: Record<string, unknown>;
}

export type CustomAppletConfigs = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    name: string;
    description?: string;
    slug: string;
    appletIcon?: string;
    appletSubmitText?: string;
    creator?: string;
    primaryColor?: string;
    accentColor?: string;
    layoutType?: string;
    containers?: Record<string, unknown>;
    dataSourceConfig?: Record<string, unknown>;
    resultComponentConfig?: Record<string, unknown>;
    nextStepConfig?: Record<string, unknown>;
    compiledRecipeId?: string;
    subcategoryId?: string;
    imageUrl?: string;
    appId?: string;
    brokerMap?: Record<string, unknown>;
    overviewLabel?: string;
    dataDestinationConfig?: Record<string, unknown>;
}

export type DataBroker = {
    id: string;
    name: string;
    dataType?: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    defaultValue?: string;
    inputComponent?: string;
    color?: "amber" | "blue" | "cyan" | "emerald" | "fuchsia" | "gray" | "green" | "indigo" | "lime" | "neutral" | "orange" | "pink" | "purple" | "red" | "rose" | "sky" | "slate" | "stone" | "teal" | "violet" | "yellow" | "zinc" | undefined;
    outputComponent?: string;
    fieldComponentId?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    defaultScope?: string;
}

export type DataInputComponent = {
    id: string;
    options?: string[];
    includeOther?: boolean;
    min?: number;
    max?: number;
    step?: number;
    acceptableFiletypes?: Record<string, unknown>;
    src?: string;
    colorOverrides?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;
    subComponent?: string;
    component: "Accordion_Selected" | "Accordion_View" | "Accordion_View_Add_Edit" | "BrokerCheckbox" | "BrokerColorPicker" | "BrokerCustomInput" | "BrokerCustomSelect" | "BrokerInput" | "BrokerNumberInput" | "BrokerNumberPicker" | "BrokerRadio" | "BrokerRadioGroup" | "BrokerSelect" | "BrokerSlider" | "BrokerSwitch" | "BrokerTailwindColorPicker" | "BrokerTextArrayInput" | "BrokerTextarea" | "BrokerTextareaGrow" | "Button" | "Checkbox" | "Chip" | "Color_Picker" | "Date_Picker" | "Drawer" | "File_Upload" | "Image_Display" | "Input" | "Json_Editor" | "Menu" | "Number_Input" | "Phone_Input" | "Radio_Group" | "Relational_Button" | "Relational_Input" | "Search_Input" | "Select" | "Sheet" | "Slider" | "Star_Rating" | "Switch" | "Textarea" | "Time_Picker" | "UUID_Array" | "UUID_Field" | undefined;
    name?: string;
    description?: string;
    placeholder?: string;
    containerClassName?: string;
    collapsibleClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    componentClassName?: string;
    size?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    height?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    width?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    minHeight?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    maxHeight?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    minWidth?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    maxWidth?: "2xl" | "2xs" | "3xl" | "3xs" | "4xl" | "5xl" | "default" | "l" | "m" | "s" | "xl" | "xs" | undefined;
    orientation?: "default" | "horizontal" | "vertical" | undefined;
}

export type DataOutputComponent = {
    id: string;
    componentType?: "3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined;
    uiComponent?: string;
    props?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;
}

export type DisplayOption = {
    id: string;
    name?: string;
    defaultParams?: Record<string, unknown>;
    customizableParams?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;
}

export type Emails = {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    timestamp?: Date;
    isRead?: boolean;
}

export type Extractor = {
    id: string;
    name: string;
    outputType?: "bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined;
    defaultIdentifier?: string;
    defaultIndex?: number;
}

export type FieldComponents = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    label?: string;
    description?: string;
    helpText?: string;
    componentGroup?: string;
    iconName?: string;
    component?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: string;
    includeOther?: boolean;
    options?: Record<string, unknown>;
    componentProps?: Record<string, unknown>;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
}

export type FileStructure = {
    id: number;
    bucketId: string;
    path: string;
    isFolder: boolean;
    fileId?: string;
    parentPath?: string;
    name: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FlashcardData = {
    id: string;
    userId: string;
    topic?: string;
    lesson?: string;
    difficulty?: string;
    front: string;
    back: string;
    example?: string;
    detailedExplanation?: string;
    audioExplanation?: string;
    personalNotes?: string;
    isDeleted?: boolean;
    public?: boolean;
    sharedWith?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export type FlashcardHistory = {
    id: string;
    flashcardId?: string;
    userId: string;
    reviewCount?: number;
    correctCount?: number;
    incorrectCount?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FlashcardImages = {
    id: string;
    flashcardId?: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt?: Date;
}

export type FlashcardSetRelations = {
    flashcardId: string;
    setId: string;
    order?: number;
}

export type FlashcardSets = {
    setId: string;
    userId: string;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
    sharedWith?: string[];
    public?: boolean;
    topic?: string;
    lesson?: string;
    difficulty?: string;
    audioOverview?: string;
}

export type FullSpectrumPositions = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    title?: string;
    description?: string;
    alternateTitles?: string;
    qualifications?: string;
    sizzleQuestions?: string;
    redFlags?: string;
    additionalDetails?: string;
}

export type HtmlExtractions = {
    id: number;
    url: string;
    title?: string;
    htmlContent: string;
    metaDescription?: string;
    metaKeywords?: string;
    contentLength?: number;
    extractedAt?: Date;
    userAgent?: string;
    createdAt?: Date;
    userId?: string;
}

export type Message = {
    id: string;
    conversationId: string;
    role: "assistant" | "system" | "tool" | "user" | undefined;
    content?: string;
    type: "base64_image" | "blob" | "image_url" | "json_object" | "mixed" | "other" | "text" | "tool_result" | undefined;
    displayOrder?: number;
    systemOrder?: number;
    createdAt: Date;
    metadata?: Record<string, unknown>;
    userId?: string;
    isPublic?: boolean;
}

export type MessageBroker = {
    id: string;
    messageId: string;
    brokerId: string;
    defaultValue?: string;
    defaultComponent?: string;
}

export type MessageTemplate = {
    id: string;
    role: "assistant" | "system" | "tool" | "user" | undefined;
    type: "base64_image" | "blob" | "image_url" | "json_object" | "mixed" | "other" | "text" | "tool_result" | undefined;
    createdAt: Date;
    content?: string;
}

export type OrganizationInvitations = {
    id: string;
    organizationId: string;
    email: string;
    token: string;
    role: "admin" | "member" | "owner" | undefined;
    invitedAt?: Date;
    invitedBy?: string;
    expiresAt: Date;
}

export type OrganizationMembers = {
    id: string;
    organizationId: string;
    userId: string;
    role: "admin" | "member" | "owner" | undefined;
    joinedAt?: Date;
    invitedBy?: string;
}

export type Organizations = {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    isPersonal?: boolean;
    settings?: Record<string, unknown>;
}

export type Permissions = {
    id: string;
    resourceType: "applet" | "broker_value" | "conversation" | "document" | "message" | "organization" | "recipe" | "scrape_domain" | "workflow" | undefined;
    resourceId: string;
    grantedToUserId?: string;
    grantedToOrganizationId?: string;
    isPublic?: boolean;
    permissionLevel: "admin" | "editor" | "viewer" | "viwwer" | undefined;
    createdAt?: Date;
    createdBy?: string;
}

export type Processor = {
    id: string;
    name: string;
    dependsDefault?: string;
    defaultExtractors?: Record<string, unknown>;
    params?: Record<string, unknown>;
}

export type ProjectMembers = {
    id: string;
    projectId?: string;
    userId?: string;
    role: string;
    createdAt?: Date;
}

export type Projects = {
    id: string;
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
}

export type Prompts = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    name?: string;
    messages?: Record<string, unknown>;
    variableDefaults?: Record<string, unknown>;
    tools?: Record<string, unknown>;
    authenticatedRead?: boolean;
    isPublic?: boolean;
    userId?: string;
    publicRead?: boolean;
}

export type Recipe = {
    id: string;
    name: string;
    description?: string;
    tags?: Record<string, unknown>;
    sampleOutput?: string;
    isPublic?: boolean;
    status: "active_testing" | "archived" | "draft" | "in_review" | "live" | "other" | undefined;
    version?: number;
    postResultOptions?: Record<string, unknown>;
    userId?: string;
}

export type RecipeBroker = {
    id: string;
    recipe: string;
    broker: string;
    brokerRole: "input_broker" | "output_broker" | undefined;
    required?: boolean;
}

export type RecipeDisplay = {
    id: string;
    recipe: string;
    display: string;
    priority?: number;
    displaySettings?: Record<string, unknown>;
}

export type RecipeFunction = {
    id: string;
    recipe: string;
    function: string;
    role: "comparison" | "decision" | "other" | "post_processing" | "pre-Processing" | "rating" | "save_data" | "validation" | undefined;
    params?: Record<string, unknown>;
}

export type RecipeMessage = {
    id: string;
    messageId: string;
    recipeId: string;
    order: number;
}

export type RecipeMessageReorderQueue = {
    recipeId: string;
    lastModified?: Date;
}

export type RecipeModel = {
    id: string;
    recipe: string;
    aiModel: string;
    role: "primary_model" | "trial_model" | "verified_model" | undefined;
    priority?: number;
}

export type RecipeProcessor = {
    id: string;
    recipe: string;
    processor: string;
    params?: Record<string, unknown>;
}

export type RecipeTool = {
    id: string;
    recipe: string;
    tool: string;
    params?: Record<string, unknown>;
}

export type RegisteredFunction = {
    id: string;
    funcName: string;
    modulePath: string;
    className?: string;
    description?: string;
    returnBroker: string;
    name: string;
    tags?: Record<string, unknown>;
    category?: "API" | "Agents" | "Commands" | "Database" | "Documents" | "Executors" | "Extractors" | "Files" | "Integrations" | "Media" | "Other" | "Processors" | "Prompts" | "Recipes" | "Web" | undefined;
    icon?: "Activity" | "AlertCircle" | "AlertTriangle" | "AlignCenter" | "AlignLeft" | "AlignRight" | "Archive" | "ArrowDown" | "ArrowLeft" | "ArrowLeftRight" | "ArrowRight" | "ArrowRightLeft" | "ArrowUp" | "Asterisk" | "AtSign" | "Award" | "Banknote" | "BarChart" | "Battery" | "BatteryLow" | "Bell" | "BellOff" | "Bike" | "Bitcoin" | "Bold" | "Bookmark" | "BookmarkPlus" | "Brain" | "Brush" | "Building" | "Building2" | "Calculator" | "Calendar" | "CalendarDays" | "Camera" | "Car" | "Check" | "CheckCircle" | "ChevronDown" | "ChevronLeft" | "ChevronRight" | "ChevronUp" | "Circle" | "Clock" | "Cloud" | "CloudRain" | "CloudSnow" | "Code" | "Compass" | "Copy" | "Cpu" | "CreditCard" | "Database" | "Diamond" | "Divide" | "DollarSign" | "Dot" | "Download" | "Edit" | "Equal" | "Eraser" | "Euro" | "ExternalLink" | "Eye" | "FaBrave" | "Factory" | "FcAlphabeticalSortingAz" | "FcAlphabeticalSortingZa" | "FcAreaChart" | "FcAssistant" | "FcBiotech" | "FcBrokenLink" | "FcBusiness" | "FcBusinessContact" | "FcCalendar" | "FcCommandLine" | "FcConferenceCall" | "FcDataProtection" | "FcDocument" | "FcDownload" | "FcElectronics" | "FcEngineering" | "FcFeedback" | "FcFilm" | "FcGoogle" | "FcGraduationCap" | "FcLibrary" | "FcManager" | "FcMultipleInputs" | "FcMusic" | "FcParallelTasks" | "FcSalesPerformance" | "FcShipped" | "FcSignature" | "FcSms" | "FcTodoList" | "FcWikipedia" | "File" | "FileText" | "Filter" | "Folder" | "FolderOpen" | "Fuel" | "Gift" | "GitBranch" | "Globe" | "Hash" | "Headphones" | "Heart" | "HelpCircle" | "Hexagon" | "Highlighter" | "Home" | "Image" | "Inbox" | "Indent" | "Info" | "Italic" | "Key" | "Laptop" | "Layers" | "LineChart" | "Link" | "List" | "ListOrdered" | "Lock" | "LogIn" | "LogOut" | "Mail" | "Map" | "MapPin" | "Menu" | "MessageCircle" | "MessageSquare" | "Mic" | "MicOff" | "Minus" | "Monitor" | "MonitorSpeaker" | "Moon" | "MoreHorizontal" | "MoreVertical" | "Move" | "Music" | "Music2" | "Navigation" | "Octagon" | "Outdent" | "Package" | "Paintbrush" | "Palette" | "PauseCircle" | "Pen" | "PenTool" | "Pencil" | "Percent" | "Phone" | "PhoneCall" | "PieChart" | "Plane" | "Play" | "PlayCircle" | "Plus" | "PoundSterling" | "Power" | "PowerOff" | "Quote" | "Receipt" | "RefreshCw" | "Repeat" | "Repeat1" | "RotateCcw" | "Ruler" | "Save" | "Scissors" | "Search" | "Send" | "Settings" | "Share" | "Share2" | "Shield" | "ShieldCheck" | "Ship" | "ShoppingBag" | "ShoppingCart" | "Shuffle" | "SkipBack" | "SkipForward" | "Smartphone" | "Square" | "Star" | "StopCircle" | "Store" | "Sun" | "Tablet" | "Tag" | "Tags" | "Target" | "Thermometer" | "Timer" | "Train" | "Trash" | "TrendingDown" | "TrendingUp" | "Triangle" | "Trophy" | "Truck" | "Type" | "Umbrella" | "Underline" | "Unlink" | "Unlock" | "Upload" | "User" | "User2" | "UserMinus" | "UserPlus" | "Users" | "Video" | "Volume2" | "VolumeX" | "Wand2" | "Webhook" | "Wifi" | "WifiOff" | "Wrench" | "X" | "XCircle" | "Zap" | undefined;
    nodeDescription?: string;
}

export type SchemaTemplates = {
    id: string;
    templateName: string;
    description?: string;
    fields: Record<string, unknown>;
    version: number;
    createdAt?: Date;
}

export type ScrapeBaseConfig = {
    id: string;
    selectorType: string;
    exact?: Record<string, unknown>;
    partial?: Record<string, unknown>;
    regex?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeCachePolicy = {
    id: string;
    rescrapeAfter: number;
    staleAfter: number;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeConfiguration = {
    id: string;
    scrapeMode: string;
    interactionSettingsId?: string;
    scrapePathPatternId: string;
    isActive?: boolean;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeCycleRun = {
    id: string;
    scrapeCycleTrackerId: string;
    runNumber: number;
    completedAt?: Date;
    allowPattern?: string;
    disallowPatterns?: Record<string, unknown>;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeCycleTracker = {
    id: string;
    targetUrl?: string;
    pageName?: string;
    scrapePathPatternCachePolicyId?: string;
    scrapeJobId?: string;
    lastRunAt?: Date;
    nextRunAt?: Date;
    isActive?: boolean;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomain = {
    id: string;
    url?: string;
    commonName?: string;
    scrapeAllowed?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomainDisallowedNotes = {
    id: string;
    scrapeDomainId: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomainNotes = {
    id: string;
    scrapeDomainId?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomainQuickScrapeSettings = {
    id: string;
    scrapeDomainId: string;
    enabled: boolean;
    proxyType?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomainRobotsTxt = {
    id: string;
    scrapeDomainId?: string;
    robotsTxt?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeDomainSitemap = {
    id: string;
    scrapeDomainId?: string;
    sitemap?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeJob = {
    id: string;
    scrapeDomainId: string;
    startUrls: string[];
    scrapeStatus: string;
    parseStatus: string;
    attemptLimit: number;
    startedAt?: Date;
    finishedAt?: Date;
    name?: string;
    description?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeOverride = {
    id: string;
    name: string;
    configType: string;
    selectorType?: string;
    matchType?: string;
    action: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeOverrideValue = {
    id: string;
    value: string;
    scrapeOverrideId: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeParsedPage = {
    id: string;
    pageName: string;
    validity: string;
    remotePath?: string;
    localPath?: string;
    scrapePathPatternCachePolicyId?: string;
    scrapeTaskId?: string;
    scrapeTaskResponseId?: string;
    scrapeCycleRunId?: string;
    scrapeCycleTrackerId?: string;
    scrapeConfigurationId?: string;
    scrapePathPatternOverrideId?: string;
    scrapedAt?: Date;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    expiresAt?: Date;
}

export type ScrapePathPattern = {
    id: string;
    scrapeDomainId?: string;
    pathPattern?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapePathPatternCachePolicy = {
    id: string;
    scrapeCachePolicyId: string;
    scrapePathPatternId: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapePathPatternOverride = {
    id: string;
    name: string;
    scrapePathPatternId: string;
    scrapeOverrideId: string;
    isActive: boolean;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    authenticatedRead: boolean;
}

export type ScrapeQuickFailureLog = {
    id: string;
    scrapeDomainId?: string;
    domainName?: string;
    targetUrl: string;
    failureReason?: string;
    errorLog?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeTask = {
    id: string;
    targetUrl: string;
    pageName: string;
    scrapeDomainId?: string;
    parentTask?: string;
    attemptsLeft: number;
    scrapeMode: string;
    interactionConfig?: Record<string, unknown>;
    scrapeJobId?: string;
    priority?: number;
    discoveredLinks?: Record<string, unknown>;
    spawnedConcurrentTasks?: boolean;
    scrapeCycleRunId?: string;
    failureReason?: string;
    scrapeStatus?: string;
    parseStatus?: string;
    cancelMessage?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type ScrapeTaskResponse = {
    id: string;
    scrapeTaskId: string;
    failureReason?: string;
    statusCode?: number;
    contentPath: string;
    contentSize?: number;
    contentType?: string;
    responseHeaders: Record<string, unknown>;
    responseUrl: string;
    errorLog?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
}

export type Subcategory = {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    slug?: string;
    icon?: string;
    features: string[];
    createdAt: Date;
}

export type SystemFunction = {
    id: string;
    name: string;
    description?: string;
    sample?: string;
    inputParams?: Record<string, unknown>;
    outputOptions?: Record<string, unknown>;
    rfId: string;
}

export type TableData = {
    id: string;
    tableId: string;
    data: Record<string, unknown>;
    userId: string;
    isPublic: boolean;
    authenticatedRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TableFields = {
    id: string;
    tableId: string;
    fieldName: string;
    displayName: string;
    dataType: "array" | "boolean" | "date" | "datetime" | "integer" | "json" | "number" | "string" | undefined;
    fieldOrder: number;
    isRequired: boolean;
    defaultValue?: Record<string, unknown>;
    validationRules?: Record<string, unknown>;
    userId: string;
    isPublic: boolean;
    authenticatedRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TaskAssignments = {
    id: string;
    taskId?: string;
    userId?: string;
    assignedBy?: string;
    assignedAt?: Date;
}

export type TaskAttachments = {
    id: string;
    taskId?: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    filePath: string;
    uploadedBy?: string;
    uploadedAt?: Date;
}

export type TaskComments = {
    id: string;
    taskId?: string;
    userId?: string;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type Tasks = {
    id: string;
    title: string;
    description?: string;
    projectId?: string;
    status: string;
    dueDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    authenticatedRead?: boolean;
}

export type Tool = {
    id: string;
    name: string;
    source: Record<string, unknown>;
    description?: string;
    parameters?: Record<string, unknown>;
    requiredArgs?: Record<string, unknown>;
    systemFunction?: string;
    additionalParams?: Record<string, unknown>;
}

export type Transformer = {
    id: string;
    name?: string;
    inputParams?: Record<string, unknown>;
    outputParams?: Record<string, unknown>;
}

export type UserListItems = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    label?: string;
    description?: string;
    helpText?: string;
    groupName?: string;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    listId?: string;
    iconName?: string;
}

export type UserLists = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    listName?: string;
    description?: string;
    userId?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
}

export type UserPreferences = {
    userId: string;
    preferences: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export type UserTables = {
    id: string;
    tableName: string;
    description?: string;
    version: number;
    userId: string;
    isPublic: boolean;
    authenticatedRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type WcClaim = {
    id: string;
    createdAt: Date;
    applicantName?: string;
    personId?: string;
    dateOfBirth?: Date;
    dateOfInjury?: Date;
    ageAtDoi?: number;
    occupationalCode?: number;
    weeklyEarnings?: number;
}

export type WcImpairmentDefinition = {
    id: string;
    impairmentNumber?: string;
    fecRank?: number;
    name?: string;
    attributes?: Record<string, unknown>;
    fingerType?: "index" | "little" | "middle" | "ring" | "thumb" | undefined;
}

export type WcInjury = {
    id: string;
    createdAt: Date;
    reportId?: string;
    impairmentDefinitionId?: string;
    digit?: number;
    le?: number;
    side?: "default" | "left" | "right" | undefined;
    ue?: number;
    wpi?: number;
    pain?: number;
    industrial?: number;
    rating?: number;
    formula?: string;
    updatedAt?: Date;
}

export type WcReport = {
    id: string;
    createdAt: Date;
    claimId: string;
    finalRating?: number;
    leftSideTotal?: number;
    rightSideTotal?: number;
    defaultSideTotal?: number;
    compensationAmount?: number;
    compensationWeeks?: number;
    compensationDays?: number;
}

export type Workflow = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    name: string;
    description?: string;
    userId?: string;
    version?: number;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isActive?: boolean;
    isDeleted?: boolean;
    autoExecute?: boolean;
    category?: string;
    tags?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    viewport?: Record<string, unknown>;
}

export type WorkflowData = {
    id: string;
    name: string;
    description?: string;
    workflowType?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
    sources?: Record<string, unknown>;
    destinations?: Record<string, unknown>;
    actions?: Record<string, unknown>;
    category?: string;
    tags?: Record<string, unknown>;
    isActive?: boolean;
    isDeleted?: boolean;
    autoExecute?: boolean;
    metadata?: Record<string, unknown>;
    viewport?: Record<string, unknown>;
    userId?: string;
    version?: number;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export type WorkflowEdge = {
    id: string;
    createdAt: Date;
    workflowId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
    edgeType?: string;
    animated?: boolean;
    style?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export type WorkflowNode = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    workflowId?: string;
    functionId?: string;
    functionType?: string;
    stepName?: string;
    nodeType?: string;
    executionRequired?: boolean;
    additionalDependencies?: Record<string, unknown>;
    argMapping?: Record<string, unknown>;
    returnBrokerOverrides?: Record<string, unknown>;
    argOverrides?: Record<string, unknown>;
    status?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    metadata?: Record<string, unknown>;
    uiNodeData?: Record<string, unknown>;
}

export type WorkflowNodeData = {
    id: string;
    workflowId?: string;
    functionId?: string;
    type?: string;
    stepName?: string;
    nodeType?: string;
    executionRequired?: boolean;
    additionalDependencies?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    uiData?: Record<string, unknown>;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
}

export type WorkflowRelay = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    workflowId: string;
    userId?: string;
    sourceBrokerId: string;
    label?: string;
    targetBrokerIds?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    uiNodeData?: Record<string, unknown>;
}

export type WorkflowUserInput = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    workflowId: string;
    userId?: string;
    fieldComponentId?: string;
    brokerId: string;
    label?: string;
    dataType?: string;
    defaultValue?: string;
    isRequired?: boolean;
    metadata?: Record<string, unknown>;
    uiNodeData?: Record<string, unknown>;
}