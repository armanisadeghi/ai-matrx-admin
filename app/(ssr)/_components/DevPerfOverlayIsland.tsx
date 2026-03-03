'use client';

import dynamic from 'next/dynamic';

// Dev-only island — zero production bundle cost.
// dynamic() with ssr:false must live in a Client Component.
const DevPerfOverlay = process.env.NODE_ENV === 'development'
    ? dynamic(() => import('./DevPerfOverlay'), { ssr: false })
    : () => null;

export default function DevPerfOverlayIsland() {
    return <DevPerfOverlay />;
}
