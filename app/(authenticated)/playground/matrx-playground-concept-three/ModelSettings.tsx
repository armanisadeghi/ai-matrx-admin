import React from 'react';
import ModelSelectionWithinfo from './ModelSelectionWithinfo';
import { Button } from '@/components/ui/button';
import { Save, Upload, Code } from 'lucide-react';
import PromptSettings from './PromptSettings';

const ModelSettings = ({ initialSettings }) => {
  return (
    <>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Save size={16} />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Upload size={16} />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Code size={16} />
        </Button>
      </div>
      
      <ModelSelectionWithinfo initialSettings={initialSettings} />
      <PromptSettings initialSettings={initialSettings} />
    </>
  );
};

export default ModelSettings;