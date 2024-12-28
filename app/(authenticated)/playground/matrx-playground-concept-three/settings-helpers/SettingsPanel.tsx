// SettingsPanel.tsx
'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Braces, 
  Files, 
  Image,
  Terminal,
  FileSearch,
  Globe
} from 'lucide-react';
import { ModelSettings } from './ModelInfoCard';


export const SettingsPanel = ({ 
  settings, 
  onChange 
}: { 
  settings: ModelSettings;
  onChange: (settings: Partial<ModelSettings>) => void;
}) => {
  const responseFormats = [
    { icon: <MessageSquare size={18} />, value: 'text', label: 'Text' },
    { icon: <Braces size={18} />, value: 'json', label: 'JSON' },
    { icon: <Files size={18} />, value: 'structured', label: 'Structured' },
    { icon: <Image size={18} />, value: 'media', label: 'Media' }
  ];

  const tools = [
    { icon: <Terminal size={18} />, value: 'code', label: 'Code Interpreter' },
    { icon: <FileSearch size={18} />, value: 'files', label: 'File Search' },
    { icon: <Globe size={18} />, value: 'web', label: 'Web Browsing' },
    { icon: <Image size={18} />, value: 'image', label: 'Image Generation' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <select className="w-full bg-elevation1 rounded-md p-2 text-sm">
          <option>GPT-4</option>
          <option>Claude 3</option>
          <option>Gemini Pro</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Temperature</span>
          <span className="text-muted-foreground">{settings.temperature}</span>
        </div>
        <Slider
          value={[settings.temperature]}
          onValueChange={([value]) => onChange({ temperature: value })}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Max Tokens</span>
          <span className="text-muted-foreground">{settings.maxTokens}</span>
        </div>
        <Slider
          value={[settings.maxTokens]}
          onValueChange={([value]) => onChange({ maxTokens: value })}
          max={8000}
          step={100}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Stream Response</span>
        <Switch
          checked={settings.streamResponse}
          onCheckedChange={(checked) => onChange({ streamResponse: checked })}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm">Response Format</span>
        <div className="grid grid-cols-4 gap-1">
          {responseFormats.map((format) => (
            <Button
              key={format.value}
              variant="outline"
              size="sm"
              className="p-2"
              data-state={settings.responseFormat === format.value ? 'active' : ''}
              onClick={() => onChange({ responseFormat: format.value })}
            >
              {format.icon}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm">Tools</span>
        <div className="grid grid-cols-2 gap-1">
          {tools.map((tool) => (
            <Button
              key={tool.value}
              variant="outline"
              size="sm"
              className="justify-start"
              data-state={settings.enabledTools?.includes(tool.value) ? 'active' : ''}
              onClick={() => {
                const newTools = settings.enabledTools?.includes(tool.value)
                  ? settings.enabledTools.filter(t => t !== tool.value)
                  : [...(settings.enabledTools || []), tool.value];
                onChange({ enabledTools: newTools });
              }}
            >
              {tool.icon}
              <span className="ml-2 text-xs">{tool.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
