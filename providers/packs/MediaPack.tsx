'use client';

// MediaPack — Provider pack for routes with audio/image/video features.
// Wraps children with AudioModalProvider, SelectedImagesProvider, and GoogleAPIProvider.

import { AudioModalProvider } from '@/providers/AudioModalProvider';
import { SelectedImagesProvider } from '@/components/image/context/SelectedImagesProvider';
import GoogleAPIProvider from '@/providers/google-provider/GoogleApiProvider';

interface MediaPackProps {
    children: React.ReactNode;
}

export function MediaPack({ children }: MediaPackProps) {
    return (
        <AudioModalProvider>
            <GoogleAPIProvider>
                <SelectedImagesProvider>
                    {children}
                </SelectedImagesProvider>
            </GoogleAPIProvider>
        </AudioModalProvider>
    );
}
