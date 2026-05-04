'use client';

// LazyMessagingInitializer — Mounts MessagingInitializer as soon as a user is
// authenticated so the avatar-dropdown unread badge is accurate from first
// paint. Previously gated on the sheet being opened, which left the badge
// stuck at 0 until the user clicked the icon.

import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/selectors/userSelectors';
import dynamic from 'next/dynamic';

const MessagingInitializer = dynamic(
    () => import('./MessagingInitializer').then((m) => m.MessagingInitializer),
    { ssr: false, loading: () => null }
);

export default function LazyMessagingInitializer() {
    const userId = useAppSelector(selectUser)?.id;
    if (!userId) return null;
    return <MessagingInitializer />;
}
