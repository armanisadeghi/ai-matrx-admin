import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save,
  Upload,
  Trash2,
  Star,
  StarOff,
  MoreVertical,
  Plus,
  Settings,
  Calendar,
  Edit2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SettingsPreset {
  id: string;
  name: string;
  description?: string;
  settings: Record<string, any>;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: Record<string, any>;
  onLoadSettings: (settings: Record<string, any>) => void;
}

const SettingsManager = ({ 
  isOpen, 
  onClose, 
  currentSettings,
  onLoadSettings 
}: SettingsManagerProps) => {
  const [activeTab, setActiveTab] = React.useState('load');
  const [newPresetName, setNewPresetName] = React.useState('');
  const [newPresetDesc, setNewPresetDesc] = React.useState('');
  const [presets, setPresets] = React.useState<SettingsPreset[]>([
    {
      id: '1',
      name: 'Default Settings',
      description: 'Standard configuration for general use',
      settings: {},
      isFavorite: true,
      createdAt: '2024-03-27T10:00:00Z',
      updatedAt: '2024-03-27T10:00:00Z'
    },
    {
      id: '2',
      name: 'Creative Writing',
      description: 'High temperature, more exploratory settings',
      settings: {},
      isFavorite: true,
      createdAt: '2024-03-26T15:30:00Z',
      updatedAt: '2024-03-26T15:30:00Z'
    }
  ]);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: SettingsPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      description: newPresetDesc,
      settings: currentSettings,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPresets([...presets, newPreset]);
    setNewPresetName('');
    setNewPresetDesc('');
  };

  const toggleFavorite = (presetId: string) => {
    setPresets(presets.map(preset => 
      preset.id === presetId 
        ? { ...preset, isFavorite: !preset.isFavorite }
        : preset
    ));
  };

  const deletePreset = (presetId: string) => {
    setPresets(presets.filter(preset => preset.id !== presetId));
  };

  const PresetCard = ({ preset }: { preset: SettingsPreset }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-elevation1 rounded-lg p-3 space-y-2"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h4 className="font-medium text-sm">{preset.name}</h4>
          {preset.description && (
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleFavorite(preset.id)}
          >
            {preset.isFavorite ? (
              <Star className="h-4 w-4 text-warning" fill="currentColor" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onLoadSettings(preset.settings)}>
                <Settings className="h-4 w-4 mr-2" />
                Load Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => deletePreset(preset.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>
          Updated {new Date(preset.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <DialogTitle>Settings Manager</DialogTitle>
          </div>
          <DialogDescription>Save and load your configuration presets</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="load" className="gap-2">
              <Upload className="h-4 w-4" />
              Load Preset
            </TabsTrigger>
            <TabsTrigger value="save" className="gap-2">
              <Save className="h-4 w-4" />
              Save New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="load" className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {presets.map(preset => (
                    <PresetCard key={preset.id} preset={preset} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="save" className="py-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preset Name</label>
                <Input
                  placeholder="Enter preset name..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="Add a description..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === 'save' && (
            <Button onClick={handleSavePreset} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Preset
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsManager;