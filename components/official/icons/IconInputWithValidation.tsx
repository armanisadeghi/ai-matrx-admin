"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Search,
  LayoutGrid,
} from "lucide-react";
import IconResolver, {
  isRegisteredOrLucideIconName,
} from "@/components/official/icons/IconResolver";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { cn } from "@/lib/utils";
import {
  collectLucideIconNameCandidates,
  extractLucideJsxIconName,
} from "@/utils/icons/lucide-name-normalize";
import { LUCIDE_ICONS_GALLERY_URL } from "@/utils/icons/lucide-gallery-url";

const CuratedIconPickerWindowLazy = dynamic(
  () =>
    import("@/features/window-panels/windows/CuratedIconPickerWindow").then(
      (m) => ({ default: m.CuratedIconPickerWindow }),
    ),
  { ssr: false },
);

export interface IconInputWithValidationProps {
  value: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /**
   * Fine print: “Search Lucide” (opens site frame) + link to lucide.dev
   */
  showLucideLink?: boolean;
  /**
   * Fine print: “Icon gallery” opens a floating window with every bundled Lucide name,
   * registry icon, and Matrx `svg:…` asset (finite list; filter only).
   */
  showCuratedIconGallery?: boolean;
}

type ValidationState = "idle" | "validating" | "valid" | "invalid";

/**
 * IconInputWithValidation — compact icon name field with validation.
 *
 * Core row: text input, validate control, preview when valid.
 * Optional fine print: Search Lucide (floating window), lucide.dev link, and curated gallery.
 */
export default function IconInputWithValidation({
  value,
  onChange,
  placeholder = "e.g. Flame, alarm-clock, or svg:icons/Home",
  className,
  id,
  disabled = false,
  showLucideLink = true,
  showCuratedIconGallery = true,
}: IconInputWithValidationProps) {
  const dispatch = useAppDispatch();
  const galleryInstanceId = useId().replace(/:/g, "");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [validationState, setValidationState] =
    useState<ValidationState>("idle");
  const [validatedIconName, setValidatedIconName] = useState<string | null>(
    null,
  );
  const [lastValidatedValue, setLastValidatedValue] = useState<string>("");

  const validateIcon = useCallback(
    async (iconName: string) => {
      const trimmed = iconName.trim();
      if (!trimmed) {
        setValidationState("idle");
        setValidatedIconName(null);
        return;
      }

      setValidationState("validating");

      const checkIcon = (name: string) => isRegisteredOrLucideIconName(name);

      const candidates = trimmed.startsWith("svg:")
        ? [trimmed]
        : collectLucideIconNameCandidates(trimmed);

      for (const name of candidates) {
        if (await checkIcon(name)) {
          setValidationState("valid");
          setValidatedIconName(name);
          setLastValidatedValue(name);
          if (name !== trimmed) {
            onChange(name);
          }
          return;
        }
      }

      setValidationState("invalid");
      setValidatedIconName(null);
      setLastValidatedValue(trimmed);
    },
    [onChange],
  );

  useEffect(() => {
    if (value && value.trim() !== "" && value !== lastValidatedValue) {
      validateIcon(value);
    } else if (!value || value.trim() === "") {
      setValidationState("idle");
      setValidatedIconName(null);
      setLastValidatedValue("");
    }
  }, [value, lastValidatedValue, validateIcon]);

  const handleValidateClick = () => {
    validateIcon(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const extracted = extractLucideJsxIconName(raw);
    const newValue = extracted ?? raw;
    onChange(newValue);

    if (validationState !== "idle") {
      setValidationState("idle");
      setValidatedIconName(null);
    }
  };

  const openLucideFrame = () => {
    dispatch(
      openOverlay({
        overlayId: "browserFrameWindow",
        data: {
          url: LUCIDE_ICONS_GALLERY_URL,
          windowTitle: "Lucide icons",
        },
      }),
    );
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case "validating":
        return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />;
      case "valid":
        return <Check className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "invalid":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Input
            id={id}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("pr-10 text-base", className)}
            style={{ fontSize: "16px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                validateIcon(value);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !value || validationState === "validating"}
            onClick={handleValidateClick}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            title="Validate icon"
          >
            {getStatusIcon()}
          </Button>
        </div>

        {validationState === "valid" && validatedIconName && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <IconResolver
              iconName={validatedIconName}
              className="h-5 w-5 text-foreground"
            />
          </div>
        )}
      </div>

      {showLucideLink || showCuratedIconGallery ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-snug text-muted-foreground">
          {showLucideLink ? (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={openLucideFrame}
                className={cn(
                  "inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <Search className="h-3 w-3 shrink-0" aria-hidden />
                Search Lucide
              </button>
              <a
                href={LUCIDE_ICONS_GALLERY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                lucide.dev
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </>
          ) : null}
          {showCuratedIconGallery ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setGalleryOpen(true)}
              className={cn(
                "inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <LayoutGrid className="h-3 w-3 shrink-0" aria-hidden />
              Icon gallery
            </button>
          ) : null}
        </p>
      ) : null}

      {showCuratedIconGallery ? (
        <CuratedIconPickerWindowLazy
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          windowInstanceId={galleryInstanceId}
          onSelectIcon={(iconId) => {
            onChange(iconId);
            setGalleryOpen(false);
          }}
        />
      ) : null}

      {validationState === "invalid" && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Unknown icon. Use the gallery, Search Lucide, or type a name /{" "}
          <code className="font-mono">&lt;Icon /&gt;</code> /{" "}
          <code className="font-mono">svg:…</code>.
        </p>
      )}
      {validationState === "valid" && validatedIconName !== value && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Auto-corrected to:{" "}
          <code className="font-mono">{validatedIconName}</code>
        </p>
      )}
    </div>
  );
}

/**
 * Compact variant — hides Lucide fine print; optional curated gallery only via prop.
 */
export function IconInputCompact({
  showCuratedIconGallery = false,
  ...rest
}: Omit<IconInputWithValidationProps, "showLucideLink">) {
  return (
    <IconInputWithValidation
      {...rest}
      showLucideLink={false}
      showCuratedIconGallery={showCuratedIconGallery}
    />
  );
}
