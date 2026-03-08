import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RootState } from '@/lib/redux/store';
import { setPreference, GroqTtsVoice } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const groqVoices: GroqTtsVoice[] = [
    'Arista-PlayAI', 'Atlas-PlayAI', 'Basil-PlayAI', 'Briggs-PlayAI',
    'Calum-PlayAI', 'Celeste-PlayAI', 'Cheyenne-PlayAI', 'Chip-PlayAI',
    'Cillian-PlayAI', 'Deedee-PlayAI', 'Fritz-PlayAI', 'Gail-PlayAI',
    'Indigo-PlayAI', 'Mamaw-PlayAI', 'Mason-PlayAI', 'Mikail-PlayAI',
    'Mitch-PlayAI', 'Quinn-PlayAI', 'Thunder-PlayAI',
];

const TextToSpeechPreferences = () => {
    const dispatch = useDispatch();
    const ttsPreferences = useSelector((state: RootState) => state.userPreferences.textToSpeech);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'textToSpeech', preference, value: checked }));
    };
    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'textToSpeech', preference, value }));
    };

    return (
        <div>
            <div className={row}>
                <Label htmlFor="preferredVoice" className={rowLabel}>Voice (Groq PlayAI)</Label>
                <Select value={ttsPreferences.preferredVoice} onValueChange={handleSelectChange('preferredVoice')}>
                    <SelectTrigger id="preferredVoice" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {groqVoices.map(voice => (
                            <SelectItem key={voice} value={voice}>
                                {voice.replace('-PlayAI', '')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="autoPlay" className={rowLabel}>Auto Play</Label>
                <Switch id="autoPlay" checked={ttsPreferences.autoPlay} onCheckedChange={handleSwitchChange('autoPlay')} />
            </div>

            <div className={row}>
                <Label htmlFor="processMarkdown" className={rowLabel}>Process Markdown</Label>
                <Switch id="processMarkdown" checked={ttsPreferences.processMarkdown} onCheckedChange={handleSwitchChange('processMarkdown')} />
            </div>
        </div>
    );
};

export default TextToSpeechPreferences;
