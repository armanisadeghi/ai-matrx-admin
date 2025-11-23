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
 * App Format Descriptions (page_layout_format)
 */
export const formatInstructions: Record<FormatType, string> = {
  chat: 
    "Chat layout with input at bottom, messages flowing up like ChatGPT",

  form: 
    "Form layout with inputs at top, results displayed below",

  widget: 
    "Compact widget layout, all in one contained space"
};

/**
 * Display Component Descriptions (response_display_component)
 */
export const displayModeInstructions: Record<DisplayMode, string> = {
  'matrx-format': 
    "EnhancedChatMarkdown",

  'custom': 
    "Custom display component - create a fully custom parser and display tailored to the output structure"
};

/**
 * Response Display Mode Descriptions (response_display_mode)
 */
export const responseModeInstructions: Record<ResponseMode, string> = {
  stream: 
    "Show initial loader and then stream the response",

  loader: 
    "Show full loading screen, then display complete response all at once"
};

/**
 * Builtin Variables Configuration
 * 
 * These functions prepare the specific string values for each builtin variable
 * that will be passed to the prompt_builtin
 */

/**
 * Generate input_fields_to_include variable
 * Default: "Include all fields, including additional instructions"
 */
export function generateInputFieldsToInclude(config: {
  includeUserInstructions: boolean;
  includedVariables: Record<string, boolean>;
  variableDefaults: any[];
}): string {
  // Get included variables
  const includedVars = config.variableDefaults.filter(v => 
    config.includedVariables[v.name] !== false
  );
  
  // If no specific configuration, use default
  if (Object.keys(config.includedVariables).length === 0) {
    return "Include all fields, including additional instructions";
  }
  
  const fields: string[] = [];
  
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
    fields.push("additional_instructions");
  }
  
  return fields.length > 0 
    ? fields.join(', ') 
    : "Include all fields, including additional instructions";
}

/**
 * Generate page_layout_format variable
 * Default: "Choose the best option for my prompt and purpose"
 */
export function generatePageLayoutFormat(format: FormatType | null): string {
  if (!format) {
    return "Choose the best option for my prompt and purpose";
  }
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
 * Default: "Choose whatever colors will be best for my specific app and make sure they match the vibe of what I'm doing"
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
    return "Choose whatever colors will be best for my specific app and make sure they match the vibe of what I'm doing";
  }
  
  if (!colors) {
    return "Choose whatever colors will be best for my specific app and make sure they match the vibe of what I'm doing";
  }
  
  return `Use these specific colors:\nPrimary: ${colors.primary}\nSecondary: ${colors.secondary}\nAccent: ${colors.accent}`;
}

/**
 * Main function to generate all builtin variables
 */
export function generateBuiltinVariables(config: {
  promptObject: any;
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
    prompt_object: JSON.stringify(config.promptObject || {}),
    sample_response: "Sample response is not available but easy to determine, based on the prompt object.",
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

