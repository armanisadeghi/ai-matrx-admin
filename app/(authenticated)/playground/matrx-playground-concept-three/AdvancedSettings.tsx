// AdvancedSettings.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Terminal, FileSearch, Globe, Image } from "lucide-react";

const AdvancedSettings: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Tools */}
      <div className="space-y-2">
        <span className="text-sm">Tools</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-1">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <Terminal size={18} />
            <span className="ml-2 text-xs">Execute Code</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <FileSearch size={18} />
            <span className="ml-2 text-xs">Search Files</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <Globe size={18} />
            <span className="ml-2 text-xs">Brows Web</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <Image size={18} />
            <span className="ml-2 text-xs">Generate Images</span>
          </Button>
        </div>
      </div>

      {/* Advanced Settings Button */}
      <Button variant="outline" className="w-full">
        <Settings size={16} className="mr-2" />
        Advanced Settings
      </Button>
    </div>
  );
};

export default AdvancedSettings;