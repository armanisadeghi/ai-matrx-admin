"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, Smartphone, Monitor,
  ExternalLink, AlertTriangle, Search,
} from "lucide-react";

function parseDisplayUrl(url: string): string {
  if (!url) return "example.com";
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; }
  catch { return url; }
}

function parseBreadcrumb(url: string): string {
  if (!url) return " › category › page";
  try {
    const segs = new URL(url.startsWith("http") ? url : `https://${url}`)
      .pathname.split("/").filter(Boolean);
    return segs.length ? " › " + segs.slice(-3).join(" › ") : " › category › page";
  } catch { return " › category › page"; }
}

function barColor(pct: number) {
  return pct >= 100 ? "#EA4335" : pct >= 85 ? "#FBBC05" : "#34A853";
}

function ProgressBar({ pct, label, detail }: { pct: number; label: string; detail: string }) {
  const color = barColor(pct);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span style={{ color }}>{detail}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DeviceCheck({ icon: Icon, label, ok }: { icon: React.FC<{ className?: string }>; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-700/60 rounded-lg">
      <Icon className="w-3.5 h-3.5 text-zinc-400" />
      <span className="text-xs text-zinc-600 dark:text-zinc-300">{label}</span>
      <span className="ml-auto">
        {ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
      </span>
    </div>
  );
}

export function MetaInputWidget() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState({ titlePx: 0, descPx: 0, titleChars: 0, descChars: 0 });

  const calculate = useCallback(() => {
    const titleChars = title.length;
    const descChars = description.length;
    if (!title && !description) { setMetrics({ titlePx: 0, descPx: 0, titleChars: 0, descChars: 0 }); return; }
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

  const titleDesktopOk = metrics.titlePx <= 580;
  const titleMobileOk  = metrics.titlePx <= 920;
  const titleCharOk    = metrics.titleChars <= 60;
  const descDesktopOk  = metrics.descPx <= 920;
  const descMobileOk   = metrics.descPx <= 680;
  const descCharOk     = metrics.descChars <= 160;
  const hasData = metrics.titlePx > 0 || metrics.descPx > 0 || metrics.titleChars > 0 || metrics.descChars > 0;

  const titlePct     = Math.min((metrics.titlePx / 580) * 100, 100);
  const descPct      = Math.min((metrics.descPx / 920) * 100, 100);
  const titleCharPct = Math.min((metrics.titleChars / 60) * 100, 100);
  const descCharPct  = Math.min((metrics.descChars / 160) * 100, 100);

  const displayUrl  = parseDisplayUrl(url);
  const breadcrumb  = parseBreadcrumb(url);
  const faviconChar = displayUrl.charAt(0).toUpperCase();

  const inputCls = "w-full rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

      {/* ── LEFT: Inputs + Analysis ── */}
      <aside className="xl:col-span-4 space-y-4">

        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Input</h2>
          </div>
          <div className="px-5 py-5 space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Website URL</label>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/category/page"
                  className={`${inputCls} flex-1 h-9`}
                />
                <button
                  onClick={() => console.log("Fetching:", url)}
                  disabled={!url}
                  className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shrink-0 disabled:opacity-40 flex items-center transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Meta Title</label>
                {title && <span className={`text-xs font-medium ${titleCharOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{metrics.titleChars}/60</span>}
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your meta title…" className={`${inputCls} h-9`} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Meta Description</label>
                {description && <span className={`text-xs font-medium ${descCharOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{metrics.descChars}/160</span>}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter your meta description…"
                rows={4}
                className={`${inputCls} py-2 resize-none`}
              />
            </div>
          </div>
        </div>

        {hasData && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Analysis</h2>
            </div>
            <div className="px-5 py-5 space-y-6">
              {title && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wide">Meta Title</span>
                    <span className="ml-auto text-xs text-zinc-400">{metrics.titlePx.toFixed(0)}px</span>
                  </div>
                  <ProgressBar pct={titlePct}     label="Pixel width (desktop 580px)" detail={`${titlePct.toFixed(0)}%`} />
                  <ProgressBar pct={titleCharPct} label="Characters (60 limit)"       detail={`${metrics.titleChars}/60`} />
                  <div className="grid grid-cols-2 gap-2">
                    <DeviceCheck icon={Monitor}    label="Desktop" ok={titleDesktopOk} />
                    <DeviceCheck icon={Smartphone} label="Mobile"  ok={titleMobileOk} />
                  </div>
                </div>
              )}
              {description && (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wide">Meta Description</span>
                    <span className="ml-auto text-xs text-zinc-400">{metrics.descPx.toFixed(0)}px</span>
                  </div>
                  <ProgressBar pct={descPct}     label="Pixel width (desktop 920px)" detail={`${descPct.toFixed(0)}%`} />
                  <ProgressBar pct={descCharPct} label="Characters (160 limit)"      detail={`${metrics.descChars}/160`} />
                  <div className="grid grid-cols-2 gap-2">
                    <DeviceCheck icon={Monitor}    label="Desktop" ok={descDesktopOk} />
                    <DeviceCheck icon={Smartphone} label="Mobile"  ok={descMobileOk} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── RIGHT: SERP Previews ── */}
      <section className="xl:col-span-8 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Live SERP Preview</h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex w-2 h-2 rounded-full ${titleDesktopOk && titleMobileOk && titleCharOk ? "bg-emerald-500" : "bg-red-500"}`} />
              Title
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex w-2 h-2 rounded-full ${descDesktopOk && descMobileOk && descCharOk ? "bg-emerald-500" : "bg-red-500"}`} />
              Description
            </span>
          </div>
        </div>

        {/* Search bar mockup */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Search Preview</span>
          </div>
          {/* White body — authentic Google look */}
          <div className="bg-white px-5 py-4">
            <div className="max-w-[640px] space-y-3">
              <div className="flex items-center gap-3 border border-[#dfe1e5] rounded-full px-5 py-2.5 shadow-sm">
                <Search className="w-4 h-4 text-[#9aa0a6] flex-shrink-0" />
                <span className="text-[#202124] text-sm flex-1 truncate">{title || "Paste your meta title to preview…"}</span>
              </div>
              <div className="flex gap-5 text-xs border-b border-[#dfe1e5] pb-0">
                {["All", "Images", "Videos", "News", "Maps"].map((tab, i) => (
                  <span key={tab} className={`pb-2.5 border-b-2 ${i === 0 ? "border-[#1a73e8] text-[#1a73e8] font-medium" : "border-transparent text-[#70757a]"}`}>
                    {tab}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[#70757a]">About 600,000,000 results (0.54 seconds)</p>
            </div>
          </div>
        </div>

        {/* Desktop SERP result */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <Monitor className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">Desktop</span>
            <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">Max 580px title · 920px description</span>
          </div>
          {/* White body — accurate Google preview */}
          <div className="bg-white px-8 py-6" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-[#f1f3f4] rounded-full flex items-center justify-center text-xs text-[#70757a] font-bold">{faviconChar}</div>
              <div>
                <div className="text-sm text-[#202124] font-medium leading-tight">{displayUrl}</div>
                <div className="text-xs text-[#70757a] leading-tight">{displayUrl}{breadcrumb}</div>
              </div>
            </div>
            <div className="text-xl leading-[1.3] mb-1.5 hover:underline cursor-pointer" style={{ color: "#1a0dab", maxWidth: "600px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: "1rem" }}>Your meta title will appear here…</span>}
            </div>
            <div className="text-sm leading-[1.58] text-[#4d5156]" style={{ maxWidth: "600px" }}>
              {description || <span style={{ color: "#9aa0a6" }}>Your meta description will appear here. This is usually taken from the Meta Description tag if relevant to the query.</span>}
            </div>
            <div className="flex gap-5 text-xs text-[#70757a] mt-2.5">
              <span style={{ color: "#FBBC05" }}>★★★★☆</span>
              <span>$99 – $199</span>
              <span>In stock</span>
            </div>
          </div>
        </div>

        {/* Mobile SERP result */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">Mobile</span>
            <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">Max 920px title · 680px description</span>
          </div>
          {/* White body — accurate Google preview */}
          <div className="bg-white px-4 py-5 max-w-[380px]" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-[#f1f3f4] rounded-full flex items-center justify-center text-[10px] text-[#70757a] font-bold">{faviconChar}</div>
              <div>
                <div className="text-xs text-[#202124] font-medium">{displayUrl}</div>
                <div className="text-[10px] text-[#70757a]">{displayUrl}{breadcrumb}</div>
              </div>
            </div>
            <div className="text-base leading-[1.3] mb-1 hover:underline cursor-pointer" style={{ color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: "0.875rem" }}>Your meta title will appear here…</span>}
            </div>
            <div className="text-xs leading-[1.5] text-[#4d5156]">
              {description || <span style={{ color: "#9aa0a6" }}>Your meta description will appear here with mobile-specific line wrapping applied.</span>}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {hasData && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Recommendations</h2>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {title && (
                <>
                  {!titleDesktopOk && <div className="flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Title exceeds <strong>580px</strong> desktop limit ({metrics.titlePx.toFixed(0)}px) — may be truncated.</span></div>}
                  {!titleMobileOk  && <div className="flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Title exceeds <strong>920px</strong> mobile limit ({metrics.titlePx.toFixed(0)}px) — may be truncated on mobile.</span></div>}
                  {!titleCharOk    && <div className="flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Title has <strong>{metrics.titleChars} characters</strong> — SEO best practice is ≤60 chars.</span></div>}
                  {titleDesktopOk && titleMobileOk && titleCharOk && <div className="flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Title looks great — within pixel and character limits on all devices.</span></div>}
                </>
              )}
              {description && (
                <>
                  {!descDesktopOk && <div className="flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Description exceeds <strong>920px</strong> desktop limit — may be truncated.</span></div>}
                  {!descMobileOk  && <div className="flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Description exceeds <strong>680px</strong> mobile limit — may be truncated on mobile.</span></div>}
                  {!descCharOk    && <div className="flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Description has <strong>{metrics.descChars} characters</strong> — SEO best practice is ≤160 chars.</span></div>}
                  {descDesktopOk && descMobileOk && descCharOk && <div className="flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Description looks great — within pixel and character limits on all devices.</span></div>}
                </>
              )}
              {!title && !description && <p className="text-xs text-zinc-400 dark:text-zinc-500">Enter a title or description above to see recommendations.</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
