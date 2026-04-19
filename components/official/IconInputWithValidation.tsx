"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RefreshCw, Check, X, ExternalLink, PanelsTopLeft } from "lucide-react";
import IconResolver, {
  isRegisteredOrLucideIconName,
} from "@/components/official/IconResolver";
import {
  TapTargetButton,
  TapTargetButtonSolid,
  TapTargetButtonTransparent,
} from "@/components/icons/TapTargetButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { listMatrxSvgIconValues } from "@/utils/icons/matrx-public-svg-registry";

const LUCIDE_ICONS_URL = "https://lucide.dev/icons/";

const MATRX_SVG_QUICK_PICK = listMatrxSvgIconValues().slice(0, 10);

export interface IconInputWithValidationProps {
  /** Current icon name value */
  value: string;
  /** Callback when icon name changes */
  onChange: (iconName: string) => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Additional className for the input */
  className?: string;
  /** Input ID for label association */
  id?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Show link to Lucide icons site */
  showLucideLink?: boolean;
  /** Open Lucide.dev in an embedded panel (dialog on desktop, drawer on mobile) */
  showLucideEmbed?: boolean;
  /** Show glass / transparent / solid tap-target previews when the value validates */
  showTapTargetPreviews?: boolean;
  /** Show quick-pick chips for Matrx `svg:…` public assets */
  showMatrxSvgQuickPick?: boolean;
}

type ValidationState = "idle" | "validating" | "valid" | "invalid";

function LucideEmbedFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border bg-muted/30",
        className,
      )}
    >
      <iframe
        title="Lucide icons"
        src={LUCIDE_ICONS_URL}
        className="h-[min(70dvh,560px)] w-full border-0 bg-background"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="border-t border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        If this area stays blank, lucide.dev may block embedding in iframes —
        use &quot;Open Lucide&quot; below, then copy the icon name here (
        <code className="font-mono text-foreground">PascalCase</code>).
      </p>
    </div>
  );
}

/**
 * IconInputWithValidation - Official Component
 *
 * All-in-one icon name input with validation and preview.
 *
 * Features:
 * - Real-time icon validation (Lucide, IconResolver registry, Matrx `svg:path/id` assets)
 * - Visual feedback (green check / red X)
 * - Live icon preview when valid
 * - Auto-capitalizes first letter for better UX
 * - Optional embedded Lucide reference (iframe)
 * - Optional tap-target (glass / transparent / solid) previews
 *
 * @example
 * ```tsx
 * <IconInputWithValidation
 *   value={iconName}
 *   onChange={setIconName}
 *   placeholder="e.g., Sparkles"
 * />
 * ```
 */
