import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MessageSquare, Braces, Files, Image } from 'lucide-react';

const PromptSettings = ({ initialSettings }) => {
  const [temperature, setTemperature] = useState(initialSettings?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(initialSettings?.maxTokens || 2000);
  const [streamResponse, setStreamResponse] = useState(initialSettings?.streamResponse || true);

  const responseFormats = [
    { icon: <MessageSquare size={18} />, value: 'text', label: 'Text' },
    { icon: <Braces size={18} />, value: 'json', label: 'JSON' },
    { icon: <Files size={18} />, value: 'structured', label: 'Structured' },
    { icon: <Image size={18} />, value: 'media', label: 'Media' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Temperature</span>
          <span className="text-muted-foreground">{temperature}</span>
        </div>
        <Slider
          value={[temperature]}
          onValueChange={([value]) => setTemperature(value)}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Max Tokens</span>
          <span className="text-muted-foreground">{maxTokens}</span>
        </div>
        <Slider
          value={[maxTokens]}
          onValueChange={([value]) => setMaxTokens(value)}
          max={8000}
          step={100}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Stream Response</span>
        <Switch
          checked={streamResponse}
          onCheckedChange={setStreamResponse}
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
            >
              {format.icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptSettings;