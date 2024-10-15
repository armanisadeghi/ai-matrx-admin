import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { WebPlayer } from '@cartesia/cartesia-js';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import cartesia from '@/lib/cartesia/client';
import { availableVoices } from '@/lib/cartesia/voices';
import { EmotionName, EmotionLevel, VoiceSpeed, AudioEncoding, Language } from '@/lib/cartesia/cartesia.types';

interface TextToSpeechPlayerProps {
    text: string;
    autoPlay?: boolean;
    onPlaybackEnd?: () => void;
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ text, autoPlay = false, onPlaybackEnd }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState('');
    const [editableText, setEditableText] = useState(text);
    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const sourceRef = useRef<any>(null);

    const [selectedVoice, setSelectedVoice] = useState<string>("156fb8d2-335b-4950-9cb3-a2d33befec77");
    const [selectedEmotion, setSelectedEmotion] = useState<EmotionName>(EmotionName.POSITIVITY);
    const [selectedEmotionLevel, setSelectedEmotionLevel] = useState<EmotionLevel | "medium">("medium");
    const [selectedSpeed, setSelectedSpeed] = useState<VoiceSpeed>(VoiceSpeed.NORMAL);
    const [selectedEncoding, setSelectedEncoding] = useState<AudioEncoding>(AudioEncoding.PCM_F32LE);
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.EN);

    useEffect(() => {
        websocketRef.current = cartesia.tts.websocket({
            container: "raw",
            encoding: selectedEncoding,
            sampleRate: 44100
        });

        playerRef.current = new WebPlayer({ bufferDuration: 1 });

        if (autoPlay) {
            handlePlay();
        }

        return () => {
            websocketRef.current?.disconnect();
        };
    }, [autoPlay, selectedEncoding]);

    const handlePlay = useCallback(async () => {
        if (!websocketRef.current || !playerRef.current) {
            console.error("Cartesia WebSocket/Player is not initialized");
            return;
        }

        const emotionControl = selectedEmotionLevel !== "medium"
            ? `${selectedEmotion}:${selectedEmotionLevel}`
            : selectedEmotion;

        try {
            setIsPlaying(true);
            setPlaybackStatus('Connecting...');
            await websocketRef.current.connect();

            setPlaybackStatus('Buffering audio...');
            const response = await websocketRef.current.send({
                model_id: "sonic-english",
                voice: {
                    mode: "id",
                    id: selectedVoice,
                    __experimental_controls: {
                        "speed": selectedSpeed,
                        "emotion": [emotionControl],
                    },
                },
                transcript: editableText
            });

            sourceRef.current = response.source;

            setPlaybackStatus('Playing audio...');
            await playerRef.current.play(sourceRef.current);
            setPlaybackStatus('Playback finished');
        } catch (error) {
            console.error("Error playing audio:", error);
            setPlaybackStatus('Error occurred');
        } finally {
            setIsPlaying(false);
            onPlaybackEnd?.();
        }
    }, [editableText, onPlaybackEnd, selectedVoice, selectedEmotion, selectedEmotionLevel, selectedSpeed]);

    const handlePause = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.pause();
            setIsPlaying(false);
            setPlaybackStatus('Paused');
        }
    }, []);

    const handleResume = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.resume();
            setIsPlaying(true);
            setPlaybackStatus('Playing audio...');
        }
    }, []);

    const handleReplay = useCallback(async () => {
        if (playerRef.current && sourceRef.current) {
            setIsPlaying(true);
            setPlaybackStatus('Playing audio...');
            await playerRef.current.play(sourceRef.current);
            setPlaybackStatus('Playback finished');
            setIsPlaying(false);
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                placeholder="Enter text to speak..."
                className="w-96 h-auto min-h-[10rem] max-w-3xl resize-none mb-4"
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
                <Select value={selectedVoice} onValueChange={(value: string) => setSelectedVoice(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableVoices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                                {voice.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedEmotion} onValueChange={(value: EmotionName) => setSelectedEmotion(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select emotion" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(EmotionName).map((emotion) => (
                            <SelectItem key={emotion} value={emotion}>
                                {emotion}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedEmotionLevel}
                    onValueChange={(value: EmotionLevel | "medium") => setSelectedEmotionLevel(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="medium">Medium</SelectItem>
                        {Object.values(EmotionLevel).filter(level => level !== "").map((level) => (
                            <SelectItem key={level} value={level}>
                                {level}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedSpeed} onValueChange={(value: VoiceSpeed) => setSelectedSpeed(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(VoiceSpeed).map((speed) => (
                            <SelectItem key={speed} value={speed}>
                                {speed}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedEncoding} onValueChange={(value: AudioEncoding) => setSelectedEncoding(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select encoding" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(AudioEncoding).map((encoding) => (
                            <SelectItem key={encoding} value={encoding}>
                                {encoding}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedLanguage} onValueChange={(value: Language) => setSelectedLanguage(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(Language).map((language) => (
                            <SelectItem key={language} value={language}>
                                {language}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex space-x-4 mt-4">
                <Button onClick={handlePlay} disabled={isPlaying}>
                    <Play className="mr-2 h-4 w-4"/> Play
                </Button>

                <Button onClick={handlePause} disabled={!isPlaying}>
                    <Pause className="mr-2 h-4 w-4"/> Pause
                </Button>

                <Button onClick={handleResume} disabled={isPlaying}>
                    <Play className="mr-2 h-4 w-4"/> Resume
                </Button>

                <Button onClick={handleReplay}>
                    <RotateCcw className="mr-2 h-4 w-4"/> Replay
                </Button>
            </div>

            <div className="mt-2 text-sm">
                Status: {playbackStatus}
            </div>
        </div>
    );
};

export default TextToSpeechPlayer;
