import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, Save, Upload, Code, ChevronDown, Wand2,
  FileSearch, Globe, Image, MessagesSquare, Terminal,
  AlertCircle, Info, Github, Book, Database
} from 'lucide-react';

const AIPlaygroundSidebar = () => {
  const [activeModel, setActiveModel] = useState('1');
  const [provider, setProvider] = useState('openai');
  const [responseFormat, setResponseFormat] = useState('text');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-1 pt-4 overflow-hidden">
        {/* Global Settings */}
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between px-2">
            <Select defaultValue={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google AI</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-0.5">
              <Button variant="outline" size="icon">
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Model Tabs */}
        <Tabs value={activeModel} onValueChange={setActiveModel} className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-0.5">
            <TabsTrigger value="1">Model 1</TabsTrigger>
            <TabsTrigger value="2">Model 2</TabsTrigger>
            <TabsTrigger value="3">Model 3</TabsTrigger>
            <TabsTrigger value="4">Model 4</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-240px)] px-1 py-2">
            {['1', '2', '3', '4'].map((modelNum) => (
              <TabsContent key={modelNum} value={modelNum} className="mt-0">
                <div className="space-y-4">
                  {/* Model Selection */}
                  <Select defaultValue="gpt4">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt4">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt35">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude">Claude 3</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Model Info Card */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">GPT-4 Turbo</p>
                        <p className="text-xs text-muted-foreground">128k context · Vision enabled</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Main Settings */}
                  <div className="space-y-6">
                    {/* Temperature */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Temperature</label>
                        <span className="text-xs text-muted-foreground">0.7</span>
                      </div>
                      <Slider
                        defaultValue={[0.7]}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Max Tokens */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Max Tokens</label>
                        <span className="text-xs text-muted-foreground">2000</span>
                      </div>
                      <Slider
                        defaultValue={[2000]}
                        max={4000}
                        step={100}
                        className="w-full"
                      />
                    </div>

                    {/* Response Format */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Response Format</label>
                      <div className="flex gap-0.5">
                        <Button 
                          variant={responseFormat === 'text' ? 'default' : 'outline'} 
                          size="icon"
                          onClick={() => setResponseFormat('text')}
                        >
                          <MessagesSquare className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant={responseFormat === 'json' ? 'default' : 'outline'} 
                          size="icon"
                          onClick={() => setResponseFormat('json')}
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant={responseFormat === 'structured' ? 'default' : 'outline'} 
                          size="icon"
                          onClick={() => setResponseFormat('structured')}
                        >
                          <Terminal className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant={responseFormat === 'media' ? 'default' : 'outline'} 
                          size="icon"
                          onClick={() => setResponseFormat('media')}
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Enabled Tools */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Enabled Tools</label>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          <Wand2 className="h-3 w-3 mr-1" />
                          Functions
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          <Terminal className="h-3 w-3 mr-1" />
                          Code
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          <FileSearch className="h-3 w-3 mr-1" />
                          Files
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          <Globe className="h-3 w-3 mr-1" />
                          Web
                        </Badge>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Stream Response</label>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Settings
                    </Button>
                  </div>

                  {/* Resources Section */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resources</label>
                    <div className="flex gap-0.5">
                      <Button variant="outline" size="icon">
                        <Book className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Github className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Database className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>

      {/* Metrics Card */}
      <Card className="mt-auto mx-1 mb-1">
        <CardContent className="p-3 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tokens Used</p>
            <p className="text-sm font-medium">1,234 / 5,000</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-sm font-medium">1.2s</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-sm font-medium">$0.023</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Memory Usage</p>
            <p className="text-sm font-medium">42 MB</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIPlaygroundSidebar;