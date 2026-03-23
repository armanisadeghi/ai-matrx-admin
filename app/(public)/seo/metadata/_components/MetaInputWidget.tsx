"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Smartphone,
  Monitor,
  ExternalLink,
  AlertTriangle,
  Search,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDisplayUrl(url: string): string {
  if (!url) return "example.com";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function parseBreadcrumb(url: string): string {
  if (!url) return " › category › page";
  try {
    const segments = new URL(url.startsWith("http") ? url : `https://${url}`)
      .pathname.split("/").filter(Boolean);
    if (!segments.length) return " › category › page";
    return " › " + segments.slice(-3).join(" › ");
  } catch {
    return " › category › page";
  }
}

function barColor(pct: number) {
  return pct >= 100 ? "#EA4335" : pct >= 85 ? "#FBBC05" : "#34A853";
}

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ pct, label, detail }: { pct: number; label: string; detail: string }) {
  const color = barColor(pct);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-[#70757a] dark:text-zinc-400">
        <span>{label}</span>
        <span style={{ color }}>{detail}</span>
      </div>
      <div className="h-1.5 bg-[#f1f3f4] dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DeviceCheck({ icon: Icon, label, ok }: { icon: React.ElementType; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] dark:bg-zinc-700/60 rounded-lg">
      <Icon className="w-3.5 h-3.5 text-[#70757a] dark:text-zinc-400" />
      <span className="text-xs text-[#5f6368] dark:text-zinc-300">{label}</span>
      <span className="ml-auto">
        {ok
          ? <CheckCircle className="w-4 h-4 text-[#34A853]" />
          : <XCircle className="w-4 h-4 text-[#EA4335]" />}
      </span>
    </div>
  );
}

// ── main widget ───────────────────────────────────────────────────────────────

