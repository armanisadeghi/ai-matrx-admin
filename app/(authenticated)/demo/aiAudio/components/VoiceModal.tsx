// app/(authenticated)/demo/aiAudio/components/VoiceModal.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import {
    Credenza,
    CredenzaContent,
    CredenzaHeader,
    CredenzaTitle,
    CredenzaDescription,
    CredenzaBody,
} from "@/components/ui/added-ui/credenza-modal/credenza";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import ImageLoader from './ImageLoader';
import { useUnsplashGallery } from '../../images/hooks/useUnsplashGallery';

interface VoiceModalProps {
    voice: any;
    onClose: () => void;
}

const VoiceModal: React.FC<VoiceModalProps> = ({ voice, onClose }) => {
    const { handleAdvancedSearch, photos, loading } = useUnsplashGallery();
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (voice && voice.name) {
            console.log(`Searching for voice image: "${voice.name}"`)
            handleAdvancedSearch(`${voice.name} person`, { orientation: 'landscape' });
        }
    }, [voice, handleAdvancedSearch]);

    useEffect(() => {
        console.log('Photos updated:', photos)
        if (photos.length > 0) {
            setImageUrl(photos[0].urls.regular);
        }
    }, [photos]);

    if (!voice) return null;

    return (
        <Credenza open={!!voice} onOpenChange={onClose}>
            <CredenzaContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <div className="relative">
                    <Suspense fallback={<ImageLoader />}>
                        {imageUrl && (
                            <div className="relative h-[200px] w-full">
                                <Image
                                    src={imageUrl}
                                    alt={`AI Voice Illustration for ${voice.name}`}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className="rounded-t-lg"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background opacity-90" />
                            </div>
                        )}
                    </Suspense>
                    <div className="absolute bottom-4 left-4 right-4 text-foreground">
                        <h2 className="text-2xl font-bold">{voice.name}</h2>
                        <p className="text-sm opacity-80">{voice.description}</p>
                    </div>
                </div>
                <CredenzaBody className="space-y-6 pt-4">
                    <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Voice Details</h4>
                        <p><strong>ID:</strong> <Badge variant="outline">{voice.id}</Badge></p>
                        <p><strong>Type:</strong> AI-generated</p>
                        <p><strong>Language:</strong> English (US)</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <Button onClick={() => console.log("Play sample")}>
                            Play Sample
                        </Button>
                        <Button variant="outline" onClick={() => console.log("Use this aiAudio")}>
                            Use This Voice
                        </Button>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Voice Characteristics</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Badge>Natural</Badge>
                            <Badge>Clear</Badge>
                            <Badge>Expressive</Badge>
                            <Badge>Versatile</Badge>
                        </div>
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default VoiceModal;
