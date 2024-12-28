import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Save, Settings2, Upload, ChevronRight, BarChart2 } from 'lucide-react';

const ModelSettings = () => {
  const [activeModel, setActiveModel] = useState('1');
  
  const providers = ['OpenAI', 'Anthropic', 'Google', 'Mistral'];
  const models = {
    'OpenAI': ['GPT-4', 'GPT-3.5', 'DALL-E 3'],
    'Anthropic': ['Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 3 Haiku'],
    'Google': ['Gemini Pro', 'Gemini Ultra'],
    'Mistral': ['Mistral Large', 'Mistral Medium', 'Mistral Small']
  };

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-0 border-b">
        <h2 className="text-lg font-semibold flex items-center p-3 gap-1">
          <Settings2 className="w-5 h-5" />
          Model Settings
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Model Tabs */}
        <Tabs 
          value={activeModel} 
          onValueChange={setActiveModel}
          className="w-full"
        >
          <div className="p-1 border-b bg-muted/40">
            <TabsList className="grid grid-cols-4 w-full">
              {[1, 2, 3, 4].map((num) => (
                <TabsTrigger
                  key={num}
                  value={num.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Model {num}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {[1, 2, 3, 4].map((num) => (
            <TabsContent 
              key={num} 
              value={num.toString()}
              className="flex-1 overflow-auto"
            >
              <div className="space-y-4 p-1">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models['OpenAI'].map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Common Settings */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Temperature</label>
                    <Slider defaultValue={[0.7]} max={1} step={0.1} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens</label>
                    <Slider defaultValue={[2048]} max={4096} step={256} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Stream Response</label>
                    <Switch />
                  </div>
                </div>

                {/* Tools Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enabled Tools</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Code Interpreter</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Web Browsing</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Image Generation</span>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Bottom Actions */}
        <div className="border-t p-4 space-y-4">
          {/* Save/Load Buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Upload className="w-4 h-4" />
              Load Preset
            </Button>
          </div>

          {/* Metrics Card */}
          <Card className="bg-muted/40">
            <CardContent className="p-3 space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Current Metrics
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Response Time</div>
                  <div className="font-medium">1.2s</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Token Usage</div>
                  <div className="font-medium">1,024/4,096</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModelSettings;