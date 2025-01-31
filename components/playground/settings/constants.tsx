import { ModelDataType } from "./types";
import { CrudButtonOptions, CrudLayout } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';

export const MODEL_DATA: ModelDataType = {
    gpt4: {
      name: "GPT-4 Turbo",
      context: "128k context",
      lastUpdated: "Latest: Mar 2024",
      description: "Most capable GPT-4 model for tasks of any complexity",
      pricing: "$0.01/1K tokens",
    },
    gpt35: {
      name: "GPT-3.5 Turbo",
      context: "16k context",
      lastUpdated: "Latest: Jan 2024",
      description: "Efficient model for most everyday tasks",
      pricing: "$0.002/1K tokens",
    },
    claude3: {
      name: "Claude 3 Opus",
      context: "200k context",
      lastUpdated: "Latest: Mar 2024",
      description: "Most powerful Claude model with enhanced reasoning",
      pricing: "$0.015/1K tokens",
    },
    claude2: {
      name: "Claude 2.1",
      context: "100k context",
      lastUpdated: "Latest: Nov 2023",
      description: "Balanced performance for most tasks",
      pricing: "$0.008/1K tokens",
    },
    gemini_pro: {
      name: "Gemini Pro",
      context: "32k context",
      lastUpdated: "Latest: Feb 2024",
      description: "Advanced model optimized for coding and analysis",
      pricing: "$0.005/1K tokens",
    },
    gemini_ultra: {
      name: "Gemini Ultra",
      context: "64k context",
      lastUpdated: "Latest: Mar 2024",
      description: "Google's most capable model for complex tasks",
      pricing: "$0.012/1K tokens",
    },
  };
  

  export const initialLayoutProps = getUnifiedLayoutProps({
      entityKey: 'aiSettings',
      formComponent: 'MINIMAL',
      quickReferenceType: 'LIST',
      isExpanded: true,
      handlers: {},
  });
  
  export const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
      formComponent: 'MINIMAL',
      dynamicStyleOptions: {
          density: 'compact',
          size: 'sm',
      },
      dynamicLayoutOptions: {
          formStyleOptions: {
              fieldFiltering: {
                  excludeFields: ['id'],
                  defaultShownFields: ['presetName', 'aiEndpoint', 'aiProvider', 'aiModel', 'temperature', 'maxTokens', 'stream', 'responseFormat', 'tools'],
              },
          },
      },
  });
  
  
  
  export const DEFAULT_CRUD_OPTIONS: CrudButtonOptions = {
      allowCreate: false,
      allowEdit: true,
      allowDelete: true,
      allowAdvanced: true,
      allowRefresh: true,
      forceEnable: true,
  };
  
  export const DEFAULT_CRUD_LAYOUT: CrudLayout = {
      buttonLayout: 'row',
      buttonSize: 'icon',
      buttonsPosition: 'top',
      buttonSpacing: 'compact',
  };