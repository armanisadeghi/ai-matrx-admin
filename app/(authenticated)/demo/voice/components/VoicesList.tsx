'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { listVoices } from '@/lib/cartesia/cartesiaUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { FullJsonViewer } from '@/components/ui/JsonComponents/JsonViewerComponent';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import VoiceModal from './VoiceModal';
import { useAiAudio } from "@/app/(authenticated)/demo/voice/components/AiVoicePage";
import { AiVoice } from "@/types/aiAudioTypes";

const VoicesList: React.FC = () => {
    const {
        loading,
        error,
        getOneData,
        setOneData,
        setLoading,
        setError,
    } = useAiAudio();

    const [selectedVoice, setSelectedVoice] = useState<AiVoice | null>(null);

    const availableVoices = getOneData('availableVoices') as AiVoice[] | undefined;
    console.log("VoicesList: Available voices:", availableVoices);

    const loadVoices = useCallback(async () => {
        console.log("loadVoices function called");
        setLoading(true);
        try {
            const voicesData = await listVoices();
            console.log("Fetched voices data:", voicesData);
            const filteredVoices = voicesData.map(({ id, name, description }) => ({
                id,
                name,
                description,
            }));
            console.log("Filtered voices:", filteredVoices);
            setOneData('availableVoices', filteredVoices);
        } catch (err) {
            console.error("Error in loadVoices:", err);
            setError('Failed to fetch voices.');
            toast({
                title: "Error",
                description: "Failed to fetch voices. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [setLoading, setOneData, setError]);

    useEffect(() => {
        console.log("VoicesList useEffect triggered. availableVoices:", availableVoices);
        if (!availableVoices || availableVoices.length < 3) {
            console.log("Fetching available voices");
            loadVoices();
        } else {
            console.log("Voices already loaded");
        }
    }, [availableVoices, loadVoices]);

    const handleCopyId = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        toast({
            title: "Voice ID Copied",
            description: "The voice ID has been copied to your clipboard.",
        });
    }, []);

    if (loading) {
        console.log("VoicesList is loading");
        return <div className="flex justify-center items-center h-full">
            <p className="text-primary">Loading voices...</p>
        </div>;
    }

    if (error) {
        console.log("VoicesList encountered an error:", error);
        return <div className="flex justify-center items-center h-full">
            <p className="text-red-500">{error}</p>
        </div>;
    }

    console.log("VoicesList rendering with availableVoices:", availableVoices);

    return (
        <TooltipProvider>
            <div className="space-y-8 p-4 min-h-screen">
                <div className="max-w-3xl mx-auto text-center space-y-4">
                    <h1 className="text-3xl font-bold text-foreground">Voice Data Management</h1>
                    <p className="text-lg text-muted-foreground">
                        Manage and explore the available voice profiles below.
                    </p>
                </div>

                <div className="flex justify-center mb-4">
                    <button
                        onClick={loadVoices}
                        className="py-2 px-4 rounded-md hover:bg-blend-color-burn"
                    >
                        Refresh Voices
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableVoices && availableVoices.map((voice: AiVoice) => (
                        <VoiceCard
                            key={voice.id}
                            voice={voice}
                            onCardClick={() => setSelectedVoice(voice)}
                            onCopyId={handleCopyId}
                        />
                    ))}
                </div>

                <FullJsonViewer data={availableVoices} title="All Voices Data" />

                {selectedVoice && (
                    <VoiceModal
                        voice={selectedVoice}
                        onClose={() => setSelectedVoice(null)}
                    />
                )}
            </div>
        </TooltipProvider>
    );
};

interface VoiceCardProps {
    voice: AiVoice;
    onCardClick: () => void;
    onCopyId: (id: string, e: React.MouseEvent) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = React.memo(({ voice, onCardClick, onCopyId }) => (
    <motion.div
        className="cursor-pointer h-full"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 100 }}
        onClick={onCardClick}
    >
        <Card className="bg-matrx-card-background shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl text-foreground">{voice.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                <p className="text-muted-foreground mb-4">{voice.description}</p>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <p
                            className="text-xs text-muted-foreground truncate cursor-pointer hover:text-primary"
                            onClick={(e) => onCopyId(voice.id, e)}
                        >
                            ID: {voice.id}
                        </p>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Click to copy ID</p>
                    </TooltipContent>
                </Tooltip>
            </CardContent>
        </Card>
    </motion.div>
));

VoiceCard.displayName = 'VoiceCard';

export default VoicesList;
