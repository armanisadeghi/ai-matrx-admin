import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const AssistantPreferences = () => {
    const dispatch = useDispatch();
    const assistantPreferences = useSelector((state: RootState) => state.userPreferences.assistant);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'assistant', preference, value: checked }));
    };

    const handleInputChange = (preference: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPreference({ module: 'assistant', preference, value: e.target.value }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'assistant', preference, value }));
    };

    const handleMemoryLevelChange = (value: number[]) => {
        dispatch(setPreference({ module: 'assistant', preference: 'memoryLevel', value: value[0] }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="alwaysActive">Always Active</Label>
                        <p className="text-sm text-muted-foreground">Keep assistant always active and ready</p>
                    </div>
                    <Switch
                        id="alwaysActive"
                        checked={assistantPreferences.alwaysActive}
                        onCheckedChange={handleSwitchChange('alwaysActive')}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="alwaysWatching">Always Watching</Label>
                        <p className="text-sm text-muted-foreground">Monitor context and provide proactive suggestions</p>
                    </div>
                    <Switch
                        id="alwaysWatching"
                        checked={assistantPreferences.alwaysWatching}
                        onCheckedChange={handleSwitchChange('alwaysWatching')}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="useAudio">Use Audio</Label>
                        <p className="text-sm text-muted-foreground">Enable audio input/output for assistant</p>
                    </div>
                    <Switch
                        id="useAudio"
                        checked={assistantPreferences.useAudio}
                        onCheckedChange={handleSwitchChange('useAudio')}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="isPersonal">Personal Mode</Label>
                        <p className="text-sm text-muted-foreground">Adapt responses to your personal style</p>
                    </div>
                    <Switch
                        id="isPersonal"
                        checked={assistantPreferences.isPersonal}
                        onCheckedChange={handleSwitchChange('isPersonal')}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Assistant Name</Label>
                <Input
                    id="name"
                    type="text"
                    value={assistantPreferences.name}
                    onChange={handleInputChange('name')}
                    placeholder="e.g., Assistant, Jarvis, etc."
                />
                <p className="text-sm text-muted-foreground">
                    Customize what you call your assistant
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="memoryLevel">Memory Level</Label>
                    <span className="text-sm text-muted-foreground">
                        {assistantPreferences.memoryLevel}
                    </span>
                </div>
                <Slider
                    id="memoryLevel"
                    min={0}
                    max={10}
                    step={1}
                    value={[assistantPreferences.memoryLevel]}
                    onValueChange={handleMemoryLevelChange}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimal</span>
                    <span>Moderate</span>
                    <span>Maximum</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    How much context and history the assistant should remember
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredProvider">Preferred Provider</Label>
                <Select 
                    value={assistantPreferences.preferredProvider} 
                    onValueChange={handleSelectChange('preferredProvider')}
                >
                    <SelectTrigger id="preferredProvider">
                        <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default AI provider for assistant responses
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredModel">Preferred Model</Label>
                <Input
                    id="preferredModel"
                    type="text"
                    value={assistantPreferences.preferredModel}
                    onChange={handleInputChange('preferredModel')}
                    placeholder="e.g., gpt-4, claude-3, etc."
                />
                <p className="text-sm text-muted-foreground">
                    Specific model to use (if supported by provider)
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    These settings control how your AI assistant behaves and interacts with you throughout the application.
                </p>
            </div>
        </div>
    );
};

export default AssistantPreferences;
