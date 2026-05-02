"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  hostname: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Favicon for a given hostname using Google's S2 favicon service.
 * Falls back to a Globe icon on error or when hostname is missing.
 *
 * Mirrors the `<Image unoptimized>` pattern used in SourceList.tsx —
 * no Next image optimization needed since favicons are tiny and
 * the source is rate-limit-friendly in practice.
 */
export function Favicon({ hostname, size = 16, className }: Props) {
  const [errored, setErrored] = useState(false);
  const showFallback = !hostname || errored;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <Globe
          className="text-muted-foreground"
          style={{ width: size * 0.7, height: size * 0.7 }}
        />
      ) : (
        <Image
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=${size * 2}`}
          alt=""
          width={size}
          height={size}
          unoptimized
          onError={() => setErrored(true)}
          className="h-full w-full object-contain"
        />
      )}
    </span>
  );
}
