/**
 * Configuration Instructions for AI App Generation
 * 
 * This file contains human-readable descriptions of each configuration option
 * that will be used to instruct the AI model when generating custom prompt apps.
 */

export type FormatType = 'chat' | 'form' | 'widget';
export type DisplayMode = 'matrx-format' | 'custom';
export type ResponseMode = 'stream' | 'loader';

/**
 * App Format Descriptions
 */
export const formatInstructions: Record<FormatType, string> = {
  chat: 
    "Chat Style Layout: Similar to ChatGPT, with the input field fixed to the bottom of the screen. " +
    "The conversation flows in the center of the page with messages appearing one by one as they are entered. " +
    "This creates an interactive, conversational experience where the user can see the history of their interactions. " +
    "The UI should feel like a messaging app with clear distinction between user messages and AI responses.",

  form: 
    "Form Style Layout: A traditional top-to-bottom flow where input fields are positioned at the top of the page. " +
    "Users enter text or make selections in these fields, then submit to execute the prompt. " +
    "Results are displayed below the form, filling down the page. " +
    "This layout can support follow-up interactions by displaying a new input field after the response, " +
    "or by providing other interactive elements. The design should feel like a structured application form " +
    "with clear sections for input and output.",

  widget: 
    "Widget Style Layout: A self-contained, confined widget that is perfect for embedding in other interfaces. " +
    "The entire interaction happens within a fixed-size container. " +
    "The flow is: Input → Loading state → Result, all displayed in the same space. " +
    "The widget should feel compact and efficient, with smooth transitions between states. " +
    "This format is ideal when you want a focused, single-purpose tool that doesn't need a full page layout."
};

/**
 * Display Mode Descriptions
 */
export const displayModeInstructions: Record<DisplayMode, string> = {
  'matrx-format': 
    "Use EnhancedChatMarkdown for the output.",

  'custom': 
    "Custom Display Mode: Instead of using EnhancedChatMarkdown, create a fully custom parser and display for the output." +
    "Design a fully customized UI that is specifically tailored to the expected output structure." +
    "Parse the AI response and render it using custom components that are purpose-built for this specific use case. " +
    "The output should feel like a native app feature rather than generic AI text."
};

/**
 * Response Mode Descriptions
 */
export const responseModeInstructions: Record<ResponseMode, string> = {
  stream: 
    "Real-time Streaming Response: Show initial loader and then stream the response.",

  loader: 
    "Show All at Once: Display a loading screen or spinner while the AI generates the complete response. " +
    "Once generation is finished, show the entire result at once. This creates a more traditional application feel, " +
    "similar to submitting a form and waiting for results. The loading state should be clear and informative, " +
    "possibly with progress indicators or status messages. This mode makes the experience feel less 'AI-like' " +
    "and more like a standard web application, which can be preferable for certain use cases."
};

/**
 * Builtin Variables Configuration
 * 
 * These functions prepare the specific string values for each builtin variable
 * that will be passed to the prompt_builtin
 */

/**
 * Generate input_fields_to_include variable
 */
export function generateInputFieldsToInclude(config: {
  includeUserInstructions: boolean;
  includedVariables: Record<string, boolean>;
  variableDefaults: any[];
}): string {
  const fields: string[] = [];
  
  // Get included variables
  const includedVars = config.variableDefaults.filter(v => 
    config.includedVariables[v.name] !== false
  );
  
  if (includedVars.length > 0) {
    includedVars.forEach(variable => {
      let fieldDesc = `${variable.name}`;
      
      if (variable.defaultValue) {
        fieldDesc += ` (Default: "${variable.defaultValue}")`;
      }
      
      if (variable.customComponent?.options) {
        const componentType = variable.customComponent.type || 'select';
        fieldDesc += ` - ${componentType} with options: ${variable.customComponent.options.join(', ')}`;
      }
      
      fields.push(fieldDesc);
    });
  }
  
  // Add user instructions field if enabled
  if (config.includeUserInstructions) {
    fields.push("Additional Instructions (optional text field for custom user instructions)");
  }
  
  return fields.length > 0 
    ? fields.join('\n') 
    : "No input fields required - all variables use default values";
}

/**
 * Generate page_layout_format variable
 */
export function generatePageLayoutFormat(format: FormatType): string {
  return formatInstructions[format];
}

/**
 * Generate response_display_component variable
 */
export function generateResponseDisplayComponent(displayMode: DisplayMode): string {
  return displayModeInstructions[displayMode];
}

/**
 * Generate response_display_mode variable
 */
export function generateResponseDisplayMode(responseMode: ResponseMode): string {
  return responseModeInstructions[responseMode];
}

/**
 * Generate color_pallet_options variable
 */
export function generateColorPalletOptions(
  colorMode: 'auto' | 'custom',
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  }
): string {
  if (colorMode === 'auto') {
    return "Use the best color palette for this particular app. Choose colors that match the app's purpose, style, and use case. " +
           "Ensure the selected colors provide good contrast, accessibility, and a cohesive visual design.";
  }
  
  if (!colors) {
    return "Use the best color palette for this particular app.";
  }
  
  return `Primary: ${colors.primary} (main buttons, key interactive elements)\n` +
         `Secondary: ${colors.secondary} (headers, highlights, accents)\n` +
         `Accent: ${colors.accent} (special elements, subtle effects)\n` +
         `Ensure consistent application throughout with proper contrast for accessibility.`;
}

/**
 * Main function to generate all builtin variables
 */
export function generateBuiltinVariables(config: {
  format: FormatType;
  displayMode: DisplayMode;
  responseMode: ResponseMode;
  includeUserInstructions: boolean;
  includedVariables: Record<string, boolean>;
  variableDefaults: any[];
  colorMode: 'auto' | 'custom';
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customInstructions?: string;
}) {
  return {
    input_fields_to_include: generateInputFieldsToInclude({
      includeUserInstructions: config.includeUserInstructions,
      includedVariables: config.includedVariables,
      variableDefaults: config.variableDefaults,
    }),
    page_layout_format: generatePageLayoutFormat(config.format),
    response_display_component: generateResponseDisplayComponent(config.displayMode),
    response_display_mode: generateResponseDisplayMode(config.responseMode),
    color_pallet_options: generateColorPalletOptions(config.colorMode, config.colors),
    custom_instructions: config.customInstructions || "",
  };
}

/**
 * Helper to get a short description for each option (useful for tooltips or summaries)
 */
export const shortDescriptions = {
  format: {
    chat: "Conversational interface with messages flowing vertically",
    form: "Traditional form layout with inputs at top, results below",
    widget: "Compact widget for embedding"
  },
  displayMode: {
    'matrx-format': "Rich formatted output with Matrx styling",
    'custom': "Purpose-built UI for specific output structure"
  },
  responseMode: {
    stream: "Content appears as it's generated",
    loader: "Loading screen, then complete result"
  }
} as const;

