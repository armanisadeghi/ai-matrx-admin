import { ModelDataType } from "./settings/types";

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
  