export function MetaInputWidget() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState({
    titlePx: 0,
    descPx: 0,
    titleChars: 0,
    descChars: 0,
  });

  const calculate = useCallback(() => {
    const titleChars = title.length;
    const descChars = description.length;

    if (!title && !description) {
      setMetrics({ titlePx: 0, descPx: 0, titleChars: 0, descChars: 0 });
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = "400 20px 'Google Sans', Roboto, Arial, sans-serif";
    const titlePx = title ? ctx.measureText(title).width : 0;

    ctx.font = "400 13px 'Google Sans', Roboto, Arial, sans-serif";
    const descPx = description ? ctx.measureText(description).width : 0;

    setMetrics({ titlePx, descPx, titleChars, descChars });
  }, [title, description]);

  useEffect(() => {
    const t = setTimeout(calculate, 150);
    return () => clearTimeout(t);
  }, [calculate]);

  // limits
  const titleDesktopOk = metrics.titlePx <= 580;
  const titleMobileOk = metrics.titlePx <= 920;
  const titleCharOk = metrics.titleChars <= 60;
  const descDesktopOk = metrics.descPx <= 920;
  const descMobileOk = metrics.descPx <= 680;
  const descCharOk = metrics.descChars <= 160;

  const hasData = metrics.titlePx > 0 || metrics.descPx > 0 || metrics.titleChars > 0 || metrics.descChars > 0;

  const titlePct = Math.min((metrics.titlePx / 580) * 100, 100);
  const descPct = Math.min((metrics.descPx / 920) * 100, 100);
  const titleCharPct = Math.min((metrics.titleChars / 60) * 100, 100);
  const descCharPct = Math.min((metrics.descChars / 160) * 100, 100);

  const displayUrl = parseDisplayUrl(url);
  const breadcrumb = parseBreadcrumb(url);
  const faviconChar = displayUrl.charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

      {/* ── LEFT: Inputs + Analysis ───────────────────────────── */}
      <aside className="xl:col-span-4 space-y-4">

        {/* Input card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-[#dfe1e5] dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f1f3f4] dark:border-zinc-700">
            <h2 className="text-xs font-semibold text-[#5f6368] dark:text-zinc-400 uppercase tracking-wider">Input</h2>
          </div>
          <div className="px-5 py-5 space-y-5">

            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#5f6368] dark:text-zinc-400 uppercase tracking-wide">
                Website URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/category/page"
                  className="flex-1 h-9 text-sm bg-[#f8f9fa] dark:bg-zinc-700 border-[#dfe1e5] dark:border-zinc-600 text-[#202124] dark:text-zinc-100 placeholder:text-[#9aa0a6] dark:placeholder:text-zinc-500 rounded-lg focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8]"
                />
                <Button
                  onClick={() => console.log("Fetching:", url)}
                  disabled={!url}
                  size="sm"
                  className="h-9 px-3 bg-[#1a73e8] hover:bg-[#1765cc] text-white rounded-lg text-xs font-medium shrink-0 disabled:opacity-40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Meta Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#5f6368] dark:text-zinc-400 uppercase tracking-wide">
                  Meta Title
                </label>
                {title && (
                  <span className={`text-xs font-medium ${titleCharOk ? "text-[#34A853]" : "text-[#EA4335]"}`}>
                    {metrics.titleChars}/60
                  </span>
                )}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your meta title…"
                className="h-9 text-sm bg-[#f8f9fa] dark:bg-zinc-700 border-[#dfe1e5] dark:border-zinc-600 text-[#202124] dark:text-zinc-100 placeholder:text-[#9aa0a6] dark:placeholder:text-zinc-500 rounded-lg focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8]"
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#5f6368] dark:text-zinc-400 uppercase tracking-wide">
                  Meta Description
                </label>
                {description && (
                  <span className={`text-xs font-medium ${descCharOk ? "text-[#34A853]" : "text-[#EA4335]"}`}>
                    {metrics.descChars}/160
                  </span>
                )}
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter your meta description…"
                rows={4}
                className="text-sm bg-[#f8f9fa] dark:bg-zinc-700 border-[#dfe1e5] dark:border-zinc-600 text-[#202124] dark:text-zinc-100 placeholder:text-[#9aa0a6] dark:placeholder:text-zinc-500 rounded-lg resize-none focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8]"
              />
            </div>
          </div>
        </div>

        {/* Analysis card */}
        {hasData && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-[#dfe1e5] dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f1f3f4] dark:border-zinc-700">
              <h2 className="text-xs font-semibold text-[#5f6368] dark:text-zinc-400 uppercase tracking-wider">Analysis</h2>
            </div>
            <div className="px-5 py-5 space-y-6">

              {title && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-[#202124] dark:text-zinc-200 uppercase tracking-wide">Meta Title</span>
                    <span className="ml-auto text-xs text-[#70757a] dark:text-zinc-400">{metrics.titlePx.toFixed(0)}px</span>
                  </div>
                  <ProgressBar pct={titlePct} label="Pixel width (desktop 580px)" detail={`${titlePct.toFixed(0)}%`} />
                  <ProgressBar pct={titleCharPct} label="Characters (60 limit)" detail={`${metrics.titleChars}/60`} />
                  <div className="grid grid-cols-2 gap-2">
                    <DeviceCheck icon={Monitor} label="Desktop" ok={titleDesktopOk} />
                    <DeviceCheck icon={Smartphone} label="Mobile" ok={titleMobileOk} />
                  </div>
                </div>
              )}

              {description && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-[#202124] dark:text-zinc-200 uppercase tracking-wide">Meta Description</span>
                    <span className="ml-auto text-xs text-[#70757a] dark:text-zinc-400">{metrics.descPx.toFixed(0)}px</span>
                  </div>
                  <ProgressBar pct={descPct} label="Pixel width (desktop 920px)" detail={`${descPct.toFixed(0)}%`} />
                  <ProgressBar pct={descCharPct} label="Characters (160 limit)" detail={`${metrics.descChars}/160`} />
                  <div className="grid grid-cols-2 gap-2">
                    <DeviceCheck icon={Monitor} label="Desktop" ok={descDesktopOk} />
                    <DeviceCheck icon={Smartphone} label="Mobile" ok={descMobileOk} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── RIGHT: Live SERP Previews ─────────────────────────── */}
      <section className="xl:col-span-8 space-y-4">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#5f6368] dark:text-zinc-400 uppercase tracking-wider">
            Live SERP Preview
          </h2>
          <div className="flex items-center gap-4 text-xs text-[#70757a] dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex w-2 h-2 rounded-full ${titleDesktopOk && titleMobileOk && titleCharOk ? "bg-[#34A853]" : "bg-[#EA4335]"}`} />
              Title
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex w-2 h-2 rounded-full ${descDesktopOk && descMobileOk && descCharOk ? "bg-[#34A853]" : "bg-[#EA4335]"}`} />
              Description
            </span>
          </div>
        </div>

        {/* ── Search bar mockup — updates live with title ── */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-[#dfe1e5] dark:border-zinc-700 shadow-sm px-5 py-4">
          <div className="max-w-[640px] space-y-3">
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-700 border border-[#dfe1e5] dark:border-zinc-600 rounded-full px-5 py-2.5 shadow-[0_1px_6px_rgba(32,33,36,.28)] dark:shadow-[0_1px_6px_rgba(0,0,0,.4)]">
              <Search className="w-4 h-4 text-[#9aa0a6] dark:text-zinc-400 flex-shrink-0" />
              <span className="text-[#202124] dark:text-zinc-200 text-sm flex-1 truncate">
                {title || "Paste your meta title to preview…"}
              </span>
            </div>
            <div className="flex gap-5 text-xs border-b border-[#dfe1e5] dark:border-zinc-600 pb-0">
              {["All", "Images", "Videos", "News", "Maps"].map((tab, i) => (
                <span
                  key={tab}
                  className={`pb-2.5 border-b-2 ${
                    i === 0
                      ? "border-[#1a73e8] text-[#1a73e8] font-medium"
                      : "border-transparent text-[#70757a] dark:text-zinc-400"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#70757a] dark:text-zinc-500">About 600,000,000 results (0.54 seconds)</p>
          </div>
        </div>

        {/* ── Desktop SERP result ── */}
        <div className="rounded-2xl border border-[#dfe1e5] dark:border-zinc-600 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#dfe1e5] dark:border-zinc-600 bg-[#f8f9fa] dark:bg-zinc-700">
            <Monitor className="w-3.5 h-3.5 text-[#70757a] dark:text-zinc-300" />
            <span className="text-xs text-[#5f6368] dark:text-zinc-300 font-medium">Desktop</span>
            <span className="ml-auto text-[10px] text-[#9aa0a6] dark:text-zinc-400">
              Max 580px title · 920px description
            </span>
          </div>
          {/* Always white — accurate Google preview */}
          <div className="bg-white px-8 py-6" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-[#f1f3f4] rounded-full flex items-center justify-center text-xs text-[#70757a] font-bold">
                {faviconChar}
              </div>
              <div>
                <div className="text-sm text-[#202124] font-medium leading-tight">{displayUrl}</div>
                <div className="text-xs text-[#70757a] leading-tight">{displayUrl}{breadcrumb}</div>
              </div>
            </div>
            <div
              className="text-xl leading-[1.3] mb-1.5 hover:underline cursor-pointer"
              style={{ color: "#1a0dab", maxWidth: "600px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {title || <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: "1rem" }}>Your meta title will appear here…</span>}
            </div>
            <div className="text-sm leading-[1.58] text-[#4d5156]" style={{ maxWidth: "600px" }}>
              {description || (
                <span style={{ color: "#9aa0a6" }}>
                  Your meta description will appear here. This is usually taken from the Meta Description tag if relevant to the query.
                </span>
              )}
            </div>
            <div className="flex gap-5 text-xs text-[#70757a] mt-2.5">
              <span style={{ color: "#FBBC05" }}>★★★★☆</span>
              <span>$99 – $199</span>
              <span>In stock</span>
            </div>
          </div>
        </div>

        {/* ── Mobile SERP result ── */}
        <div className="rounded-2xl border border-[#dfe1e5] dark:border-zinc-600 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#dfe1e5] dark:border-zinc-600 bg-[#f8f9fa] dark:bg-zinc-700">
            <Smartphone className="w-3.5 h-3.5 text-[#70757a] dark:text-zinc-300" />
            <span className="text-xs text-[#5f6368] dark:text-zinc-300 font-medium">Mobile</span>
            <span className="ml-auto text-[10px] text-[#9aa0a6] dark:text-zinc-400">
              Max 920px title · 680px description
            </span>
          </div>
          {/* Always white — accurate Google preview */}
          <div className="bg-white px-4 py-5 max-w-[380px]" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-[#f1f3f4] rounded-full flex items-center justify-center text-[10px] text-[#70757a] font-bold">
                {faviconChar}
              </div>
              <div>
                <div className="text-xs text-[#202124] font-medium">{displayUrl}</div>
                <div className="text-[10px] text-[#70757a]">{displayUrl}{breadcrumb}</div>
              </div>
            </div>
            <div
              className="text-base leading-[1.3] mb-1 hover:underline cursor-pointer"
              style={{ color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {title || <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: "0.875rem" }}>Your meta title will appear here…</span>}
            </div>
            <div className="text-xs leading-[1.5] text-[#4d5156]">
              {description || (
                <span style={{ color: "#9aa0a6" }}>
                  Your meta description will appear here with mobile-specific line wrapping applied.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Recommendations ── */}
        {hasData && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-[#dfe1e5] dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f1f3f4] dark:border-zinc-700">
              <h2 className="text-xs font-semibold text-[#5f6368] dark:text-zinc-400 uppercase tracking-wider">
                Recommendations
              </h2>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {title && (
                <>
                  {!titleDesktopOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#EA4335]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Title exceeds <strong>580px</strong> desktop limit ({metrics.titlePx.toFixed(0)}px) — may be truncated.</span>
                    </div>
                  )}
                  {!titleMobileOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#EA4335]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Title exceeds <strong>920px</strong> mobile limit ({metrics.titlePx.toFixed(0)}px) — may be truncated on mobile.</span>
                    </div>
                  )}
                  {!titleCharOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#FBBC05]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Title has <strong>{metrics.titleChars} characters</strong> — SEO best practice is ≤60 chars.</span>
                    </div>
                  )}
                  {titleDesktopOk && titleMobileOk && titleCharOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#34A853]">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Title looks great — within pixel and character limits on all devices.</span>
                    </div>
                  )}
                </>
              )}
              {description && (
                <>
                  {!descDesktopOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#EA4335]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Description exceeds <strong>920px</strong> desktop limit — may be truncated.</span>
                    </div>
                  )}
                  {!descMobileOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#EA4335]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Description exceeds <strong>680px</strong> mobile limit — may be truncated on mobile.</span>
                    </div>
                  )}
                  {!descCharOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#FBBC05]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Description has <strong>{metrics.descChars} characters</strong> — SEO best practice is ≤160 chars.</span>
                    </div>
                  )}
                  {descDesktopOk && descMobileOk && descCharOk && (
                    <div className="flex items-start gap-2.5 text-xs text-[#34A853]">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Description looks great — within pixel and character limits on all devices.</span>
                    </div>
                  )}
                </>
              )}
              {!title && !description && (
                <p className="text-xs text-[#9aa0a6] dark:text-zinc-500">
                  Enter a title or description above to see recommendations.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
