"use client";

/**
 * useScreenshot
 *
 * Backward-compatible wrapper around useScreenCapture.
 * Preserves the original API surface (captureScreen, isCapturing, error, lastCapture)
 * used by useContextCollection and the official-components demos.
 *
 * Previously used html2canvas; now delegates to html-to-image via useScreenCapture
 * which actually works with backdrop-filter and CSS custom properties.
 */

import { useState, useCallback } from "react";
import { captureTabViaCanvas } from "./useScreenCapture";
import {
  compressImage,
  generateThumbnail,
} from "@/utils/image/imageCompression";
import type {
  UseScreenshotOptions,
  UseScreenshotReturn,
  ScreenshotMetadata,
  ProcessedScreenshotData,
} from "@/types/screenshot";

export const useScreenshot = (
  options: UseScreenshotOptions = {},
): UseScreenshotReturn => {
  const {
    quality = 0.95,
    format = "image/png",
    excludeSelectors = [],
    autoCompress = true,
  } = options;

  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastCapture, setLastCapture] =
    useState<ProcessedScreenshotData | null>(null);

  const getMetadata = (): ScreenshotMetadata => ({
    timestamp: new Date().toISOString(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pathName: window.location.pathname,
    url: window.location.href,
  });

  const processScreenshot = async (
    rawDataUrl: string,
    metadata: ScreenshotMetadata,
  ): Promise<ProcessedScreenshotData> => {
    try {
      const [compressed, thumbnail] = autoCompress
        ? await Promise.all([
            compressImage(rawDataUrl, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              type: "image/jpeg",
            }),
            generateThumbnail(rawDataUrl),
          ])
        : [rawDataUrl, rawDataUrl];

      const base64Data = rawDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const mimeTypeMatch = rawDataUrl.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";

      return {
        fullSize: rawDataUrl,
        compressed,
        thumbnail,
        metadata,
        imageDataForAPI: {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64Data },
        },
      };
    } catch {
      const base64Data = rawDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const mimeTypeMatch = rawDataUrl.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
      return {
        fullSize: rawDataUrl,
        compressed: rawDataUrl,
        thumbnail: rawDataUrl,
        metadata,
        imageDataForAPI: {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64Data },
        },
      };
    }
  };

  const captureScreen =
    useCallback(async (): Promise<ProcessedScreenshotData> => {
      try {
        setIsCapturing(true);
        setError(null);

        // Hide excluded elements before capturing
        const elements = excludeSelectors.flatMap((sel) =>
          Array.from(document.querySelectorAll<HTMLElement>(sel)),
        );
        const originalVisibilities = elements.map((el) => el.style.visibility);
        elements.forEach((el) => {
          el.style.visibility = "hidden";
        });

        // Two rAF cycles so the browser repaints before capturing
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );

        let rawDataUrl: string;
        try {
          const result = await captureTabViaCanvas({
            filename: `screenshot-${Date.now()}.png`,
          });
          rawDataUrl = result.dataUrl;
        } finally {
          elements.forEach((el, i) => {
            el.style.visibility = originalVisibilities[i];
          });
        }

        const metadata = getMetadata();
        const processedData = await processScreenshot(rawDataUrl, metadata);
        setLastCapture(processedData);
        return processedData;
      } catch (err) {
        const e =
          err instanceof Error
            ? err
            : new Error("Failed to capture screenshot");
        setError(e);
        throw e;
      } finally {
        setIsCapturing(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quality, format, excludeSelectors, autoCompress]);

  return { captureScreen, isCapturing, error, lastCapture };
};
