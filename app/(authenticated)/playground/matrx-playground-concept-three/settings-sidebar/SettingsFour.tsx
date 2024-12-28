import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Save, Download, Code, Settings2, AlertCircle, Zap, Bot, Brain, Cpu } from 'lucide-react';

const AIPlaygroundSidebar = () => {
  const [activeModel, setActiveModel] = useState("1");
  
  const ModelCard = () => (
    <Card className="bg-secondary/30 mb-2 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">GPT-4 Turbo</h4>
          <p className="text-xs text-muted-foreground">128k context • 32k output</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );

  const MetricsCard = () => (
    <Card className="bg-secondary/10 p-2 mt-auto">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground">Tokens/sec</p>
            <p className="text-sm font-medium">142</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-sm font-medium">1.2s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          <div>
            <p className="text-xs text-muted-foreground">Memory Used</p>
            <p className="text-sm font-medium">84MB</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">API Calls</p>
            <p className="text-sm font-medium">24</p>
          </div>
        </div>
      </div>
    </Card>
  );

  const ModelSettings = () => (
    <div className="space-y-2">
      <div className="flex justify-between mb-4">
        <Select defaultValue="anthropic">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Select defaultValue="gpt4">
        <SelectTrigger>
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gpt4">GPT-4 Turbo</SelectItem>
          <SelectItem value="claude">Claude 3</SelectItem>
        </SelectContent>
      </Select>

      <ModelCard />

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm">Temperature</label>
            <span className="text-sm text-muted-foreground">0.7</span>
          </div>
          <Slider defaultValue={[0.7]} max={1} step={0.1} />
        </div>

        <div className="flex justify-between items-center">
          <label className="text-sm">Stream Response</label>
          <Switch />
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer">
            <span className="mr-1">📝</span> Text
          </Badge>
          <Badge variant="outline" className="cursor-pointer">
            <span className="mr-1">🔧</span> JSON
          </Badge>
          <Badge variant="outline" className="cursor-pointer">
            <span className="mr-1">📊</span> Structured
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start">
            <Code className="mr-2 h-4 w-4" />
            View Code
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Settings2 className="mr-2 h-4 w-4" />
            Advanced
          </Button>
        </div>

        <Card className="bg-secondary/20 p-2">
          <h4 className="text-sm font-medium mb-2">Resources</h4>
          <div className="flex gap-2">
            <Badge variant="secondary" className="cursor-pointer">
              <AlertCircle className="mr-1 h-3 w-3" />
              Docs
            </Badge>
            <Badge variant="secondary" className="cursor-pointer">
              Examples
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-1 pt-4">
      <Tabs defaultValue="1" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mb-4">
          {["1", "2", "3", "4"].map((id) => (
            <TabsTrigger
              key={id}
              value={id}
              onClick={() => setActiveModel(id)}
              className="data-[state=active]:bg-primary"
            >
              Model {id}
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollArea className="flex-1">
          {["1", "2", "3", "4"].map((id) => (
            <TabsContent key={id} value={id} className="mt-0">
              <ModelSettings />
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
      <MetricsCard />
    </div>
  );
};

export default AIPlaygroundSidebar;