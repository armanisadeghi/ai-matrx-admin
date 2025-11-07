import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import { availableVoices } from '@/lib/cartesia/voices';
import { ExternalLink, Mic2 } from 'lucide-react';
import Link from 'next/link';
import { VoiceSelectionModal } from '@/features/audio/voice/components/VoiceSelectionModal';

const VoicePreferences = () => {
    const dispatch = useDispatch();
    const voicePreferences = useSelector((state: RootState) => state.userPreferences.voice);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

    // Get selected voice name
    const selectedVoice = useMemo(() => {
        return availableVoices.find(v => v.id === voicePreferences.voice);
    }, [voicePreferences.voice]);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'voice', preference, value: checked }));
    };

    const handleVoiceSelect = (voiceId: string) => {
        dispatch(setPreference({ module: 'voice', preference: 'voice', value: voiceId }));
        setIsVoiceModalOpen(false);
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'voice', preference, value }));
    };

    const handleInputChange = (preference: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPreference({ module: 'voice', preference, value: e.target.value }));
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
                <Button
                    id="voice"
                    variant="outline"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="w-full justify-between h-auto py-3"
                >
                    <div className="flex items-center gap-3">
                        <Mic2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col items-start">
                            <span className="font-medium text-sm">
                                {selectedVoice?.name || 'Select a voice'}
                            </span>
                            {selectedVoice?.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                    {selectedVoice.description}
                                </span>
                            )}
                        </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Button>
                <p className="text-sm text-muted-foreground">
                    Browse, test, and select a voice for text-to-speech playback.
                </p>
            </div>

            {/* Voice Selection Modal */}
            <VoiceSelectionModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                voices={availableVoices.map(v => ({ id: v.id, name: v.name, description: v.description }))}
                selectedVoiceId={voicePreferences.voice}
                onSelectVoice={handleVoiceSelect}
                title="Select Your Voice"
            />

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

            <div className="space-y-2">
                <Label htmlFor="emotion">Emotion/Tone</Label>
                <Input
                    id="emotion"
                    type="text"
                    value={voicePreferences.emotion}
                    onChange={handleInputChange('emotion')}
                    placeholder="e.g., cheerful, calm, neutral"
                />
                <p className="text-sm text-muted-foreground">
                    Optional emotion or tone to apply to the voice
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="wakeWord">Wake Word</Label>
                <Input
                    id="wakeWord"
                    type="text"
                    value={voicePreferences.wakeWord}
                    onChange={handleInputChange('wakeWord')}
                    placeholder="e.g., Hey Matrix"
                />
                <p className="text-sm text-muted-foreground">
                    Phrase to activate voice assistant
                </p>
            </div>

            <div className="grid gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="microphone">Enable Microphone</Label>
                        <p className="text-sm text-muted-foreground">Allow voice input</p>
                    </div>
                    <Switch
                        id="microphone"
                        checked={voicePreferences.microphone}
                        onCheckedChange={handleSwitchChange('microphone')}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="speaker">Enable Speaker</Label>
                        <p className="text-sm text-muted-foreground">Allow voice output</p>
                    </div>
                    <Switch
                        id="speaker"
                        checked={voicePreferences.speaker}
                        onCheckedChange={handleSwitchChange('speaker')}
                    />
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
