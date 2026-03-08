import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import { availableVoices } from '@/lib/cartesia/voices';
import { ExternalLink, Mic2 } from 'lucide-react';
import Link from 'next/link';
import { VoiceSelectionModal } from '@/features/audio/voice/components/VoiceSelectionModal';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const VoicePreferences = () => {
    const dispatch = useDispatch();
    const voicePreferences = useSelector((state: RootState) => state.userPreferences.voice);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

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
        <div>
            {/* Voice picker row */}
            <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border/40 text-left hover:bg-muted/40 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Mic2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium pointer-events-none">Voice</Label>
                </span>
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                    {selectedVoice?.name || 'Select…'}
                </span>
            </button>

            <VoiceSelectionModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                voices={availableVoices.map(v => ({ id: v.id, name: v.name, description: v.description }))}
                selectedVoiceId={voicePreferences.voice}
                onSelectVoice={handleVoiceSelect}
                title="Select Your Voice"
            />

            <div className={row}>
                <Label htmlFor="language" className={rowLabel}>Language</Label>
                <Select value={voicePreferences.language} onValueChange={handleSelectChange('language')}>
                    <SelectTrigger id="language" className="w-36 h-8 text-xs">
                        <SelectValue />
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

            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="speed" className={rowLabel}>Speech Speed</Label>
                    <span className="text-xs text-muted-foreground">{getSpeedLabel(voicePreferences.speed)}</span>
                </div>
                <Slider id="speed" min={-1} max={1} step={0.1} value={[voicePreferences.speed]} onValueChange={handleSpeedChange} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slower</span><span>Normal</span><span>Faster</span>
                </div>
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="emotion" className={rowLabel}>Emotion / Tone</Label>
                <Input id="emotion" type="text" value={voicePreferences.emotion} onChange={handleInputChange('emotion')} placeholder="e.g., cheerful, calm" className="h-9 text-sm" />
            </div>

            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="wakeWord" className={rowLabel}>Wake Word</Label>
                <Input id="wakeWord" type="text" value={voicePreferences.wakeWord} onChange={handleInputChange('wakeWord')} placeholder="e.g., Hey Matrix" className="h-9 text-sm" />
            </div>

            <div className={row}>
                <Label htmlFor="microphone" className={rowLabel}>Enable Microphone</Label>
                <Switch id="microphone" checked={voicePreferences.microphone} onCheckedChange={handleSwitchChange('microphone')} />
            </div>

            <div className={row}>
                <Label htmlFor="speaker" className={rowLabel}>Enable Speaker</Label>
                <Switch id="speaker" checked={voicePreferences.speaker} onCheckedChange={handleSwitchChange('speaker')} />
            </div>

            <div className="px-4 py-3.5">
                <Link href="/demo/voice/voice-manager" passHref>
                    <Button variant="outline" size="sm" className="gap-1.5 w-full text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voice Playground
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default VoicePreferences;
