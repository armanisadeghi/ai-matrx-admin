'use client';

import React, { useState, useEffect } from 'react';
import {
    isAppleKeyExpiringSoon,
    isAppleKeyExpired,
    getAppleKeyExpiryMessage,
    APPLE_KEY_GENERATION_DATE,
} from '@/lib/apple-key-config';

interface AppleKeyExpiryBannerProps {
    isAdmin: boolean;
}

const DISMISS_KEY_PREFIX = 'apple-key-expiry-dismissed-';

export default function AppleKeyExpiryBanner({ isAdmin }: AppleKeyExpiryBannerProps) {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isAdmin) return;

        const expiringSoon = isAppleKeyExpiringSoon();
        const expired = isAppleKeyExpired();

        if (!expiringSoon && !expired) return;

        // Check if this specific key generation date's warning was dismissed
        const dismissKey = `${DISMISS_KEY_PREFIX}${APPLE_KEY_GENERATION_DATE}`;
        const dismissed = localStorage.getItem(dismissKey);

        if (dismissed && !expired) {
            // Allow re-dismissal for non-expired warnings, but always show if expired
            return;
        }

        setMessage(getAppleKeyExpiryMessage());
        setVisible(true);
    }, [isAdmin]);

    const handleDismiss = () => {
        const dismissKey = `${DISMISS_KEY_PREFIX}${APPLE_KEY_GENERATION_DATE}`;
        localStorage.setItem(dismissKey, new Date().toISOString());
        setVisible(false);
    };

    if (!visible) return null;

    const isExpired = isAppleKeyExpired();

    return (
        <div
            className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium ${isExpired
                    ? 'bg-red-600 text-white'
                    : 'bg-yellow-500 text-black'
                }`}
        >
            <span className="flex-1">{message}</span>
            <button
                onClick={handleDismiss}
                className={`ml-4 px-3 py-1 rounded text-xs font-semibold transition-colors ${isExpired
                        ? 'bg-red-800 hover:bg-red-900 text-white'
                        : 'bg-yellow-700 hover:bg-yellow-800 text-white'
                    }`}
            >
                Dismiss
            </button>
        </div>
    );
}
