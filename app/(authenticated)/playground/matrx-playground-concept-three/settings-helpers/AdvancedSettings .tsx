import React from 'react';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion';
import { 
  Settings, 
  Sliders, 
  Cpu, 
  Zap,
  Shield,
  Globe,
  RefreshCw,
  Save
} from 'lucide-react';

interface AdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  model: string;
  settings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

const AdvancedSettings = ({ 
  isOpen, 
  onClose, 
  provider,
  model,
  settings,
  onSettingsChange 
}: AdvancedSettingsProps) => {
  const [activeTab, setActiveTab] = React.useState('sampling');
  
  // Handler for updating settings
  const updateSetting = (key: string, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <SheetTitle>Advanced Settings</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <span className="text-sm">
              {provider} • {model}
            </span>
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 p-6 pb-0">
            <TabsTrigger value="sampling" className="gap-2">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Sampling</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="gap-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">Context</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-220px)] px-6">
            <TabsContent value="sampling" className="space-y-4 py-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Top P */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top P</span>
                    <span className="text-muted-foreground">{settings.topP}</span>
                  </div>
                  <Slider
                    value={[settings.topP]}
                    onValueChange={([value]) => updateSetting('topP', value)}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                {/* Top K */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top K</span>
                    <span className="text-muted-foreground">{settings.topK}</span>
                  </div>
                  <Slider
                    value={[settings.topK]}
                    onValueChange={([value]) => updateSetting('topK', value)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Frequency Penalty */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Frequency Penalty</span>
                    <span className="text-muted-foreground">
                      {settings.frequencyPenalty}
                    </span>
                  </div>
                  <Slider
                    value={[settings.frequencyPenalty]}
                    onValueChange={([value]) => updateSetting('frequencyPenalty', value)}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Presence Penalty */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Presence Penalty</span>
                    <span className="text-muted-foreground">
                      {settings.presencePenalty}
                    </span>
                  </div>
                  <Slider
                    value={[settings.presencePenalty]}
                    onValueChange={([value]) => updateSetting('presencePenalty', value)}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="context" className="space-y-4 py-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Context Window */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Context Window</span>
                    <span className="text-muted-foreground">
                      {settings.contextWindow}
                    </span>
                  </div>
                  <Slider
                    value={[settings.contextWindow]}
                    onValueChange={([value]) => updateSetting('contextWindow', value)}
                    max={128000}
                    step={1000}
                    className="w-full"
                  />
                </div>

                {/* System Message */}
                <div className="space-y-2">
                  <label className="text-sm">System Message</label>
                  <Input
                    value={settings.systemMessage}
                    onChange={(e) => updateSetting('systemMessage', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Memory Settings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Memory</span>
                    <Switch
                      checked={settings.enableMemory}
                      onCheckedChange={(value) => updateSetting('enableMemory', value)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="system" className="space-y-4 py-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Seed */}
                <div className="space-y-2">
                  <label className="text-sm">Random Seed</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={settings.seed}
                      onChange={(e) => updateSetting('seed', parseInt(e.target.value))}
                      className="font-mono"
                    />
                    <Button variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Logging */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Logging</span>
                    <Switch
                      checked={settings.enableLogging}
                      onCheckedChange={(value) => updateSetting('enableLogging', value)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="network" className="space-y-4 py-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Timeout */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Request Timeout (ms)</span>
                    <span className="text-muted-foreground">
                      {settings.timeout}
                    </span>
                  </div>
                  <Slider
                    value={[settings.timeout]}
                    onValueChange={([value]) => updateSetting('timeout', value)}
                    max={30000}
                    step={1000}
                    className="w-full"
                  />
                </div>

                {/* Retry Strategy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-retry Failed Requests</span>
                    <Switch
                      checked={settings.enableRetry}
                      onCheckedChange={(value) => updateSetting('enableRetry', value)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <SheetFooter className="p-6 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedSettings;