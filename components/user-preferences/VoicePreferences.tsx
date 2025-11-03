import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import { availableVoices } from '@/lib/cartesia/voices';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

const VoicePreferences = () => {
    const dispatch = useDispatch();
    const voicePreferences = useSelector((state: RootState) => state.userPreferences.voice);

    // Sort voices alphabetically and get popular ones
    const sortedVoices = useMemo(() => {
        return [...availableVoices].sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const popularVoices = useMemo(() => {
        const popularIds = [
            "156fb8d2-335b-4950-9cb3-a2d33befec77", // Default
            "573e3144-a684-4e72-ac2b-9b2063a50b53", // Teacher Lady
            "bd9120b6-7761-47a6-a446-77ca49132781", // Tutorial Man
            "79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e", // Nonfiction Man
        ];
        return availableVoices.filter(v => popularIds.includes(v.id));
    }, []);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'voice', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'voice', preference, value }));
    };

    const handleSpeedChange = (value: number[]) => {
        dispatch(setPreference({ module: 'voice', preference: 'speed', value: value[0] }));
    };

    const getSpeedLabel = (speed: number) => {
        if (speed < -0.5) return 'Very Slow';
        if (speed < 0) return 'Slow';
        if (speed === 0) return 'Normal';
        if (speed <= 0.5) return 'Fast';
        return 'Very Fast';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Voice & Speech Settings</h3>
                <Link href="/demo/voice/voice-manager" passHref>
                    <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Voice Playground
                    </Button>
                </Link>
            </div>

            <div className="space-y-2">
                <Label htmlFor="voice">
                    Voice
                    <span className="text-sm text-muted-foreground ml-2">
                        (Cartesia TTS)
                    </span>
                </Label>
                <Select 
                    value={voicePreferences.voice} 
                    onValueChange={handleSelectChange('voice')}
                >
                    <SelectTrigger id="voice">
                        <SelectValue placeholder="Select a voice">
                            {voicePreferences.voice 
                                ? availableVoices.find(v => v.id === voicePreferences.voice)?.name || 'Unknown Voice'
                                : 'Select a voice'
                            }
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {/* Popular Voices */}
                        {popularVoices.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Popular Voices
                                </div>
                                {popularVoices.map((voice) => (
                                    <SelectItem key={voice.id} value={voice.id}>
                                        {voice.name}
                                        {voice.description && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                                - {voice.description.slice(0, 50)}...
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                                    All Voices
                                </div>
                            </>
                        )}
                        
                        {/* All Voices */}
                        {sortedVoices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                                {voice.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Choose a voice for text-to-speech playback. Visit the Voice Playground to test voices.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={voicePreferences.language} onValueChange={handleSelectChange('language')}>
                    <SelectTrigger id="language">
                        <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="pl">Polish</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="sv">Swedish</SelectItem>
                        <SelectItem value="tr">Turkish</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="speed">Speech Speed</Label>
                    <span className="text-sm text-muted-foreground">
                        {getSpeedLabel(voicePreferences.speed)}
                    </span>
                </div>
                <Slider
                    id="speed"
                    min={-1}
                    max={1}
                    step={0.1}
                    value={[voicePreferences.speed]}
                    onValueChange={handleSpeedChange}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                </div>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    These settings apply to all text-to-speech features throughout the application, 
                    including message playback, audio testing, and more.
                </p>
            </div>
        </div>
    );
};

export default VoicePreferences;
