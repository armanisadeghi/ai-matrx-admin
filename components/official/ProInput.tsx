/**
 * ProInput — the canonical full-feature single-line input for user-authored content.
 *
 * The Tier 2 default for any input that holds user text (titles, names, search
 * queries, chat prompts, tags, short replies). Tier 1 is the bare shadcn
 * `BasicInput` / `/controls` `Field`, used only for raw values (slugs, aliases,
 * ids, numbers, admin diff inputs) and marked `// ui-exception: <reason>` —
 * `pnpm check:writing-boxes` enforces it.
 *
 * ## Built-in features
 *
 * - **Voice input** — mic toggle with live streaming transcription, audio-level
 *   glow, and a recording-protection modal that warns before unmount while a
 *   recording or transcription is in flight.
 * - **"…" actions menu** — a hover-revealed right-side menu hosting Copy and
 *   AI cleanup. It only appears while the pointer is over the field — never
 *   from focus alone. While it (and the mic) shows, the field reserves its
 *   measured width as right padding, so the controls NEVER cover text (on a
 *   phone a tap is a lasting hover; the cluster used to sit on the typed text —
 *   `proInputReservedPadding.ts`).
 * - **Submit button** — opt-in via `onSubmit`. Renders a transparent Send
 *   tap button at the right edge. `Cmd/Ctrl + Enter` triggers it. `submitOnEnter`
 *   makes plain Enter submit.
 * - **Field navigation** — opt-in via `onEnterKey`. Plain Enter advances to the
 *   next field instead of submitting (for sequential form flows).
 * - **Clear button** — opt-in via `clearable` (+ optional `onClear`).
 * - **Start icon** — opt-in via `startIcon` for search/filter prefixes.
 * - **iOS zoom guard** — value text is always 16px (built in); placeholder
 *   stays `text-sm` so empty fields don't look oversized.
 * - **Floating label** — pass `floatingLabel="…"` for a dense-form label that
 *   animates inside the border. See "Labelling" below.
 *
 * ## Labeling
 *
 * - **Above-label** (default for spacious forms) — wrap with `<Field>`:
 *   ```tsx
 *   <Field label="Title" htmlFor="title" required>
 *     <ProInput id="title" value={…} onChange={…} />
 *   </Field>
 *   ```
 * - **Floating label** (dense forms) — pass `floatingLabel`:
 *   ```tsx
 *   <ProInput floatingLabel="Search" value={…} onChange={…} />
 *   ```
 *   Use only inside a `bg-card` surface — the label background masks the
 *   border with `bg-card`. For non-card surfaces, use `<Field>` instead.
 * - **No label** (search, filters, quick-add bars) — bare `<ProInput>` with
 *   `placeholder`.
 *
 * ## Constraints (intentional)
 *
 * - `floatingLabel` and `placeholder` are mutually exclusive. The floating
 *   label sits where the placeholder would, so the placeholder is suppressed
 *   when `floatingLabel` is set.
 * - Don't try to override the icon positions or recording-state styles via
 *   `className`. The icon layout is fixed. Controls use prebuilt transparent
 *   tap buttons (`MicTapButton`, `CopyTapButton`, `SendTapButton`, etc.)
 *   so they sit flush inside the field without glass borders touching the edge.
 * - For schema-bound inputs (Entity, Settings), build a thin
 *   wrapper that owns the binding logic and renders ProInput — don't
 *   re-implement voice/copy/submit per system.
 *
 * Renamed from `VoiceInput`. A re-export shim still lives at
 * `components/official/VoiceInput.tsx` for backwards compatibility.
 *
 * @official-component
 */

"use client";

import React, { useCallback, useState, useRef, useEffect, useEffectEvent, useId, useLayoutEffect } from "react";
import {
  PRO_INPUT_TEXT_GAP_PX,
  hoverRevealsCluster,
  reservedRightPaddingPx,
} from "@/components/official/proInputReservedPadding";
import {
  controlSizes,
  fitFieldControls,
  isDenseField,
} from "@/components/official/proFieldControlFit";
import { Check, Copy, Loader2, Mic, SlidersHorizontal, X } from "lucide-react";
import { motion } from "motion/react";
import { listMediaDevices } from "@ai-matrx/browser-audio/core";
import { useMicField } from "@/features/audio/hooks/useMicField";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  CheckTapButton,
  LoadingTapButton,
  MoreHorizontalTapButton,
  SendTapButton,
  XTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import { MicButton } from "@/components/audio/MicButton";
import { VoiceTroubleshootingModal } from "@/features/audio/components/VoiceTroubleshootingModal";
import { useOpenAudioDevices } from "@/features/overlays/definitions/audioDevices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { CLEANUP_SURFACE_NAME } from "@/features/transcription-cleanup/hooks/useAiPostProcess";
import { useCleanupSurfaceAgentId } from "./useCleanupSurfaceAgentId";
import type { SessionContextItem } from "@/features/transcript-studio/types";
import { useProTextareaAgentAction } from "./useProTextareaAgentAction";
import { ProTextAgentActionPopoverBody } from "./ProTextAgentActionPopoverBody";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { copyText } from "@ai-matrx/kit/clipboard";
import { useMediaQuery } from "@ai-matrx/kit/media-query";
import { ReadAloudMenuRow } from "./ReadAloudMenuRow";
/** Real HTMLInputElement with optional expando methods set by ProInput. */
export interface ProInputElement extends HTMLInputElement {
  requestClose?: () => void;
  isTranscribing?: () => boolean;
}

export interface ProInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  /** If true, appends to existing text; if false, replaces. Default: true. */
  appendTranscript?: boolean;
  wrapperClassName?: string;
  /** Called when it's safe to close/unmount (after user confirms or recording/transcription completes). */
  onRequestClose?: () => void;
  /** If true, prevents unmounting during recording/transcription with a warning modal. Default: true. */
  protectTranscription?: boolean;
  /** Show the Copy action inside the "…" menu. Default: true. */
  showCopyButton?: boolean;
  /**
   * AI "Clean up" action in the "…" menu. ON by default for single-line
   * human-authored text. Set false for search/query, URL, keyword/tag, and
   * other machine-significant values.
   */
  enableCleanup?: boolean;
  /** Override the cleanup agent resolved from the shared cleanup surface. */
  cleanupAgentId?: string | null;
  /** Optional context blocks delivered to the cleanup agent. */
  cleanupContextItems?: SessionContextItem[];
  /**
   * Voice input + mic device picker. Default true. Set false for search bars,
   * filters, and any field where Enter must submit a form — mic controls inside
   * a `<form>` must never act as implicit submit buttons.
   */
  enableVoice?: boolean;
  /** When provided, renders a prominent submit button at the right edge. */
  onSubmit?: () => void;
  /** Force-disable the submit button regardless of content. */
  submitDisabled?: boolean;
  /** Show a spinner inside the submit button. */
  isSubmitting?: boolean;
  /** Accessible/tooltip label for the submit button. Default: "Send". */
  submitLabel?: string;
  /** Submit on Cmd/Ctrl + Enter. Defaults to true when `onSubmit` is provided. */
  submitOnCmdEnter?: boolean;
  /** Submit on plain Enter. Default: false. */
  submitOnEnter?: boolean;
  /**
   * Field-navigation mode (opt-in). When provided, plain Enter calls
   * `onEnterKey` (the caller typically advances focus to the next field)
   * instead of submitting. Takes precedence over `onSubmit` / `submitOnEnter`
   * for the Enter key, so the two are not meant to be combined.
   */
  onEnterKey?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Override sequential focus for mic/menu controls in dense composite fields. */
  auxiliaryControlsTabIndex?: number;
  /** Suffix used to distinguish repeated auxiliary controls in dense forms. */
  auxiliaryControlsLabel?: string;
  /** Optional leading icon/node — auto-applies left padding. */
  startIcon?: React.ReactNode;
  /** When true, shows a clear (×) control while the field has content. */
  clearable?: boolean;
  /** Called when the clear control is pressed. Defaults to clearing via `onChange`. */
  onClear?: () => void;
  /**
   * Floating label text (dense-form variant). When set, the label animates
   * into the border on focus or value, and the `placeholder` prop is
   * suppressed (they would visually conflict). Use only in a `bg-card`
   * surface — the label uses `bg-card` to mask the input border. For
   * non-card surfaces, use `<Field>` with the above-label style instead.
   */
  floatingLabel?: string;
}

// Reserve right padding ONLY for the persistent controls (clear + submit).
// The hover-only controls (mic + "…" menu) float over the text with no
// reserved gutter — they're hidden while typing, so they never sit on top of
// text the user is actively editing.
function rightPaddingClass(hasSubmit: boolean, showClear: boolean): string {
  const count = (hasSubmit ? 1 : 0) + (showClear ? 1 : 0);
  // One tap box each: the pill plus one gap, as `.matrx-tap-target` sizes it.
  if (count === 2)
    return "pr-[calc(2*(var(--matrx-tap-pill-size)+var(--matrx-tap-gap)))]";
  if (count === 1)
    return "pr-[calc(var(--matrx-tap-pill-size)+var(--matrx-tap-gap))]";
  return "pr-3";
}

/** iOS zoom guard — value text only; placeholder stays text-sm. */
const INPUT_IOS_STYLE: React.CSSProperties = { fontSize: "16px" };

export const ProInput = React.forwardRef<HTMLInputElement, ProInputProps>(
  (
    {
      className,
      wrapperClassName,
      onTranscriptionComplete,
      onTranscriptionError,
      appendTranscript = true,
      value,
      onChange,
      onKeyDown,
      disabled,
      onRequestClose,
      protectTranscription = true,
      showCopyButton = true,
      enableCleanup = true,
      cleanupAgentId,
      cleanupContextItems,
      enableVoice = true,
      onSubmit,
      submitDisabled,
      isSubmitting = false,
      submitLabel = "Send",
      submitOnCmdEnter,
      submitOnEnter = false,
      onEnterKey,
      auxiliaryControlsTabIndex,
      auxiliaryControlsLabel,
      startIcon,
      clearable = false,
      onClear,
      floatingLabel,
      id: idProp,
      placeholder,
      type = "text",
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = idProp ?? (floatingLabel ? generatedId : undefined);
    const [hasCopied, setHasCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuMode, setMenuMode] = useState<"menu" | "cleanup">("menu");
    const [selectedCleanupAgent, setSelectedCleanupAgent] = useState<
      string | null
    >(null);
    const [selectedCleanupAgentName, setSelectedCleanupAgentName] = useState<
      string | null
    >(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAudioAvailable, setIsAudioAvailable] = useState(true);
    const internalRef = useRef<HTMLInputElement>(null);
    // The right-hand controls, measured so the text never runs under them.
    const clusterRef = useRef<HTMLDivElement | null>(null);
    const auxRef = useRef<HTMLDivElement>(null);
    const [clusterWidths, setClusterWidths] = useState({ cluster: 0, aux: 0 });
    // The field's own size: a narrow field reveals the cluster on focus, not
    // hover; the width decides what fits (proFieldControlFit) and a field
    // shorter than a tap box takes the dense 28px controls.
    const [inputWidth, setInputWidth] = useState(0);
    const [inputHeight, setInputHeight] = useState(0);
    const coarsePointer = useMediaQuery("(pointer: coarse)");
    // Watched through CALLBACK refs (cluster + field): a subtree that mounts
    // again must never leave a watcher on the detached node — ProTextarea's
    // text kept a 128px gutter after its controls shrank to 76px (2026-10-15).
    const clusterObserver = useRef<ResizeObserver | null>(null);
    // STABLE callback refs (useCallback): a new function per render makes React detach and
    // re-attach it on EVERY commit, and each re-attach measured synchronously — a field whose
    // size moves with its own controls then set new state in every commit, forever (React
    // #185 on typing into the data library's name finder, 2026-10-22). Mount + the
    // ResizeObserver are the only measures.
    const setClusterNode = useCallback((cluster: HTMLDivElement | null) => {
      if (clusterRef.current === cluster) return;
      clusterRef.current = cluster;
      clusterObserver.current?.disconnect();
      clusterObserver.current = null;
      if (!cluster || typeof ResizeObserver === "undefined") return;
      const measure = () => {
        const next = {
          cluster: cluster.getBoundingClientRect().width,
          aux: auxRef.current?.getBoundingClientRect().width ?? 0,
        };
        setClusterWidths((prev) =>
          prev.cluster === next.cluster && prev.aux === next.aux ? prev : next,
        );
      };
      measure();
      clusterObserver.current = new ResizeObserver(measure);
      clusterObserver.current.observe(cluster);
      // The aux part fades without resizing the cluster; its own size still counts.
      if (auxRef.current) clusterObserver.current.observe(auxRef.current);
    }, []);
    // The element ref is ALWAYS our own, merged into the host's forwarded ref (twin of
    // ProTextarea's). Reading a forwarded ref's `.current` broke every internal feature
    // (apply an agent result, dictation, pre-hydration keep, width measure) whenever a host
    // forwarded a CALLBACK ref — it has no `.current`, so each one returned silently.
    const inputRef = internalRef;
    const inputObserver = useRef<ResizeObserver | null>(null);
    const setInputRef = useCallback((node: HTMLInputElement | null) => {
      if (internalRef.current !== node) {
        inputObserver.current?.disconnect();
        inputObserver.current = null;
        if (node && typeof ResizeObserver !== "undefined") {
          const measure = () => {
            const rect = node.getBoundingClientRect();
            setInputWidth(rect.width);
            setInputHeight(rect.height);
          };
          measure();
          inputObserver.current = new ResizeObserver(measure);
          inputObserver.current.observe(node);
        }
      }
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }, [ref]);
    // THE PRE-HYDRATION KEEP (twin of ProTextarea's): text typed, pasted or dictated into the
    // server-rendered field before React hydrates it reaches the host through its own onChange,
    // instead of being written over by the host's empty value on the next render.
    const keepPreHydrationText = useEffectEvent(() => {
      const el = inputRef.current;
      if (!el || !onChange) return;
      const typed = el.value;
      if (!typed || typed === String(value ?? "")) return;
      // Through React's value tracker, so the input event below reads as a change.
      el.value = "";
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(el, typed);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    useLayoutEffect(() => {
      keepPreHydrationText();
    }, []);
    useEffect(
      () => () => {
        clusterObserver.current?.disconnect();
        inputObserver.current?.disconnect();
      },
      [],
    );
    const openAudioDevices = useOpenAudioDevices();
    const cleanupAction = useProTextareaAgentAction();
    const cleanupSurfaceAgentId = useCleanupSurfaceAgentId(
      CLEANUP_SURFACE_NAME,
      menuOpen,
    );

    useEffect(() => {
      if (menuMode !== "cleanup" || !selectedCleanupAgent) return undefined;
      let cancelled = false;
      void (async () => {
        const { data } = await supabase
          .schema("agent")
          .from("definition")
          .select("name")
          .is("deleted_at", null)
          .eq("id", selectedCleanupAgent)
          .maybeSingle();
        if (!cancelled) setSelectedCleanupAgentName(data?.name ?? null);
      })();
      return () => {
        cancelled = true;
      };
    }, [menuMode, selectedCleanupAgent]);

    useEffect(() => {
      if (!enableVoice) return;
      const checkAudioAvailability = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setIsAudioAvailable(false);
            return;
          }
          await listMediaDevices();
          setIsAudioAvailable(true);
        } catch (error) {
          console.warn("Audio not available:", error);
          setIsAudioAvailable(false);
        }
      };
      checkAudioAvailability();
    }, [enableVoice]);

    const pushToInput = useCallback((newValue: string) => {
      if (!inputRef.current) return;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputRef.current, newValue);
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }
    }, []);

    // Voice-to-text rides the ONE shared recorder via the reusable
    // `useMicField` primitive (start-always-wins, one-at-a-time, survives
    // navigation, crash-safe). Single-line input joins with a space.
    // Destructured into the original local names so the JSX below is unchanged.
    const {
      isRecording,
      isTranscribing,
      audioLevel,
      liveTranscript,
      handleVoiceClick,
      requestClose: handleCloseRequest,
      showTroubleshooting,
      setShowTroubleshooting,
      showProtectionDialog: showTranscriptionWarning,
      setShowProtectionDialog: setShowTranscriptionWarning,
      lastError,
      confirmClose,
      cancelClose,
    } = useMicField({
      instanceId: inputId,
      getValue: () => inputRef.current?.value ?? String(value ?? ""),
      writeValue: pushToInput,
      appendTranscript,
      join: (base, text) => `${base}${base.endsWith(" ") ? "" : " "}${text}`,
      protect: protectTranscription,
      onRequestClose,
      onTranscriptionComplete,
      onTranscriptionError,
    });

    useEffect(() => {
      const el = inputRef.current;
      if (!el) return;
      (el as ProInputElement).requestClose = handleCloseRequest;
      (el as ProInputElement).isTranscribing = () => isTranscribing;
    }, [handleCloseRequest, isTranscribing]);

    const handleCopy = async () => {
      const inputValue = inputRef?.current?.value || String(value || "");
      if (inputValue) {
        if (!(await copyText(inputValue))) return;
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 450);
      }
    };

    const handleMenuOpenChange = useCallback(
      (open: boolean) => {
        setMenuOpen(open);
        if (!open) {
          setMenuMode("menu");
          setSelectedCleanupAgent(null);
          setSelectedCleanupAgentName(null);
          cleanupAction.reset();
        }
      },
      [cleanupAction],
    );

    const openCleanup = useCallback(() => {
      const text = inputRef.current?.value ?? String(value ?? "");
      if (!text.trim()) {
        toast.info("Add some text before cleaning it up");
        return;
      }
      cleanupAction.reset();
      setSelectedCleanupAgent(cleanupAgentId ?? cleanupSurfaceAgentId);
      setSelectedCleanupAgentName(null);
      setMenuMode("cleanup");
    }, [cleanupAction, cleanupAgentId, cleanupSurfaceAgentId, value]);

    // The surface's default agent is read only once the menu opens; a "Clean up" pressed before it
    // lands takes it the moment it arrives instead of opening with no agent.
    useEffect(() => {
      if (menuMode !== "cleanup" || selectedCleanupAgent || cleanupAgentId || !cleanupSurfaceAgentId) return;
      setSelectedCleanupAgent(cleanupSurfaceAgentId);
    }, [menuMode, selectedCleanupAgent, cleanupAgentId, cleanupSurfaceAgentId]);

    const runCleanup = useCallback(() => {
      const text = inputRef.current?.value ?? String(value ?? "");
      if (!text.trim()) {
        toast.info("Add some text before cleaning it up");
        return;
      }
      if (!selectedCleanupAgent) {
        toast.info("Choose a cleanup agent first");
        return;
      }
      void cleanupAction.run(
        text,
        selectedCleanupAgent,
        cleanupContextItems ?? [],
        {
          applicationScope: {
            content: text,
            selection: "",
            text_before: "",
            text_after: "",
          },
        },
      );
    }, [cleanupAction, cleanupContextItems, selectedCleanupAgent, value]);

    const applyCleanup = useCallback(() => {
      const cleaned = cleanupAction.resultText.replace(/\s+/g, " ").trim();
      if (!cleaned) return;
      pushToInput(cleaned);
      setMenuOpen(false);
      setMenuMode("menu");
      setSelectedCleanupAgent(null);
      setSelectedCleanupAgentName(null);
      cleanupAction.reset();
      toast.success("Cleaned text applied");
    }, [cleanupAction, pushToInput]);

    const handleClear = useCallback(() => {
      if (onClear) {
        onClear();
        return;
      }
      pushToInput("");
      onChange?.({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    }, [onClear, pushToInput, onChange]);

    const valueAsString = String(value ?? "");
    const hasContent = valueAsString.trim().length > 0;
    const canSubmit =
      !!onSubmit && hasContent && !submitDisabled && !isSubmitting && !disabled;
    const cmdEnterEnabled = submitOnCmdEnter ?? !!onSubmit;

    const triggerSubmit = useCallback(() => {
      if (canSubmit && onSubmit) onSubmit();
    }, [canSubmit, onSubmit]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isHovered) setIsHovered(false);

        onKeyDown?.(e);
        if (e.defaultPrevented || e.key !== "Enter") return;

        const withCmd = e.metaKey || e.ctrlKey;

        // Field-navigation mode (opt-in via onEnterKey) takes precedence over
        // submit-on-enter: plain Enter advances. Modifier+Enter is left to the
        // caller (a single-line input has no newline to insert).
        if (onEnterKey) {
          if (e.shiftKey || withCmd) return;
          e.preventDefault();
          onEnterKey(e);
          return;
        }

        if (!onSubmit) return;

        if (cmdEnterEnabled && withCmd) {
          e.preventDefault();
          triggerSubmit();
          return;
        }

        // A single-line field: Enter can never be a new line, so the phone's
        // Go key submits it (the touch rule is for multi-line composers).
        if (submitOnEnter && !e.shiftKey && !withCmd) {
          e.preventDefault();
          triggerSubmit();
        }
      },
      [
        isHovered,
        onKeyDown,
        onEnterKey,
        onSubmit,
        cmdEnterEnabled,
        submitOnEnter,
        triggerSubmit,
      ],
    );

    const pointerReveals = hoverRevealsCluster(inputWidth)
      ? isHovered
      : isFocused;
    const showHoverControls =
      (pointerReveals || isRecording || isTranscribing) && !disabled;
    const isVoiceDisabled =
      !isAudioAvailable || disabled || (isTranscribing && !isRecording);
    const showMic = enableVoice && isAudioAvailable;
    const showClear = clearable && hasContent;
    const cleanupEligible = type === "text" && enableCleanup;
    // THE ONE FITTING RULE (proFieldControlFit): Send and "…" always show;
    // the mic and Clear stay inline while the text keeps its floor, and
    // whatever does not fit moves inside "…" — never deleted. A live recording
    // always keeps its stop button. 🚨 There is no device chevron (Arman,
    // 2026-10-16): right-click or hold the mic to choose a microphone, and
    // "…" — whenever it shows — carries "Audio settings".
    const denseField = isDenseField(inputHeight);
    const fit = fitFieldControls({
      fieldWidth: inputWidth,
      sizes: controlSizes({ coarse: coarsePointer, dense: denseField }),
      fixedPx: (startIcon ? 36 : 12) + PRO_INPUT_TEXT_GAP_PX,
      hasSubmit: !!onSubmit,
      menuHasOwnItems: !disabled && (showCopyButton || cleanupEligible || hasContent),
      mic: showMic,
      clear: showClear,
      expand: false,
    });
    const voiceBusy = isRecording || isTranscribing;
    const showMicInline = showMic && (fit.mic === "inline" || voiceBusy);
    const voiceInMenu = showMic && !showMicInline;
    const clearInline = showClear && fit.clearInline;
    const clearInMenu = showClear && !fit.clearInline;
    const showMenu =
      !disabled &&
      (showCopyButton || cleanupEligible || voiceInMenu || clearInMenu || hasContent);
    // Whenever "…" shows on a field that takes voice, it carries Audio settings.
    const audioSettingsInMenu = showMenu && enableVoice;
    const rightPadding = rightPaddingClass(!!onSubmit, clearInline);
    const auxVisible =
      (showHoverControls || menuOpen) && (showMicInline || showMenu);
    const measuredRightPadding = reservedRightPaddingPx({
      clusterWidth: clusterWidths.cluster,
      auxWidth: clusterWidths.aux,
      auxVisible,
    });

    const isInvalid =
      props["aria-invalid"] === true || props["aria-invalid"] === "true";
    const labelFloated = isFocused || valueAsString.length > 0;
    const showVoiceStatus = isRecording || (isTranscribing && !isRecording);

    return (
      <div
        className={cn("relative group", wrapperClassName)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={() => {
          if (!isHovered) setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input
          ref={setInputRef}
          id={inputId}
          type={type}
          placeholder={floatingLabel ? undefined : placeholder}
          className={cn(
 "flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-base placeholder:text-sm shadow-sm placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            startIcon && "pl-9",
            rightPadding,
            className,
          )}
          style={
            measuredRightPadding === null
              ? INPUT_IOS_STYLE
              : { ...INPUT_IOS_STYLE, paddingRight: measuredRightPadding }
          }
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          {...props}
        />

        {startIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
            {startIcon}
          </div>
        )}

        {floatingLabel && inputId && (
          <Label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 px-1 pointer-events-none transition-all duration-200 ease-in-out z-10 bg-card",
              labelFloated ? "-top-2 text-xs" : "top-2 text-sm",
              isInvalid
                ? "text-destructive"
                : isFocused
                  ? "text-primary"
                  : "text-muted-foreground",
              disabled && "opacity-50",
            )}
          >
            {floatingLabel}
          </Label>
        )}

        {/* Right control cluster — submit/clear always visible when enabled;
            mic + "…" menu fade in only on pointer hover (never focus), and
            while they show the input reserves their measured width as right
            padding, so they never cover text. The menu stays visible while its popover is open so
            it can't vanish mid-interaction. Transparent tap buttons sit flush
            inside the h-9 field without glass borders touching the input edge. */}
        {/* A GLASS PLANE (tap-target placement rule 1): the cluster rides
            over the field's own scrolling text, so its glass buttons
            legitimately float — the guard reads the marker. */}
        {/* A press here never takes focus from the field: a narrow field
            reveals this cluster on FOCUS, and the blur used to hide it
            before the click landed (2026-10-05). */}
        <div
          ref={setClusterNode}
          onMouseDown={(e) => e.preventDefault()}
          data-matrx-glass-plane
          data-matrx-tap-dense={denseField ? "" : undefined}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center z-10"
        >
          <div
            ref={auxRef}
            className={cn(
              "flex items-center transition-opacity duration-200",
              showHoverControls || menuOpen
                ? "opacity-100"
                : "opacity-0 pointer-events-none",
            )}
          >
            {showMicInline && (
              <MicButton
                dense={denseField}
                tabIndex={auxiliaryControlsTabIndex}
                onMicClick={handleVoiceClick}
                disabled={isVoiceDisabled}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                audioLevel={audioLevel}
                micAriaLabel={
                  isRecording
                    ? auxiliaryControlsLabel
                      ? `Stop recording for ${auxiliaryControlsLabel}`
                      : "Stop recording"
                    : auxiliaryControlsLabel
                      ? `Start voice input for ${auxiliaryControlsLabel}`
                      : "Start voice input"
                }
              />
            )}

            {showMenu && (
              <Popover open={menuOpen} onOpenChange={handleMenuOpenChange}>
                <PopoverTrigger asChild>
                  {hasCopied ? (
                    <CheckTapButton
                      tabIndex={auxiliaryControlsTabIndex}
                      variant="transparent"
                      ariaLabel={
                        auxiliaryControlsLabel
                          ? `Copied ${auxiliaryControlsLabel}`
                          : "Copied"
                      }
                      tooltip="Copied"
                      className="text-green-500"
                    />
                  ) : (
                    <MoreHorizontalTapButton
                      tabIndex={auxiliaryControlsTabIndex}
                      variant="transparent"
                      ariaLabel={
                        auxiliaryControlsLabel
                          ? `More options for ${auxiliaryControlsLabel}`
                          : "More options"
                      }
                      tooltip="More"
                      className="text-muted-foreground"
                    />
                  )}
                </PopoverTrigger>
                <PopoverContent
                  /* sizing: fixed — fixed multi-mode menu (short action list vs. cleanup-agent panel), not a single content-sized value */
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  className={menuMode === "menu" ? "w-48 p-1" : "w-80 p-0"}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {menuMode === "menu" ? (
                    <div className="flex flex-col p-1">
                      {clearInMenu && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            handleClear();
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <X className="h-4 w-4" />
                          Clear
                        </button>
                      )}
                      <ReadAloudMenuRow
                        text={valueAsString}
                        onDone={() => setMenuOpen(false)}
                      />
                      {voiceInMenu && (
                        <button
                          type="button"
                          disabled={isVoiceDisabled}
                          onClick={() => {
                            setMenuOpen(false);
                            handleVoiceClick();
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          <Mic className="h-4 w-4" />
                          Voice input
                        </button>
                      )}
                      {audioSettingsInMenu && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            openAudioDevices();
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Audio settings
                        </button>
                      )}
                      {audioSettingsInMenu &&
                        (showCopyButton || cleanupEligible) && (
                          <div
                            className="my-1 h-px bg-border"
                            role="separator"
                          />
                        )}
                      {showCopyButton && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopy();
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      )}
                      {showCopyButton && cleanupEligible && (
                        <div className="my-1 h-px bg-border" role="separator" />
                      )}
                      {cleanupEligible && (
                        <button
                          type="button"
                          onClick={openCleanup}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <AGENT_ICON className="h-4 w-4 text-primary" />
                          Clean up
                        </button>
                      )}
                    </div>
                  ) : (
                    <ProTextAgentActionPopoverBody
                      title="Clean up"
                      phase={cleanupAction.phase}
                      isBusy={cleanupAction.isBusy}
                      isThinking={cleanupAction.isThinking}
                      result={cleanupAction.result}
                      error={cleanupAction.error}
                      agentName={selectedCleanupAgentName}
                      onSelectAgent={(agentId) => {
                        setSelectedCleanupAgent(agentId);
                        setSelectedCleanupAgentName(null);
                      }}
                      onRun={runCleanup}
                      canRun={
                        Boolean(selectedCleanupAgent) && !cleanupAction.isBusy
                      }
                      onApply={applyCleanup}
                      onBack={() => {
                        setMenuMode("menu");
                        setSelectedCleanupAgent(null);
                        setSelectedCleanupAgentName(null);
                        cleanupAction.reset();
                      }}
                      onCancel={() => setMenuOpen(false)}
                    />
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {clearInline && (
            <XTapButton
              variant="transparent"
              onClick={handleClear}
              ariaLabel="Clear"
              tooltip="Clear"
              className="text-muted-foreground"
            />
          )}

          {onSubmit &&
            (isSubmitting ? (
              <LoadingTapButton
                variant="transparent"
                ariaLabel={submitLabel}
                tooltip={submitLabel}
                className="text-primary"
              />
            ) : (
              <SendTapButton
                variant="transparent"
                onClick={triggerSubmit}
                disabled={!canSubmit}
                ariaLabel={submitLabel}
                tooltip={submitLabel}
                className={canSubmit ? "text-primary" : "text-muted-foreground"}
              />
            ))}
        </div>

        {showVoiceStatus && (
          <div className="absolute left-0 top-full mt-1 flex items-center gap-1.5 px-2 py-1 rounded-md max-w-full">
            {isRecording ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 dark:bg-primary/15 rounded-md max-w-full">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-2 h-2 bg-primary rounded-full flex-shrink-0"
                />
                <span className="type-secondary text-primary font-medium truncate">
                  {liveTranscript ? liveTranscript.slice(-60) : "Listening..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="type-secondary text-blue-600 dark:text-blue-400 font-medium">
                  Finalizing...
                </span>
              </div>
            )}
          </div>
        )}

        <VoiceTroubleshootingModal
          isOpen={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
          error={lastError?.message}
          errorCode={lastError?.code}
        />

        <AlertDialog
          open={showTranscriptionWarning}
          onOpenChange={setShowTranscriptionWarning}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {isRecording || isTranscribing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <AlertDialogTitle>
                      {isRecording
                        ? "Recording in Progress"
                        : "Transcription in Progress"}
                    </AlertDialogTitle>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <AlertDialogTitle>Voice Input Complete</AlertDialogTitle>
                  </>
                )}
              </div>
              <AlertDialogDescription>
                {isRecording ? (
                  <>
                    Your voice is currently being recorded. If you close now,
                    the recording will be stopped and lost.
                  </>
                ) : isTranscribing ? (
                  <>
                    Your voice recording is currently being transcribed. If you
                    close now, the transcription will be lost.
                  </>
                ) : (
                  <>
                    Your voice input has been processed successfully! You can
                    now safely close this panel.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {isRecording || isTranscribing ? (
                <>
                  <AlertDialogCancel onClick={cancelClose}>
                    Cancel & Wait
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmClose}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRecording ? "Stop Recording" : "End Transcription"}
                  </AlertDialogAction>
                </>
              ) : (
                <AlertDialogAction onClick={confirmClose}>
                  Close
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  },
);

ProInput.displayName = "ProInput";