export default function IconInputWithValidation({
  value,
  onChange,
  placeholder = "e.g. Sparkles or svg:icons/Home",
  className,
  id,
  disabled = false,
  showLucideLink = true,
  showLucideEmbed = true,
  showTapTargetPreviews = true,
  showMatrxSvgQuickPick = true,
}: IconInputWithValidationProps) {
  const isMobile = useIsMobile();
  const [validationState, setValidationState] =
    useState<ValidationState>("idle");
  const [validatedIconName, setValidatedIconName] = useState<string | null>(
    null,
  );
  const [lastValidatedValue, setLastValidatedValue] = useState<string>("");
  const [lucidePanelOpen, setLucidePanelOpen] = useState(false);

  const validateIcon = useCallback(
    async (iconName: string) => {
      if (!iconName || iconName.trim() === "") {
        setValidationState("idle");
        setValidatedIconName(null);
        return;
      }

      setValidationState("validating");

      const checkIcon = (name: string) => isRegisteredOrLucideIconName(name);

      const isValid = await checkIcon(iconName);

      if (isValid) {
        setValidationState("valid");
        setValidatedIconName(iconName);
        setLastValidatedValue(iconName);
        return;
      }

      if (iconName[0] === iconName[0].toLowerCase()) {
        const capitalized =
          iconName.charAt(0).toUpperCase() + iconName.slice(1);
        const isCapitalizedValid = await checkIcon(capitalized);

        if (isCapitalizedValid) {
          setValidationState("valid");
          setValidatedIconName(capitalized);
          setLastValidatedValue(capitalized);
          onChange(capitalized);
          return;
        }
      }

      setValidationState("invalid");
      setValidatedIconName(null);
      setLastValidatedValue(iconName);
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
    const newValue = e.target.value;
    onChange(newValue);

    if (validationState !== "idle") {
      setValidationState("idle");
      setValidatedIconName(null);
    }
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

  const lucidePanel = isMobile ? (
    <Drawer open={lucidePanelOpen} onOpenChange={setLucidePanelOpen}>
      <DrawerContent className="max-h-[92dvh] pb-safe">
        <DrawerHeader className="text-left">
          <DrawerTitle>Lucide icons</DrawerTitle>
          <DrawerDescription>
            Search on lucide.dev; use the PascalCase name in the field above.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <LucideEmbedFrame />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={lucidePanelOpen} onOpenChange={setLucidePanelOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Lucide icons</DialogTitle>
          <DialogDescription>
            Embedded reference — search here, then paste the{" "}
            <code className="font-mono text-foreground">PascalCase</code> name
            into your field.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 min-h-0 flex-1 overflow-auto">
          <LucideEmbedFrame />
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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

      {showTapTargetPreviews &&
        validationState === "valid" &&
        validatedIconName && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-2 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Tap targets
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <TapTargetButton
                type="button"
                icon={
                  <IconResolver
                    iconName={validatedIconName}
                    className="h-4 w-4"
                  />
                }
                ariaLabel="Glass tap target preview"
                disabled
              />
              <TapTargetButtonTransparent
                type="button"
                icon={
                  <IconResolver
                    iconName={validatedIconName}
                    className="h-4 w-4"
                  />
                }
                ariaLabel="Transparent tap target preview"
                disabled
              />
              <TapTargetButtonSolid
                type="button"
                icon={
                  <IconResolver
                    iconName={validatedIconName}
                    className="h-4 w-4"
                  />
                }
                ariaLabel="Solid tap target preview"
                disabled
              />
            </div>
          </div>
        )}

      {showLucideLink && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Lucide name, registry id, or</span>
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
            svg:icons/Home
          </code>
          <span>•</span>
          <a
            href={LUCIDE_ICONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open Lucide
            <ExternalLink className="h-3 w-3" />
          </a>
          {showLucideEmbed ? (
            <>
              <span>•</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary"
                onClick={() => setLucidePanelOpen(true)}
              >
                <PanelsTopLeft className="h-3.5 w-3.5" />
                Lucide in panel
              </Button>
            </>
          ) : null}
        </div>
      )}

      {showMatrxSvgQuickPick ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Matrx SVG quick pick
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MATRX_SVG_QUICK_PICK.map((id) => (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(id)}
                className={cn(
                  "rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground transition-colors",
                  "hover:bg-accent disabled:opacity-50",
                  value === id && "border-primary bg-primary/10",
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {lucidePanel}

      {validationState === "invalid" && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Icon not found. Try Lucide PascalCase, a registry id, or an{" "}
          <code className="font-mono">svg:…</code> id from the list above.
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
 * Compact variant — Lucide helper row hidden; optional embed / tap / SVG chips via props.
 */
export function IconInputCompact({
  showLucideEmbed = false,
  showTapTargetPreviews = false,
  showMatrxSvgQuickPick = false,
  ...rest
}: Omit<IconInputWithValidationProps, "showLucideLink">) {
  return (
    <IconInputWithValidation
      {...rest}
      showLucideLink={false}
      showLucideEmbed={showLucideEmbed}
      showTapTargetPreviews={showTapTargetPreviews}
      showMatrxSvgQuickPick={showMatrxSvgQuickPick}
    />
  );
}
