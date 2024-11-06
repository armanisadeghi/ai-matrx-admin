// providers/SocketProvider.tsx

'use client';

import React from 'react';
import { useInitializeSocket } from '@/lib/redux/socket/useInitializeSocket';

export function SocketProvider({ children }: { children: React.ReactNode }) {
    useInitializeSocket();
    return <>{children}</>;
}
