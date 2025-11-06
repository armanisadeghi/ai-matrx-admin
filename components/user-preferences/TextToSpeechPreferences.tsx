import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference, GroqTtsVoice } from '@/lib/redux/slices/userPreferencesSlice';

const TextToSpeechPreferences = () => {
    const dispatch = useDispatch();
    const ttsPreferences = useSelector((state: RootState) => state.userPreferences.textToSpeech);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'textToSpeech', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'textToSpeech', preference, value }));
    };

    const groqVoices: GroqTtsVoice[] = [
        'Arista-PlayAI',
        'Atlas-PlayAI',
        'Basil-PlayAI',
        'Briggs-PlayAI',
        'Calum-PlayAI',
        'Celeste-PlayAI',
        'Cheyenne-PlayAI',
        'Chip-PlayAI',
        'Cillian-PlayAI',
        'Deedee-PlayAI',
        'Fritz-PlayAI',
        'Gail-PlayAI',
        'Indigo-PlayAI',
        'Mamaw-PlayAI',
        'Mason-PlayAI',
        'Mikail-PlayAI',
        'Mitch-PlayAI',
        'Quinn-PlayAI',
        'Thunder-PlayAI',
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="preferredVoice">Preferred Voice (Groq PlayAI)</Label>
                <Select 
                    value={ttsPreferences.preferredVoice} 
                    onValueChange={handleSelectChange('preferredVoice')}
                >
                    <SelectTrigger id="preferredVoice">
                        <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {groqVoices.map((voice) => (
                            <SelectItem key={voice} value={voice}>
                                {voice.replace('-PlayAI', '')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Voice used for Groq PlayAI text-to-speech
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="autoPlay">Auto Play</Label>
                    <p className="text-sm text-muted-foreground">Automatically play generated audio</p>
                </div>
                <Switch
                    id="autoPlay"
                    checked={ttsPreferences.autoPlay}
                    onCheckedChange={handleSwitchChange('autoPlay')}
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="processMarkdown">Process Markdown</Label>
                    <p className="text-sm text-muted-foreground">Convert markdown before speaking</p>
                </div>
                <Switch
                    id="processMarkdown"
                    checked={ttsPreferences.processMarkdown}
                    onCheckedChange={handleSwitchChange('processMarkdown')}
                />
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    These settings control Groq PlayAI text-to-speech functionality, which is separate from the 
                    Cartesia voice preferences. Groq TTS is used for specific features like chat message playback.
                </p>
            </div>
        </div>
    );
};

export default TextToSpeechPreferences;

