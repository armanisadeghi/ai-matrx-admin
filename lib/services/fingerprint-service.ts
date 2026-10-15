/**
 * Centralized Fingerprint Service
 *
 * Handles robust guest identification for all non-authenticated routes.
 * Uses the server-issued first-party visitor id for new browsers and preserves
 * the existing localStorage id for returning browsers.
 *
 * CRITICAL: This service MUST be used for ANY AI interaction from guests.
 */

import { ACQUISITION_VISITOR_COOKIE } from "@/lib/product-analytics/user-acquisition";
import { defineClientKey } from "@/lib/sync/client-storage";

let cachedFingerprint: string | null = null;

// Storage configuration
const guestFingerprintKey = defineClientKey({
  id: "guest-fingerprint",
  area: "local",
  kind: "device",
  reason: "This browser's guest visitor id, mirrored from the visitor cookie for synchronous reads.",
  legacyKey: "ai_matrx_guest_fp",
});
const STORAGE_VERSION = "1";

interface FingerprintData {
  fingerprint: string;
  version: string;
  createdAt: number;
  lastUsed: number;
}

function readVisitorCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${ACQUISITION_VISITOR_COOKIE}=`;
  const raw = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return raw && isValidFingerprint(raw) ? raw : null;
}

function storeFingerprint(fingerprint: string): void {
  const now = Date.now();
  const fpData: FingerprintData = {
    fingerprint,
    version: STORAGE_VERSION,
    createdAt: now,
    lastUsed: now,
  };
  // Privacy-restricted browsers still retain the response cookie.
  guestFingerprintKey.setJSON(fpData);
}

/**
 * Get visitor fingerprint
 *
 * @returns Unique visitor ID that persists across sessions
 */
export async function getFingerprint(): Promise<string> {
  // Layer 1: Return memory cache if available
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // Layer 2: Try to load from localStorage with version validation
  if (typeof window !== "undefined") {
    try {
      const data = guestFingerprintKey.getJSON<FingerprintData>();
      if (data) {

        // Validate version and fingerprint existence
        if (data.version === STORAGE_VERSION && data.fingerprint) {
          cachedFingerprint = data.fingerprint;

          // Update lastUsed timestamp
          data.lastUsed = Date.now();
          guestFingerprintKey.setJSON(data);

          console.log("✅ Loaded cached fingerprint from localStorage");
          return data.fingerprint;
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to parse cached fingerprint, regenerating:",
        error,
      );
    }
  }

  // Layer 3: the server created this before the first page response.
  const visitorId = readVisitorCookie();
  if (visitorId) {
    cachedFingerprint = visitorId;
    storeFingerprint(visitorId);
    return visitorId;
  }

  // Local/test fallback when Proxy did not run. Cryptographic randomness keeps
  // the id stable and unguessable without fingerprinting browser hardware.
  const fallback = crypto.randomUUID().replaceAll("-", "");
  cachedFingerprint = fallback;
  if (typeof window !== "undefined") storeFingerprint(fallback);
  return fallback;
}

/**
 * Get or retrieve cached fingerprint synchronously
 * Use only after calling getFingerprint() at least once
 */
export function getCachedFingerprint(): string | null {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // Try localStorage with version validation
  if (typeof window !== "undefined") {
    try {
      const data = guestFingerprintKey.getJSON<FingerprintData>();
      if (data) {
        if (data.version === STORAGE_VERSION && data.fingerprint) {
          cachedFingerprint = data.fingerprint;

          // Update lastUsed timestamp
          data.lastUsed = Date.now();
          guestFingerprintKey.setJSON(data);

          return data.fingerprint;
        }
      }
    } catch (error) {
      console.error("Failed to parse cached fingerprint:", error);
    }
  }

  const visitorId = readVisitorCookie();
  if (visitorId) {
    cachedFingerprint = visitorId;
    return visitorId;
  }

  return null;
}

/**
 * Clear cached fingerprint (for testing)
 */
export function clearCachedFingerprint(): void {
  cachedFingerprint = null;
  guestFingerprintKey.remove();
}

/**
 * Validate that a fingerprint string looks legitimate
 * Helps prevent bypassing via fake fingerprints
 */
export function isValidFingerprint(fingerprint: string): boolean {
  if (!fingerprint || typeof fingerprint !== "string") {
    return false;
  }

  if (fingerprint.length < 16) {
    return false;
  }

  // Check if it's a temp ID (our fallback)
  if (fingerprint.startsWith("temp_")) {
    return true; // Allow temps but flag them
  }

  return /^[a-zA-Z0-9_-]+$/.test(fingerprint);
}

/**
 * Check if fingerprint is a temporary one (fallback)
 * These should be flagged for monitoring
 */
export function isTempFingerprint(fingerprint: string): boolean {
  return fingerprint?.startsWith("temp_") || false;
}
