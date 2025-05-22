import { StructuredConfig } from "./structured-ast-processor";

const appSuggestionsStructuredConfig: StructuredConfig = {
    groupTrigger: {
        type: "heading",
        contentPattern: "^[1-3]\\. Suggestion$",
        depth: 2,
    },
    fields: {
        app_name: {
            trigger: {
                type: "listItem - text - strong",
                content: "App Name",
            },
            contentPath: {
                type: "text",
                depth: 2,
            },
        },
        app_description: {
            trigger: {
                type: "listItem - text - strong",
                content: "App Description",
            },
            contentPath: {
                type: "text",
                depth: 2,
            },
        },
        image_description: {
            trigger: {
                type: "listItem - text - strong",
                content: "Image Description",
            },
            contentPath: {
                type: "text",
                depth: 2,
            },
        },
    },
};


const seoStructuredConfig: StructuredConfig = {
    groupTrigger: {
      type: 'heading',
      contentPattern: '^[🔍🏷️🏗️🔗🌐📱🗂️🧭] [1-8]\\. ',
      depth: 3,
    },
    fields: {
      title: {
        useTriggerContent: true,
      },
      details: {
        collectAllChildren: true,
        trigger: {
          type: 'listItem - text - paragraph',
        },
      },
      details_strong: {
        collectAllChildren: true,
        trigger: {
          type: 'listItem - text - strong',
        },
      },
    },
  };
  

const STRUCTURED_APP_SUGGESTIONS_CONFIG_DEFINITION = {
    id: "structuredAppSuggestions",
    name: "Structured App Suggestions",
    type: "structured",
    processorType: "structuredAst",
    config: appSuggestionsStructuredConfig,
    description: "Structured App Suggestions",
};


const STRUCTURED_SEO_CONFIG_DEFINITION = {
    id: "structuredSeo",
    name: "Structured SEO",
    type: "structured",
    processorType: "structuredAst",
    config: seoStructuredConfig,
    description: "Structured SEO",
};


export const STRUCTURED_CONFIGS = [STRUCTURED_APP_SUGGESTIONS_CONFIG_DEFINITION, STRUCTURED_SEO_CONFIG_DEFINITION];



