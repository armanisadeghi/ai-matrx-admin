import React from 'react';
import GoogleAPIProvider from '@/providers/google-provider/GoogleApiProvider';

export function PublicProviders({ children }: { children: React.ReactNode }) {
    return (
        <GoogleAPIProvider>
                {children}
        </GoogleAPIProvider>
    );
}
