"use client";

/**
 * Google brand marks — the ONE place every "Google" mention in the app gets its official mark.
 * Always full colour (Google's brand guidelines forbid recolouring the G or product icons).
 * Built on the shared connector artwork in `@ai-matrx/chat`, plus Slides and the official
 * "Sign in with Google" / "Continue with Google" button (Google Identity branding guidelines).
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  GmailMark as PkgGmail,
  GoogleCalendarMark as PkgCalendar,
  GoogleDocsMark as PkgDocs,
  GoogleDriveMark as PkgDrive,
  GoogleMark as PkgGoogle,
  GoogleSheetsMark as PkgSheets,
} from "@/features/connectors/marks";

type MarkProps = { className?: string };

export function GoogleG({ className = "size-4" }: MarkProps) {
  return <PkgGoogle colored className={className} />;
}
export function GoogleDriveLogo({ className = "size-4" }: MarkProps) {
  return <PkgDrive colored className={className} />;
}
export function GoogleSheetsLogo({ className = "size-4" }: MarkProps) {
  return <PkgSheets colored className={className} />;
}
export function GoogleDocsLogo({ className = "size-4" }: MarkProps) {
  return <PkgDocs colored className={className} />;
}
export function GoogleCalendarLogo({ className = "size-4" }: MarkProps) {
  return <PkgCalendar colored className={className} />;
}
export function GmailLogo({ className = "size-4" }: MarkProps) {
  return <PkgGmail colored className={className} />;
}

/** Google Slides — the yellow page with the presentation frame. */
export function GoogleSlidesLogo({ className = "size-4" }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#F4B400" d="M14.5 1H6a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.5L14.5 1Z" />
      <path fill="#F8D775" d="M14.5 1v4a1.5 1.5 0 0 0 1.5 1.5h4L14.5 1Z" />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M7.5 10.5h9v7h-9v-7Zm1.3 1.3v4.4h6.4v-4.4H8.8Z"
      />
    </svg>
  );
}

export type GoogleProduct = "google" | "drive" | "sheets" | "docs" | "slides" | "calendar" | "gmail";

const PRODUCT_MARKS: Record<GoogleProduct, (p: MarkProps) => ReactNode> = {
  google: GoogleG,
  drive: GoogleDriveLogo,
  sheets: GoogleSheetsLogo,
  docs: GoogleDocsLogo,
  slides: GoogleSlidesLogo,
  calendar: GoogleCalendarLogo,
  gmail: GmailLogo,
};

/** `<GoogleProductMark product="sheets" />` — pick the product by name. */
export function GoogleProductMark({ product, className }: { product: GoogleProduct; className?: string }) {
  return <>{PRODUCT_MARKS[product]({ className })}</>;
}

export type GoogleButtonTheme = "light" | "dark" | "neutral";
export type GoogleButtonText = "signin_with" | "continue_with" | "signup_with" | "connect";

const THEME_STYLE: Record<GoogleButtonTheme, { bg: string; border: string; color: string }> = {
  light: { bg: "#FFFFFF", border: "1px solid #747775", color: "#1F1F1F" },
  dark: { bg: "#131314", border: "1px solid #8E918F", color: "#E3E3E3" },
  neutral: { bg: "#F2F2F2", border: "1px solid transparent", color: "#1F1F1F" },
};
const TEXT: Record<GoogleButtonText, string> = {
  signin_with: "Sign in with Google",
  continue_with: "Continue with Google",
  signup_with: "Sign up with Google",
  connect: "Connect Google",
};

/**
 * The official Google button (Google Identity branding guidelines): 40px tall, 12px side padding,
 * 20px G, 10px gap, Roboto Medium 14px, fixed Google colours per theme (never app theme tokens).
 */
export function GoogleSignInButton({
  theme = "light",
  text = "continue_with",
  label,
  shape = "pill",
  style,
  children,
  ...rest
}: {
  theme?: GoogleButtonTheme;
  text?: GoogleButtonText;
  /** Overrides the standard wording — only for a context Google's wording cannot fit. */
  label?: string;
  shape?: "pill" | "rectangular";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = THEME_STYLE[theme];
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 40,
        padding: "0 12px",
        borderRadius: shape === "pill" ? 20 : 4,
        background: t.bg,
        border: t.border,
        color: t.color,
        fontFamily: "Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontWeight: 500,
        fontSize: 14,
        lineHeight: "20px",
        cursor: rest.disabled ? "default" : "pointer",
        opacity: rest.disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <GoogleG className="size-5 shrink-0" />
      <span>{children ?? label ?? TEXT[text]}</span>
    </button>
  );
}
