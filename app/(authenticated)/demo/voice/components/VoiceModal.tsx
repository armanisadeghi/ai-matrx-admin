// app/(authenticated)/demo/voice/components/VoiceModal.tsx
'use client';


import React from 'react';
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

interface VoiceModalProps {
    voice: any;
    onClose: () => void;
}

const VoiceModal: React.FC<VoiceModalProps> = ({ voice, onClose }) => {
    if (!voice) return null;

    return (
        <Credenza open={!!voice} onOpenChange={onClose}>
            <CredenzaContent className="sm:max-w-[600px]">
                <CredenzaHeader>
                    <CredenzaTitle className="text-2xl font-bold">{voice.name}</CredenzaTitle>
                    <CredenzaDescription>AI Voice Profile</CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Image
                            src="/images/ai-voice-avatar.jpg"
                            alt={voice.name}
                            width={100}
                            height={100}
                            className="rounded-full"
                        />
                        <div>
                            <h3 className="text-lg font-semibold">{voice.name}</h3>
                            <p className="text-sm text-muted-foreground">{voice.description}</p>
                        </div>
                    </div>
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
                        <Button variant="outline" onClick={() => console.log("Use this voice")}>
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
                    <Image
                        src="https://source.unsplash.com/random/600x200/?audio,voice,ai"
                        alt="AI Voice Illustration"
                        width={600}
                        height={200}
                        className="rounded-lg"
                    />
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default VoiceModal;
