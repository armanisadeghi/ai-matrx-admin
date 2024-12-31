import React from "react";
import ModelSelectionWithinfo from "./ModelSelectionWithinfo";
import { Button } from "@/components/ui/button";
import { Save, Code, SquarePlus } from "lucide-react";
import PromptSettings from "../settings/PromptSettings";

const ModelSettings = ({ initialSettings }) => {
  return (
    <>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Save size={16} />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <SquarePlus size={16} />
        </Button>
      </div>

      <ModelSelectionWithinfo initialSettings={initialSettings} />
      <PromptSettings initialSettings={initialSettings} />
    </>
  );
};

export default ModelSettings;
