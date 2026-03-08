import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const CodingPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.coding);
    const handleSwitch = (preference: string) => (checked: boolean) => dispatch(setPreference({ module: 'coding', preference, value: checked }));
    const handleSelect = (preference: string) => (value: string) => dispatch(setPreference({ module: 'coding', preference, value }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="preferredLanguage" className={rowLabel}>Language</Label>
                <Select value={prefs.preferredLanguage} onValueChange={handleSelect('preferredLanguage')}>
                    <SelectTrigger id="preferredLanguage" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="preferredTheme" className={rowLabel}>Editor Theme</Label>
                <Select value={prefs.preferredTheme} onValueChange={handleSelect('preferredTheme')}>
                    <SelectTrigger id="preferredTheme" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="instancePreference" className={rowLabel}>Environment</Label>
                <Select value={prefs.instancePreference} onValueChange={handleSelect('instancePreference')}>
                    <SelectTrigger id="instancePreference" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="cloud">Cloud</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="aiActivityLevel" className={rowLabel}>AI Activity</Label>
                <Select value={prefs.aiActivityLevel} onValueChange={handleSelect('aiActivityLevel')}>
                    <SelectTrigger id="aiActivityLevel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="gitIntegration" className={rowLabel}>Git Integration</Label>
                <Switch id="gitIntegration" checked={prefs.gitIntegration} onCheckedChange={handleSwitch('gitIntegration')} />
            </div>
            <div className={row}>
                <Label htmlFor="codeCompletion" className={rowLabel}>Code Completion</Label>
                <Switch id="codeCompletion" checked={prefs.codeCompletion} onCheckedChange={handleSwitch('codeCompletion')} />
            </div>
            <div className={row}>
                <Label htmlFor="codeAnalysis" className={rowLabel}>Code Analysis</Label>
                <Switch id="codeAnalysis" checked={prefs.codeAnalysis} onCheckedChange={handleSwitch('codeAnalysis')} />
            </div>
            <div className={row}>
                <Label htmlFor="codeFormatting" className={rowLabel}>Code Formatting</Label>
                <Switch id="codeFormatting" checked={prefs.codeFormatting} onCheckedChange={handleSwitch('codeFormatting')} />
            </div>
            <div className={row}>
                <Label htmlFor="voiceAssistance" className={rowLabel}>Voice Assistance</Label>
                <Switch id="voiceAssistance" checked={prefs.voiceAssistance} onCheckedChange={handleSwitch('voiceAssistance')} />
            </div>
        </div>
    );
};

export default CodingPreferences;
