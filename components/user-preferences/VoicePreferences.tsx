import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const VoicePreferences = () => {
    const dispatch = useDispatch();
    const voicePreferences = useSelector((state: RootState) => state.userPreferences.voice);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'voice', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'voice', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="voice">Voice</Label>
                <Select value={voicePreferences.voice} onValueChange={handleSelectChange('voice')}>
                    <SelectTrigger id="voice">
                        <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="voice1">Voice 1</SelectItem>
                        <SelectItem value="voice2">Voice 2</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={voicePreferences.language} onValueChange={handleSelectChange('language')}>
                    <SelectTrigger id="language">
                        <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* Add more controls such as Speed, Emotion, Microphone, etc. */}
        </div>
    );
};

export default VoicePreferences;
