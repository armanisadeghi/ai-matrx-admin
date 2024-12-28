import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Settings2, Download, Activity, Zap } from 'lucide-react';

const PlaygroundSidebar = () => {
  const [activeModel, setActiveModel] = useState(1);

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* Header Section */}
      <div className="p-0 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Model Settings</h2>
          <div className="flex gap-0">
            <Button variant="ghost" size="icon">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Model Tabs */}
        <Tabs defaultValue="model1" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            {[1, 2, 3, 4].map((model) => (
              <TabsTrigger
                key={model}
                value={`model${model}`}
                className="px-1 py-1"
                onClick={() => setActiveModel(model)}
              >
                M{model}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Settings Content */}
      <ScrollArea className="flex-grow">
        <div className="p-1 space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <select className="w-full rounded-md border bg-background px-3 py-2">
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Google</option>
            </select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <select className="w-full rounded-md border bg-background px-3 py-2">
              <option>GPT-4</option>
              <option>GPT-3.5-Turbo</option>
            </select>
          </div>

          {/* Model-specific settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Tokens</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* Add more model-specific settings here */}
          </div>

          {/* Tools Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tools</label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Code Interpreter</Badge>
              <Badge variant="secondary">Web Browser</Badge>
              <Badge variant="secondary">DALL-E</Badge>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Metrics Footer */}
      <div className="border-t p-2 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Response Time: 1.2s</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Tokens: 150</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundSidebar;