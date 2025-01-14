import React from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiOpenai } from "react-icons/si";
import { SiAnthropic } from "react-icons/si";
import { AiFillGoogleCircle } from "react-icons/ai";
import { MODEL_DATA } from "../constants";

export type ModelCardProps = {
  model: string;
  provider: string;
  endpoint: string;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, provider, endpoint }) => {
  const modelInfo = MODEL_DATA[model] || {
    name: "Unknown Model",
    context: "Context: Unkown",
    lastUpdated: "Info: None",
  };

  const getProviderIcon = () => {
    switch (provider?.toLowerCase()) {
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
