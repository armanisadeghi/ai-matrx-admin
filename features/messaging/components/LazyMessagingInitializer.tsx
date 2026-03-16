'use client';

// LazyMessagingInitializer — Only mounts MessagingInitializer when the messaging
// sheet is opened for the first time. This avoids loading all conversations and
// subscribing to 3 Supabase Realtime channels until the user actually needs messaging.

import { useAppSelector } from '@/lib/redux/hooks';
import dynamic from 'next/dynamic';

const MessagingInitializer = dynamic(
    () => import('./MessagingInitializer').then((m) => m.MessagingInitializer),
    { ssr: false, loading: () => null }
);

export default function LazyMessagingInitializer() {
    // Gate: only mount the real initializer after the sheet has been opened at least once
    const hasBeenOpened = useAppSelector((state) => state.messaging.isOpen);
    const isAvailable = useAppSelector((state) => state.messaging.isAvailable);

    // Once available, stay mounted (so realtime subscriptions persist)
    // First trigger is when isOpen becomes true
    if (!hasBeenOpened && !isAvailable) return null;

    return <MessagingInitializer />;
}
