"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bug, PartyPopper, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { openFeedbackDialog } from "@/lib/redux/slices/overlaySlice";
import { setModulePreferences } from "@/lib/redux/slices/userPreferencesSlice";

interface FeedbackButtonProps {
  className?: string;
}

export default function FeedbackButton({
  className = "",
}: FeedbackButtonProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.id);
  const feedbackFeatureViewCount = useAppSelector(
    (state) => state.userPreferences.system.feedbackFeatureViewCount,
  );
  const preferencesLoadedFromDb = useAppSelector(
    (state) => state.userPreferences._meta.loadedPreferences !== null,
  );
  const [showNewFeatureHighlight, setShowNewFeatureHighlight] = useState(false);

  useEffect(() => {
    if (!userId || !preferencesLoadedFromDb) return;

    if (feedbackFeatureViewCount < 5) {
      setShowNewFeatureHighlight(true);
      const timer = setTimeout(() => {
        const newCount = feedbackFeatureViewCount + 1;
        // Engine debounces the Supabase write automatically (≤250ms).
        dispatch(
          setModulePreferences({
            module: "system",
            preferences: { feedbackFeatureViewCount: newCount },
          }),
        );
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowNewFeatureHighlight(false);
    }
  }, [userId, preferencesLoadedFromDb, feedbackFeatureViewCount, dispatch]);

  const dismissHighlight = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setShowNewFeatureHighlight(false);
      // Engine debounces the Supabase write automatically.
      dispatch(
        setModulePreferences({
          module: "system",
          preferences: { feedbackFeatureViewCount: 5 },
        }),
      );
    },
    [dispatch],
  );

  const handleClick = useCallback(() => {
    if (showNewFeatureHighlight) setShowNewFeatureHighlight(false);
    dispatch(openFeedbackDialog());
  }, [dispatch, showNewFeatureHighlight]);

  return (
    <div className="relative">
      <button
        className={`p-2 rounded-full transition-all duration-200 ease-in-out ${className}`}
        aria-label="Submit Feedback"
        onClick={handleClick}
      >
        <Bug className="w-4 h-4" />
      </button>

      {showNewFeatureHighlight && (
        <>
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>

          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-blue-600 text-white text-xs font-medium px-3 py-2 pr-8 rounded-lg shadow-lg whitespace-nowrap animate-bounce relative">
              <PartyPopper className="w-4 h-4 inline mr-1" /> NEW! Report bugs
              &amp; issues
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={dismissHighlight}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-blue-700 rounded p-0.5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45" />
            </div>
          </div>

          <div className="absolute inset-0 rounded-lg animate-pulse bg-blue-500 opacity-20 -z-10" />
        </>
      )}
    </div>
  );
}
