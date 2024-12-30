import React from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiOpenai } from "react-icons/si";
import { SiAnthropic } from "react-icons/si";
import { AiFillGoogleCircle } from "react-icons/ai";

type ModelInfo = {
  name: string;
  context: string;
  lastUpdated: string;
  description?: string;
  pricing?: string;
};

type ModelDataType = {
  [key: string]: ModelInfo;
};

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

interface ModelCardProps {
  model: string;
  provider: string;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, provider }) => {
  const modelInfo = MODEL_DATA[model] || {
    name: "Unknown Model",
    context: "Context: Unkown",
    lastUpdated: "Info: None",
  };

  const getProviderIcon = () => {
    switch (provider.toLowerCase()) {
      case "openai":
        return <SiOpenai className="h-4 w-4" />;
      case "anthropic":
        return <SiAnthropic className="h-4 w-4" />;
      case "google":
        return <AiFillGoogleCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-elevation2 rounded-lg p-2"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="font-medium text-sm">{modelInfo.name}</h4>
            <p className="text-xs text-muted-foreground">
              {modelInfo.context} · {modelInfo.lastUpdated}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          {getProviderIcon()}
        </Button>
      </div>
    </motion.div>
  );
};

export default ModelCard;
