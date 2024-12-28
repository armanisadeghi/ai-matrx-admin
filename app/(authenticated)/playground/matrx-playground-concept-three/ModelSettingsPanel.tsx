import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Save,
  Upload,
  Code,
  ChevronRight,
  MessageSquare,
  Braces,
  Image,
  FileSearch,
  Globe,
  Terminal,
  Info,
  BarChart2,
  Clock,
  Zap,
  Cpu,
  GraduationCap,
  Github,
  Files
} from 'lucide-react';

const ModelSettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('model1');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [streamResponse, setStreamResponse] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);

  // Check viewport width for responsive tab labels
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 640);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

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
    <div className="h-full flex flex-col bg-background">
      <div className="p-2 space-y-4">
        {/* Top Section with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-elevation1">
            {[1, 2, 3, 4].map((num) => (
              <TabsTrigger
                key={num}
                value={`model${num}`}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {isNarrow ? `M${num}` : `Model ${num}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Provider Selection with Action Buttons */}
        <div className="flex gap-2 items-center">
          <select className="flex-1 bg-elevation1 rounded-md p-2 text-sm">
            <option>OpenAI</option>
            <option>Anthropic</option>
            <option>Google</option>
          </select>
          
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

        {/* Model Selection */}
        <select className="w-full bg-elevation1 rounded-md p-2 text-sm">
          <option>GPT-4</option>
          <option>Claude 3</option>
          <option>Gemini Pro</option>
        </select>

        {/* Model Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-elevation2 rounded-lg p-2"
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-sm">GPT-4 Turbo</h4>
              <p className="text-xs text-muted-foreground">128k context · Latest: Mar 2024</p>
            </div>
            <Button variant="ghost" size="sm">
              <Info size={16} />
            </Button>
          </div>
        </motion.div>

        {/* Main Settings */}
        <div className="space-y-4">
          {/* Temperature */}
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

          {/* Max Tokens */}
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

          {/* Stream Response */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Stream Response</span>
            <Switch
              checked={streamResponse}
              onCheckedChange={setStreamResponse}
            />
          </div>

          {/* Response Format */}
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

          {/* Tools */}
          <div className="space-y-2">
            <span className="text-sm">Tools</span>
            <div className="grid grid-cols-2 gap-1">
              {tools.map((tool) => (
                <Button
                  key={tool.value}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  {tool.icon}
                  <span className="ml-2 text-xs">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Settings Button */}
        <Button variant="outline" className="w-full">
          <Settings size={16} className="mr-2" />
          Advanced Settings
        </Button>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto mb-2">
        {/* Resources Section */}
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

        {/* Metrics Card */}
        <Card className="bg-elevation2 p-2 rounded-lg mx-2 mb-2 mt-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <BarChart2 size={14} className="text-primary" />
                <span className="text-xs font-medium">Usage</span>
              </div>
              <span className="text-xl font-semibold">2.4K</span>
              <span className="text-xs text-muted-foreground">tokens/min</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-info" />
                <span className="text-xs font-medium">Latency</span>
              </div>
              <span className="text-xl font-semibold">127</span>
              <span className="text-xs text-muted-foreground">ms</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Zap size={14} className="text-warning" />
                <span className="text-xs font-medium">Requests</span>
              </div>
              <span className="text-xl font-semibold">845</span>
              <span className="text-xs text-muted-foreground">/hour</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Cpu size={14} className="text-success" />
                <span className="text-xs font-medium">Success</span>
              </div>
              <span className="text-xl font-semibold">99.8</span>
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ModelSettingsPanel;