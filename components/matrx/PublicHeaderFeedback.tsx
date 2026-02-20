'use client';

import React, { lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { Bug } from 'lucide-react';

// Lazy load FeedbackButton - only loads when user is authenticated
const FeedbackButton = lazy(() => import('@/components/layout/FeedbackButton'));

/**
 * Public Header Feedback - Conditionally renders for authenticated users
 * 
 * Uses lazy loading with ssr: false to defer until after page render.
 * Only visible when user is authenticated.
 * Reserves space with placeholder to prevent layout shift.
 */
export function PublicHeaderFeedback() {
  const user = useSelector(selectUser);
  const isAuthenticated = !!user.id;

  // Don't render anything if not authenticated (no placeholder needed)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={<FeedbackButtonPlaceholder />}>
      <FeedbackButton className="text-foreground hover:bg-accent rounded-full transition-colors" />
    </Suspense>
  );
}

/**
 * Placeholder that matches the size of the feedback button
 * Prevents layout shift while the real button loads
 */
function FeedbackButtonPlaceholder() {
  return (
    <button
      className="p-2 rounded-full opacity-50 cursor-default"
      aria-hidden="true"
      disabled
    >
      <Bug className="w-4 h-4" />
    </button>
  );
}
