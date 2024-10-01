import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const CodingPreferences = () => {
    const dispatch = useDispatch();
    const codingPreferences = useSelector((state: RootState) => state.userPreferences.coding);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'coding', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'coding', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="preferredLanguage">Preferred Language</Label>
                <Select value={codingPreferences.preferredLanguage} onValueChange={handleSelectChange('preferredLanguage')}>
                    <SelectTrigger id="preferredLanguage">
                        <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredTheme">Preferred Theme</Label>
                <Select value={codingPreferences.preferredTheme} onValueChange={handleSelectChange('preferredTheme')}>
                    <SelectTrigger id="preferredTheme">
                        <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="gitIntegration">Git Integration</Label>
                <Switch
                    id="gitIntegration"
                    checked={codingPreferences.gitIntegration}
                    onCheckedChange={handleSwitchChange('gitIntegration')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="instancePreference">Instance Preference</Label>
                <Select value={codingPreferences.instancePreference} onValueChange={handleSelectChange('instancePreference')}>
                    <SelectTrigger id="instancePreference">
                        <SelectValue placeholder="Select an instance preference" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="cloud">Cloud</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="codeCompletion">Code Completion</Label>
                <Switch
                    id="codeCompletion"
                    checked={codingPreferences.codeCompletion}
                    onCheckedChange={handleSwitchChange('codeCompletion')}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="codeAnalysis">Code Analysis</Label>
                <Switch
                    id="codeAnalysis"
                    checked={codingPreferences.codeAnalysis}
                    onCheckedChange={handleSwitchChange('codeAnalysis')}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="codeFormatting">Code Formatting</Label>
                <Switch
                    id="codeFormatting"
                    checked={codingPreferences.codeFormatting}
                    onCheckedChange={handleSwitchChange('codeFormatting')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="aiActivityLevel">AI Activity Level</Label>
                <Select value={codingPreferences.aiActivityLevel} onValueChange={handleSelectChange('aiActivityLevel')}>
                    <SelectTrigger id="aiActivityLevel">
                        <SelectValue placeholder="Select AI activity level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="voiceAssistance">Voice Assistance</Label>
                <Switch
                    id="voiceAssistance"
                    checked={codingPreferences.voiceAssistance}
                    onCheckedChange={handleSwitchChange('voiceAssistance')}
                />
            </div>
        </div>
    );
};

export default CodingPreferences;
