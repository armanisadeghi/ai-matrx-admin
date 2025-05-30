'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRight, Globe, Files, Github, GraduationCap } from 'lucide-react';
import { CockpitControls } from '../types';
import { UseRecipeAgentSettingsHook } from '@/hooks/aiCockpit/useRecipeAgentSettings';

interface DynamicPromptSettingsProps {
    playgroundControls: CockpitControls;
    recipeAgentSettingsHook: UseRecipeAgentSettingsHook;
    settingsSetNumber: number;
}

const PlaygroundResources = ({ playgroundControls, recipeAgentSettingsHook, settingsSetNumber }: DynamicPromptSettingsProps) => {
  return (
    <Card className="bg-elevation1 p-2 rounded-none border-t border-b">
      <h4 className="text-sm font-medium mb-2">Resources</h4>
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} />
            <span className="text-xs">API Reference</span>
          </div>
          <ChevronRight size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Files size={14} />
            <span className="text-xs">Documentation</span>
          </div>
          <ChevronRight size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Github size={14} />
            <span className="text-xs">GitHub</span>
          </div>
          <ChevronRight size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={14} />
            <span className="text-xs">Matrix University</span>
          </div>
          <ChevronRight size={14} />
        </Button>
      </div>
    </Card>
  );
};

export default PlaygroundResources;
