/**
 * Audio Recovery Toast
 *
 * Floating notification that appears when orphaned audio data is detected.
 * Clicking opens the AudioRecoveryModal for detailed recovery options.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Mic, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useAudioRecovery } from "../providers/AudioRecoveryProvider";
import { AudioRecoveryModal } from "./AudioRecoveryModal";

export function AudioRecoveryToast() {
  const { hasRecoveredData, recoveredItems, dismissAll, initialize } =
    useAudioRecovery();
  useEffect(() => {
    initialize();
  }, [initialize]);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!hasRecoveredData || dismissed) return null;

  const count = recoveredItems.length;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 max-w-sm",
            "bg-card border border-border rounded-lg shadow-lg",
            "p-4 cursor-pointer",
            "hover:shadow-xl transition-shadow duration-200",
          )}
          onClick={() => setShowModal(true)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Recovered Audio Data
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} recording{count !== 1 ? "s" : ""} recovered from a
                previous session. Tap to review.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
                dismissAll();
              }}
              className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Dismiss recovery notification"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AudioRecoveryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
