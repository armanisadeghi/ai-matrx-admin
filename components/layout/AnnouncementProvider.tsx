'use client';

import React, { useEffect, useState } from 'react';
import { getActiveAnnouncements } from '@/actions/feedback.actions';
import { SystemAnnouncement } from '@/types/feedback.types';
import SystemAnnouncementModal from './SystemAnnouncementModal';
import { useAppSelector } from '@/lib/redux/hooks';

export default function AnnouncementProvider() {
    const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
    const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
    const viewedAnnouncements = useAppSelector(state => state.userPreferences.system.viewedAnnouncements);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const result = await getActiveAnnouncements();
            if (result.success && result.data) {
                // Filter out already viewed announcements
                const unviewedAnnouncements = result.data.filter(
                    announcement => !viewedAnnouncements.includes(announcement.id)
                );
                setAnnouncements(unviewedAnnouncements);
            }
        };

        fetchAnnouncements();
    }, [viewedAnnouncements]);

    // Show announcements one at a time
    const currentAnnouncement = announcements[currentAnnouncementIndex];

    if (!currentAnnouncement) return null;

    return <SystemAnnouncementModal announcement={currentAnnouncement} />;
}

