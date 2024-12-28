import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import {
  Settings, Save, Download, Code, ChevronRight, 
  FileText, Braces, Image, Terminal, Globe, 
  Search, SquareFunction, Wrench, Info
} from 'lucide-react';

const SettingsSidebar = () => {
  const [activeModel, setActiveModel] = useState('1');

  return (
    <div className="h-full w-full flex flex-col bg-background p-1">
      {/* Top Navigation */}
      <Tabs defaultValue="1" className="w-full pt-3">
        <div className="flex items-center justify-between px-2 mb-4">
          <TabsList className="grid grid-cols-4 w-2/3">
            {['1', '2', '3', '4'].map((num) => (
              <TabsTrigger
                key={num}
                value={num}
                onClick={() => setActiveModel(num)}
                className="data-[state=active]:bg-primary"
              >
                Model {num}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {['1', '2', '3', '4'].map((num) => (
          <TabsContent key={num} value={num} className="mt-0">
            <div className="space-y-4">
              {/* Provider & Model Selection */}
              <div className="space-y-2">
                <Select>
                  <SelectTrigger className="w-full">Select Provider</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-full">Select Model</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt4">GPT-4</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                  </SelectContent>
                </Select>

                {/* Model Info Card */}
                <Card className="p-3 bg-primary/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">GPT-4</h4>
                      <p className="text-xs text-muted-foreground">Latest: v2.0</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Info className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Core Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">Temperature</label>
                  <Slider defaultValue={[0.7]} max={1} step={0.1} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Max Tokens</label>
                  <Slider defaultValue={[2048]} max={4096} step={256} />
                </div>

                {/* Response Format */}
                <div className="flex gap-2 justify-around">
                  <Button variant="outline" className="flex-1">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Braces className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Image className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tools & Features */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                    <Terminal className="h-4 w-4" />
                    <Switch  />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                    <Globe className="h-4 w-4" />
                    <Switch  />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                    <Search className="h-4 w-4" />
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                    <SquareFunction className="h-4 w-4" />
                    <Switch  />
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>

              {/* Resources Section */}
              <Card className="p-3">
                <h3 className="text-sm font-medium mb-2">Resources</h3>
                <div className="space-y-1">
                  {['Documentation', 'Examples', 'Pricing'].map((resource) => (
                    <div key={resource} className="flex items-center justify-between text-sm">
                      <span>{resource}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Metrics Card */}
      <Card className="mt-auto p-3 bg-primary/5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Tokens Used</p>
            <p className="text-sm font-medium">1,234</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-sm font-medium">1.2s</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-sm font-medium">$0.023</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-sm font-medium">99.8%</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsSidebar;