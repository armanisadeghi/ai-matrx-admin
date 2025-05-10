import { AppletContainersConfig, GroupFieldConfig } from "../runner-depreciated-do-not-use/components/field-components/types";

// USER INFORMATION SECTION
const primaryAudienceTypeField: GroupFieldConfig = {
    brokerId: "403ba44b-a5d1-4537-a6fe-1e214d23126b",
    label: "Primary Audience Type",
    type: "radio",
    placeholder: "Who will primarily use this applet?",
    customConfig: {
        options: [
            { id: "abc-123", value: "business", label: "Business Professionals" },
            { id: "abc-124", value: "consumer", label: "General Consumers" },
            { id: "abc-125", value: "student", label: "Students/Education" },
            { id: "abc-126", value: "internal", label: "Internal Team Members" },
            { id: "abc-127", value: "technical", label: "Technical Users" },
        ],
        includeOther: true,
    },
};

const targetUserField: GroupFieldConfig = {
    brokerId: "93c623ef-6025-4fb9-a362-e8cbb25bbaa0",
    label: "Specific User Description",
    type: "textarea",
    placeholder: "Describe your ideal user in more detail (their role, needs, technical ability, etc.)",
    customConfig: {
        rows: 3,
    },
};

const userInteractionField: GroupFieldConfig = {
    brokerId: "1b2d9878-8c81-412f-974d-e103a3de2581",
    label: "User Interaction Style",
    type: "select",
    placeholder: "How will users primarily interact with your applet?",
    customConfig: {
        options: [
            { id: "int-001", value: "conversational", label: "Conversational (chat-like interface)" },
            { id: "int-002", value: "form-based", label: "Form-based (structured inputs)" },
            { id: "int-003", value: "document-upload", label: "Document Upload & Processing" },
            { id: "int-004", value: "dashboard", label: "Dashboard/Visualization Viewing" },
            { id: "int-005", value: "multi-step", label: "Multi-step Guided Process" },
        ],
        includeOther: true,
    },
};

// PROBLEM & PURPOSE SECTION
const problemToOvercomeField: GroupFieldConfig = {
    brokerId: "8677b2e2-271a-4b7f-9be0-61ee4ab6966a",
    label: "Problem to Solve",
    type: "textarea",
    placeholder: "What specific problem or pain point does your applet address?",
    customConfig: {
        rows: 4,
    },
};

const appletPurposeField: GroupFieldConfig = {
    brokerId: "02f026c0-d7fd-4776-ab59-c56612594951",
    label: "Primary Purpose",
    type: "radio",
    placeholder: "What is the main purpose of your applet?",
    customConfig: {
        options: [
            { id: "pur-001", value: "automate-task", label: "Automate a Repetitive Task" },
            { id: "pur-002", value: "generate-content", label: "Generate or Transform Content" },
            { id: "pur-003", value: "analyze-data", label: "Analyze Data or Information" },
            { id: "pur-004", value: "decision-support", label: "Support Decision Making" },
            { id: "pur-005", value: "knowledge-access", label: "Access Specialized Knowledge" },
            { id: "pur-006", value: "process-documents", label: "Process or Extract from Documents" },
        ],
        includeOther: true,
    },
};

// CONCEPT & WORKFLOW SECTION
const coreConceptField: GroupFieldConfig = {
    brokerId: "94fb6440-3d20-4910-a67d-5be774410e48",
    label: "Core Concept",
    type: "textarea",
    placeholder: "Describe your applet's core concept in a few sentences.",
    customConfig: {
        rows: 5,
    },
};

const workflowTypeField: GroupFieldConfig = {
    brokerId: "85435665-33e9-4fb0-a8d3-6eea5c98a218",
    label: "Workflow Structure",
    type: "radio",
    placeholder: "How would you describe the workflow of your applet?",
    customConfig: {
        options: [
            { id: "wf-001", value: "single-step", label: "Single-step", description: "(Input → Process → Output) A direct process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-002", value: "multi-step-linear", label: "Multi-step Linear", description: "(Sequential steps) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-003", value: "branching", label: "Branching", description: "(Different paths based on inputs/results) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-004", value: "iterative", label: "Iterative", description: "(Refining results through feedback) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-005", value: "hypermatrix", label: "Dynamic Hypermatrix", description: "(Anything goes!) A powerful process to auto-execute based on the availability of broker values!" },
        ],
        includeOther: true,
    },
};

const workflowDescriptionField: GroupFieldConfig = {
    brokerId: "4fa8ee46-d2d5-4258-bbe6-e85636a68140",
    label: "Workflow Description",
    type: "textarea",
    placeholder: "Briefly describe the steps from start to finish in your applet's workflow.",
    customConfig: {
        rows: 4,
    },
};

// INPUT & OUTPUT SECTION
const userInputTypesField: GroupFieldConfig = {
    brokerId: "fdf2d6bb-e514-4690-b384-7462514f39a8",
    label: "User Input Types",
    type: "checkbox",
    placeholder: "What types of inputs will users provide?",
    customConfig: {
        options: [
            { id: "in-001", value: "text-prompt", label: "Text Prompts/Questions" },
            { id: "in-002", value: "structured-form", label: "Structured Form Data" },
            { id: "in-003", value: "document-upload", label: "Document Uploads" },
            { id: "in-004", value: "selections", label: "Selections from Options" },
            { id: "in-005", value: "api-credentials", label: "API Credentials/Keys" },
            { id: "in-006", value: "data-source", label: "Data Source Connection" },
            { id: "in-007", value: "parameters", label: "Configuration Parameters" },
        ],
        includeOther: true,
    },
};

const outputTypesField: GroupFieldConfig = {
    brokerId: "9d122198-cab4-4d6c-aa67-4edbc8bb489d",
    label: "Expected Output Types",
    type: "checkbox",
    placeholder: "What types of outputs should your applet generate?",
    customConfig: {
        options: [
            { id: "out-001", value: "text-response", label: "Text Response/Answer" },
            { id: "out-002", value: "structured-report", label: "Structured Report" },
            { id: "out-003", value: "visualization", label: "Data Visualization/Chart" },
            { id: "out-004", value: "document", label: "Generated Document" },
            { id: "out-005", value: "action", label: "Action/Integration Trigger" },
            { id: "out-006", value: "recommendation", label: "Recommendation/Decision" },
            { id: "out-007", value: "data-extraction", label: "Extracted/Processed Data" },
        ],
        includeOther: true,
    },
};

// DATA & INTEGRATION SECTION
const dataSourcesField: GroupFieldConfig = {
    brokerId: "66be6b6c-30a8-4e0a-a7f7-005eba630b82",
    label: "Data Sources",
    type: "checkbox",
    placeholder: "What data sources will your applet need to access?",
    customConfig: {
        options: [
            { id: "data-001", value: "web-search", label: "Web Search" },
            { id: "data-002", value: "public-data", label: "Public Datasets" },
            { id: "data-003", value: "user-data", label: "User-provided Data" },
            { id: "data-004", value: "internal-data", label: "Internal Company Data" },
            { id: "data-005", value: "industry-knowledge", label: "Industry-Specific Knowledge" },
            { id: "data-006", value: "technical-knowledge", label: "Technical Knowledge" },
            { id: "data-007", value: "real-time-data", label: "Real-time Data Feeds" },
        ],
        includeOther: true,
    },
};

const integrationNeedsField: GroupFieldConfig = {
    brokerId: "7a293f2f-b912-4a5a-81b5-8e032fbcc8ef",
    label: "Integration Needs",
    type: "checkbox",
    placeholder: "Does your applet need to integrate with any external systems?",
    customConfig: {
        options: [
            { id: "int-001", value: "none", label: "None", description: "No external integrations needed" },
            { id: "int-002", value: "email", label: "Email", description: "Email systems" },
            { id: "int-003", value: "messaging", label: "Messaging", description: "Messaging platforms (Slack, Teams, etc.)" },
            { id: "int-004", value: "docs", label: "Documents", description: "Document systems (Google Docs, Office, etc.)" },
            { id: "int-005", value: "crm", label: "CRM", description: "CRM systems" },
            { id: "int-006", value: "project-mgmt", label: "Project Management", description: "Project management tools" },
            { id: "int-007", value: "database", label: "Databases", description: "Databases (SQL, NoSQL, etc.)" },
            { id: "int-008", value: "api", label: "External APIs", description: "Specific external APIs (e.g. Stripe, Twilio, etc.)" },
        ],
        includeOther: true,
    },
};

// AI CAPABILITIES SECTION
const aiCapabilitiesField: GroupFieldConfig = {
    brokerId: "b2c7129c-9ad2-4cdb-922c-bb214aa42ba6",
    label: "AI Capabilities",
    type: "checkbox",
    placeholder: "Select the AI capabilities your applet will leverage.",
    customConfig: {
        options: [
            { id: "ai-001", value: "content-generation", label: "Content Generation" },
            { id: "ai-002", value: "data-analysis", label: "Data Analysis & Synthesis" },
            { id: "ai-003", value: "personalization", label: "Personalization" },
            { id: "ai-004", value: "decision-support", label: "Decision Support" },
            { id: "ai-005", value: "knowledge-retrieval", label: "Knowledge Retrieval" },
            { id: "ai-006", value: "document-processing", label: "Document Processing" },
            { id: "ai-007", value: "workflow-automation", label: "Workflow Automation" },
            { id: "ai-008", value: "language-translation", label: "Language Translation" },
            { id: "ai-009", value: "data-organization", label: "Data Organization & Structuring" },
            { id: "ai-010", value: "predictive-analytics", label: "Predictive Analytics" },
        ],
        includeOther: true,
    },
};

// AI MODEL PRIORITIES FIELD
const aiModelPrioritiesField: GroupFieldConfig = {
    brokerId: "1191073b-c7e6-4ac8-b702-44eda40cb295",
    label: "AI Model Priorities",
    type: "checkbox",
    placeholder: "What factors are most important for your AI model selection?",
    customConfig: {
        options: [
            { id: "pri-001", value: "low-cost", label: "Low Cost", description: "Budget-friendly operation." },
            { id: "pri-002", value: "high-speed", label: "High Speed", description: "Fast response times." },
            { id: "pri-003", value: "accuracy", label: "High Accuracy", description: "Precise, reliable outputs." },
            { id: "pri-004", value: "creativity", label: "Creativity", description: "Novel, diverse outputs." },
            { id: "pri-005", value: "reasoning", label: "Reasoning", description: "Strong reasoning, logical problem-solving." },
            { id: "pri-006", value: "coding", label: "Coding", description: "Code generation and analysis." },
            { id: "pri-007", value: "writing", label: "Content Writing", description: "High-quality writing." },
            { id: "pri-008", value: "long-context", label: "Long Context Window", description: "Handling large inputs." },
            { id: "pri-009", value: "fine-tuning", label: "Easy to Fine-tune", description: "Customizable." },
            { id: "pri-010", value: "multilingual", label: "Multilingual Capabilities", description: "Language support." },
            { id: "pri-011", value: "factual", label: "Factual Accuracy", description: "Minimal hallucinations." },
            { id: "pri-012", value: "math", label: "Mathematical Capabilities", description: "Mathematical capabilities." },
            { id: "pri-013", value: "structured-output", label: "Structured Output Generation", description: "Structured output generation." },
            { id: "pri-014", value: "less-restricted", label: "Less Restricted", description: "Fewer content limitations." },
            { id: "pri-015", value: "latest-knowledge", label: "Latest Knowledge Base", description: "Access to the latest knowledge base." },
            { id: "pri-016", value: "domain-specific", label: "Domain-Specific Expertise", description: "Domain-specific expertise." },
            { id: "pri-017", value: "consistency", label: "Output Consistency", description: "Consistent output." },
            { id: "pri-018", value: "instruction-following", label: "Precision", description: "Precise instruction following." },
            { id: "pri-019", value: "basic-tool-calling", label: "Basic Tool Calling", description: "Ability to use tools." },
            { id: "pri-020", value: "advanced-tool-calling", label: "Advanced Tool Calling", description: "Excels at using tools." },
            { id: "pri-021", value: "agentic", label: "Agentic", description: "Agentic capabilities." },
        ],
        includeOther: true,
    },
};

// INPUT TYPES FIELD
const inputTypesField: GroupFieldConfig = {
    brokerId: "640fb528-b405-40bc-a8a4-cc3b01e4a639",
    label: "Input Types",
    type: "checkbox",
    placeholder: "What types of inputs will your applet need to process?",
    customConfig: {
        options: [
            { id: "inp-001", value: "text", label: "Text", description: "Text prompts, instructions, content." },
            { id: "inp-002", value: "documents", label: "Documents", description: "PDF, Word, etc." },
            { id: "inp-003", value: "spreadsheets", label: "Spreadsheets", description: "Excel, CSV" },
            { id: "inp-004", value: "images", label: "Images", description: "Photos, diagrams, screenshots" },
            { id: "inp-005", value: "audio", label: "Audio Files", description: "Recordings, music" },
            { id: "inp-006", value: "video", label: "Video Files", description: "Video files" },
            { id: "inp-007", value: "online-video", label: "Online Video", description: "Youtube, Vimeo, etc." },
            { id: "inp-008", value: "real-time-speech", label: "Real-time Speech", description: "Voice input" },
            { id: "inp-009", value: "web-pages", label: "Web Pages", description: "URLs, HTML, scraping, etc." },
            { id: "inp-010", value: "code", label: "Code Files", description: "Various languages" },
            { id: "inp-011", value: "structured-data", label: "Structured Data", description: "JSON, XML" },  
            { id: "inp-012", value: "database", label: "Database Records", description: "Database records" },
            { id: "inp-013", value: "api-responses", label: "API Responses", description: "API responses" },
            { id: "inp-014", value: "forms", label: "Form Submissions", description: "Form submissions" },
            { id: "inp-015", value: "email", label: "Email Content", description: "Email content" },
            { id: "inp-016", value: "chat-history", label: "Chat/Conversation History", description: "Chat/conversation history" },
            { id: "inp-017", value: "presentations", label: "Presentations", description: "PowerPoint, Slides, etc." },
        ],
        includeOther: true,
    },
};


const mvpScopeField: GroupFieldConfig = {
    brokerId: "655904af-df03-40ad-9420-69ea62a46c36",
    label: "MVP Scope",
    type: "textarea",
    placeholder: "List your 'must-have' features.",
    helpText: "Describe your 'must-have' features for initial launch, followed by 'nice-to-have' features that could be added later. Be as specific as possible about what functionality is essential versus what could be developed in future iterations.",
    customConfig: {
        rows: 6,
        helpText: "Prioritizing features helps us focus development on what matters most. Consider what's absolutely necessary to solve your core problem versus what would enhance the experience but isn't critical for launch."
    },
};


// CONTAINER CONFIGURATIONS
const userInfoContainer: AppletContainersConfig = {
    id: "user-information",
    label: "User Information",
    placeholder: "Define your target users",
    fields: [
        primaryAudienceTypeField,
        targetUserField,
        userInteractionField,
    ],
};

const problemPurposeContainer: AppletContainersConfig = {
    id: "problem-purpose",
    label: "Problem & Purpose",
    placeholder: "Define the problem and purpose",
    fields: [
        problemToOvercomeField,
        appletPurposeField,
        mvpScopeField,
    ],
};

const conceptWorkflowContainer: AppletContainersConfig = {
    id: "concept-workflow",
    label: "Concept & Workflow",
    placeholder: "Define your concept and workflow",
    fields: [
        coreConceptField,
        workflowTypeField,
        workflowDescriptionField,
    ],
};

const inputOutputContainer: AppletContainersConfig = {
    id: "input-output",
    label: "Inputs & Outputs",
    placeholder: "Define inputs and outputs",
    fields: [
        inputTypesField,
        userInputTypesField,
        outputTypesField,
    ],
};

const aiCapabilitiesContainer: AppletContainersConfig = {
    id: "ai-capabilities",
    label: "AI Capabilities",
    placeholder: "Define AI capabilities",
    fields: [
        aiCapabilitiesField,
        aiModelPrioritiesField,
    ],
};

const dataIntegrationContainer: AppletContainersConfig = {
    id: "data-integration",
    label: "Data & Integrations",
    placeholder: "Define data sources and integrations",
    fields: [
        dataSourcesField,
        integrationNeedsField,
    ],
};


export const advancedAppletCreatorDefinition: AppletContainersConfig[] = [
    userInfoContainer,
    problemPurposeContainer,
    conceptWorkflowContainer,
    inputOutputContainer,
    dataIntegrationContainer,
    aiCapabilitiesContainer,
];







const aiModelPreferenceField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-868e-9dda-f43dedf74a9d",
    label: "AI Model Preference",
    type: "radio",
    placeholder: "Do you have a preference for specific AI models?",
    customConfig: {
        options: [
            { id: "mod-001", value: "no-preference", label: "No preference (use system recommendation)" },
            { id: "mod-002", value: "openai", label: "OpenAI GPT Models (high capability, costs range significantly for different models)" },
            { id: "mod-003", value: "google", label: "Google AI Models (high capability, broad range of models, Some specialized models)" },
            { id: "mod-004", value: "anthropic", label: "Anthropic's Claude (Extremely capable, great for coding tasks)" },
            { id: "mod-005", value: "meta-llama", label: "Meta Llama (Great for basic tasks, extremely fast, low cost, easy to finetune)" },
            { id: "mod-006", value: "deepseek", label: "DeepSeek (Good for reasoning, low cost, good for finetuning)" },
            { id: "mod-007", value: "xai", label: "xAI Grok (high capability, great for reasoning, coding tasks, and less restricted/biased)" },
            { id: "mod-008", value: "requires-testing", label: "Requires testing (need to test the model to see if it's a good fit)" },
            { id: "mod-009", value: "specialized", label: "Specialized models (for specific tasks)" },
        ],
        includeOther: true,
    },
};

// Export individual field configurations to make them accessible
export {
    primaryAudienceTypeField,
    targetUserField,
    userInteractionField,
    problemToOvercomeField,
    appletPurposeField,
    coreConceptField,
    workflowTypeField,
    workflowDescriptionField,
    userInputTypesField,
    outputTypesField,
    dataSourcesField,
    integrationNeedsField,
    aiCapabilitiesField,
    aiModelPrioritiesField,
    inputTypesField,
    mvpScopeField,
    aiModelPreferenceField
};

