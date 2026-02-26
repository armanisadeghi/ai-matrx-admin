import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

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
        <div>
            <div className={row}>
                <Label htmlFor="alwaysActive" className={rowLabel}>Always Active</Label>
                <Switch id="alwaysActive" checked={assistantPreferences.alwaysActive} onCheckedChange={handleSwitchChange('alwaysActive')} />
            </div>

            <div className={row}>
                <Label htmlFor="alwaysWatching" className={rowLabel}>Always Watching</Label>
                <Switch id="alwaysWatching" checked={assistantPreferences.alwaysWatching} onCheckedChange={handleSwitchChange('alwaysWatching')} />
            </div>

            <div className={row}>
                <Label htmlFor="useAudio" className={rowLabel}>Use Audio</Label>
                <Switch id="useAudio" checked={assistantPreferences.useAudio} onCheckedChange={handleSwitchChange('useAudio')} />
            </div>

            <div className={row}>
                <Label htmlFor="isPersonal" className={rowLabel}>Personal Mode</Label>
                <Switch id="isPersonal" checked={assistantPreferences.isPersonal} onCheckedChange={handleSwitchChange('isPersonal')} />
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <Label htmlFor="name" className={rowLabel}>Assistant Name</Label>
                <Input id="name" type="text" value={assistantPreferences.name} onChange={handleInputChange('name')} placeholder="e.g., Assistant, Jarvis…" className="h-9 text-sm" />
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="memoryLevel" className={rowLabel}>Memory Level</Label>
                    <span className="text-sm text-muted-foreground tabular-nums">{assistantPreferences.memoryLevel}</span>
                </div>
                <Slider id="memoryLevel" min={0} max={10} step={1} value={[assistantPreferences.memoryLevel]} onValueChange={handleMemoryLevelChange} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimal</span><span>Moderate</span><span>Maximum</span>
                </div>
            </div>

            <div className={row}>
                <Label htmlFor="preferredProvider" className={rowLabel}>Provider</Label>
                <Select value={assistantPreferences.preferredProvider} onValueChange={handleSelectChange('preferredProvider')}>
                    <SelectTrigger id="preferredProvider" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <Label htmlFor="preferredModel" className={rowLabel}>Preferred Model</Label>
                <Input id="preferredModel" type="text" value={assistantPreferences.preferredModel} onChange={handleInputChange('preferredModel')} placeholder="e.g., gpt-4, claude-3…" className="h-9 text-sm" />
            </div>
        </div>
    );
};

export default AssistantPreferences;
