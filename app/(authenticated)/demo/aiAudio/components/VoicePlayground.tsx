import React, { useState, useEffect } from 'react';
import { useAiAudio } from './AiVoicePage';
import useTextToSpeech from '@/hooks/useTextToSpeech';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';
import { listVoices } from '@/lib/cartesia/cartesiaUtils';
import { AiVoice } from "@/types/aiAudioTypes";
import { toast } from '@/components/ui/use-toast';
import { VoiceSpeed, AudioEncoding, Language, EmotionName, EmotionLevel, EmotionControl } from '@/lib/cartesia/cartesia.types';

const VoicePlayground: React.FC = () => {
    const { data, configs } = useAiAudio();
    const [text, setText] = useState("Hi. Welcome to the voice playground. My name is AI Matrx and I'm excited you decided to give the playground a try!");
    const [selectedVoice, setSelectedVoice] = useState<string>("");
    const [speed, setSpeed] = useState<VoiceSpeed>(VoiceSpeed.NORMAL);
    const [customSpeed, setCustomSpeed] = useState<number>(1);
    const [emotions, setEmotions] = useState<EmotionControl[]>([]);
    const [language, setLanguage] = useState<Language>(Language.EN);
    const [audioEncoding, setAudioEncoding] = useState<AudioEncoding>(AudioEncoding.PCM_S16LE);
    const [addTimestamps, setAddTimestamps] = useState(false);
    const [voices, setVoices] = useState<AiVoice[]>([]);
    const [loadingVoices, setLoadingVoices] = useState(false);

    const {
        buffer,
        play,
        pause,
        restart,
        stop,
        isPlaying,
        playbackStatus,
        bufferStatus,
        isWaiting,
        error,
    } = useTextToSpeech({
        text,
        apiKey: process.env.NEXT_PUBLIC_CARTESIA_API_KEY || '',
        voiceId: selectedVoice,
        speed: speed === VoiceSpeed.CUSTOM ? customSpeed : speed,
        emotions,
        language,
        audioEncoding,
        addTimestamps,
        modelId: language === Language.EN ? 'sonic-english' : 'sonic-multilingual',
    });

    useEffect(() => {
        console.log("VoicePlayground mounted");
        loadVoices();
        return () => {
            console.log("VoicePlayground unmounted");
            stop();
        };
    }, [stop]);

    const handlePlayClick = async () => {
        console.log("Play button clicked");
        try {
            await play();
        } catch (error) {
            console.error("Error in play:", error);
            toast({
                title: "Playback Error",
                description: `Failed to play audio: ${error instanceof Error ? error.message : String(error)}`,
                variant: "destructive",
            });
        }
    };

    const loadVoices = async () => {
        setLoadingVoices(true);
        try {
            const voicesData = await listVoices();
            setVoices(voicesData.map(({ id, name, description }) => ({ id, name, description })));
        } catch (error) {
            console.error("Error loading voices:", error);
            toast({
                title: "Error",
                description: "Failed to load voices. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoadingVoices(false);
        }
    };

    const handleEmotionChange = (emotion: EmotionName, value: number) => {
        const levelMap: Record<number, EmotionLevel> = {
            0: EmotionLevel.LOWEST,
            25: EmotionLevel.LOW,
            50: EmotionLevel.MEDIUM,
            75: EmotionLevel.HIGH,
            100: EmotionLevel.HIGHEST,
        };
        const newEmotionControl: EmotionControl = `${emotion}:${levelMap[value] || EmotionLevel.MEDIUM}`;
        setEmotions(prev => {
            const filteredEmotions = prev.filter(e => !e.startsWith(emotion));
            return [...filteredEmotions, newEmotionControl];
        });
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Voice Playground
                    <Button variant="outline" size="sm" onClick={loadVoices} disabled={loadingVoices}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Voices
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList>
                        <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="text-input">Text to Speak</Label>
                            <Input
                                id="text-input"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter text to speak..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="voice-select">Select Voice</Label>
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                                <SelectTrigger id="voice-select">
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {voices.map((voice) => (
                                        <SelectItem key={voice.id} value={voice.id}>
                                            {voice.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="language-select">Language</Label>
                            <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                                <SelectTrigger id="language-select">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(Language).map(([key, value]) => (
                                        <SelectItem key={key} value={value}>
                                            {key}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Speed</Label>
                            <Select value={speed} onValueChange={(value: VoiceSpeed) => setSpeed(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select speed" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(VoiceSpeed).map(([key, value]) => (
                                        <SelectItem key={key} value={value}>
                                            {key.charAt(0) + key.slice(1).toLowerCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {speed === VoiceSpeed.CUSTOM && (
                                <Slider
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                    value={[customSpeed]}
                                    onValueChange={([value]) => setCustomSpeed(value)}
                                />
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="advanced" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Emotions</Label>
                            {Object.values(EmotionName).map((emotion) => (
                                <div key={emotion} className="space-y-1">
                                    <Label>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</Label>
                                    <Slider
                                        min={0}
                                        max={100}
                                        step={25}
                                        value={[Object.keys(EmotionLevel).indexOf(EmotionLevel.MEDIUM) * 25]}
                                        onValueChange={([value]) => handleEmotionChange(emotion, value)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="encoding-select">Audio Encoding</Label>
                            <Select value={audioEncoding} onValueChange={(value: AudioEncoding) => setAudioEncoding(value)}>
                                <SelectTrigger id="encoding-select">
                                    <SelectValue placeholder="Select encoding" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(AudioEncoding).map(([key, value]) => (
                                        <SelectItem key={key} value={value}>
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="timestamps"
                                checked={addTimestamps}
                                onCheckedChange={setAddTimestamps}
                            />
                            <Label htmlFor="timestamps">Add Timestamps</Label>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex space-x-4">
                    {isWaiting ? (
                        <Button disabled>Buffering...</Button>
                    ) : isPlaying ? (
                        <Button onClick={pause}>
                            <Pause className="mr-2 h-4 w-4" /> Pause
                        </Button>
                    ) : (
                        <Button onClick={handlePlayClick}>
                            <Play className="mr-2 h-4 w-4" /> Play
                        </Button>
                    )}
                    <Button onClick={restart} disabled={isWaiting}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Restart
                    </Button>
                </div>

                <div className="text-sm">
                    <p>Status: {isWaiting ? bufferStatus : playbackStatus}</p>
                    <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
                    <p>Is Waiting: {isWaiting ? "Yes" : "No"}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default VoicePlayground;