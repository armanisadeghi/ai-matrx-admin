"use client";

import { useState } from "react";
import { Star, Heart, Zap, Globe, Sun, Moon, ArrowDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Inline glass style generator — shows how each CSS property works  */
/* ------------------------------------------------------------------ */
function inlineGlass(opts: {
    bg?: string;
    blur?: number;
    saturate?: number;
    borderOpacity?: number;
}) {
    const { bg = "rgba(39,39,42,0.5)", blur = 20, saturate = 180, borderOpacity = 0.12 } = opts;
    return {
        background: bg,
        backdropFilter: `blur(${blur}px) saturate(${saturate}%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate}%)`,
        border: `1px solid rgba(255,255,255,${borderOpacity})`,
    } as React.CSSProperties;
}

const GRADIENTS = [
    "bg-gradient-to-r from-rose-500 to-pink-600",
    "bg-gradient-to-r from-violet-500 to-purple-600",
    "bg-gradient-to-r from-blue-500 to-cyan-600",
    "bg-gradient-to-r from-emerald-500 to-teal-600",
    "bg-gradient-to-r from-amber-500 to-orange-600",
];

export default function GlassVariationsPage() {
    const [bgOpacity, setBgOpacity] = useState(0.5);
    const [blurPx, setBlurPx] = useState(20);
    const [saturatePct, setSaturatePct] = useState(180);
    const [fadeHeight, setFadeHeight] = useState(3.5);
    const [fadeMaskStop, setFadeMaskStop] = useState(10);

    const liveStyle = inlineGlass({
        bg: `rgba(39,39,42,${bgOpacity})`,
        blur: blurPx,
        saturate: saturatePct,
    });

    return (
        <div className="relative min-h-[200vh] pb-32">
            {/* ============= SECTION 1: Live Playground ============= */}
            <div className="p-4">
                <h1 className="text-lg font-bold mb-1">Glass Effect Playground</h1>
                <p className="text-sm text-muted-foreground mb-4">
                    Drag the sliders to see how each property changes the glass effect in real time.
                    The preview bar at the top of this section uses inline styles generated from your slider values.
                </p>

                {/* Live preview bar */}
                <div className="relative mb-6">
                    <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8">
                        <div
                            className="rounded-xl px-4 py-3 text-white text-sm font-medium"
                            style={liveStyle}
                        >
                            Live Preview — bg: {bgOpacity.toFixed(2)} | blur: {blurPx}px | saturate: {saturatePct}%
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-lg text-white text-xs" style={liveStyle}>
                                Button
                            </div>
                            <div className="flex-1 h-9 rounded-full px-3 flex items-center text-white/60 text-xs" style={liveStyle}>
                                Search input...
                            </div>
                            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={liveStyle}>
                                <Star className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Background Opacity: {bgOpacity.toFixed(2)}
                        </span>
                        <input type="range" min="0" max="1" step="0.01" value={bgOpacity}
                            onChange={e => setBgOpacity(Number(e.target.value))}
                            className="w-full accent-primary" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>0 (clear)</span><span>0.5</span><span>1 (opaque)</span>
                        </div>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Blur: {blurPx}px
                        </span>
                        <input type="range" min="0" max="40" step="1" value={blurPx}
                            onChange={e => setBlurPx(Number(e.target.value))}
                            className="w-full accent-primary" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>0px</span><span>20px</span><span>40px</span>
                        </div>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Saturate: {saturatePct}%
                        </span>
                        <input type="range" min="100" max="300" step="10" value={saturatePct}
                            onChange={e => setSaturatePct(Number(e.target.value))}
                            className="w-full accent-primary" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>100%</span><span>200%</span><span>300%</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* ============= SECTION 2: Opacity Comparison ============= */}
            <div className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Background Opacity Comparison
                </h2>
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-4 space-y-2">
                    {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(opacity => (
                        <div key={opacity} className="flex items-center gap-3">
                            <span className="text-white text-xs font-mono w-8">{opacity}</span>
                            <div
                                className="flex-1 rounded-lg px-3 py-2 text-white text-xs"
                                style={inlineGlass({ bg: `rgba(39,39,42,${opacity})` })}
                            >
                                rgba(39, 39, 42, {opacity}) — backdrop-filter: blur(20px) saturate(180%)
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============= SECTION 3: Blur Comparison ============= */}
            <div className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Blur Intensity Comparison
                </h2>
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 space-y-2">
                    {[0, 4, 8, 12, 16, 20, 28, 36].map(blur => (
                        <div key={blur} className="flex items-center gap-3">
                            <span className="text-white text-xs font-mono w-10">{blur}px</span>
                            <div
                                className="flex-1 rounded-lg px-3 py-2 text-white text-xs"
                                style={inlineGlass({ blur })}
                            >
                                backdrop-filter: blur({blur}px) — bg opacity 0.5
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============= SECTION 4: Utility Class Reference ============= */}
            <div className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Utility Class Reference (current values)
                </h2>
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-4 space-y-2">
                    <div className="rounded-lg px-3 py-2 glass text-white text-xs">
                        <strong>.glass</strong> — standard (buttons, cards) — bg: 0.65, blur: 12px, saturate: 180%
                    </div>
                    <div className="rounded-lg px-3 py-2 glass-subtle text-white text-xs">
                        <strong>.glass-subtle</strong> — lighter (containers, docks) — bg: 0.50, blur: 8px, saturate: 150%
                    </div>
                    <div className="rounded-lg px-3 py-2 glass-strong text-white text-xs">
                        <strong>.glass-strong</strong> — heavy (modals, active states) — bg: 0.82, blur: 20px, saturate: 200%
                    </div>
                    <div className="rounded-lg px-3 py-2 glass-header text-white text-xs">
                        <strong>.glass-header</strong> — fixed header bar — bg: 0.50 (subtle), blur: 20px, + fade gradient below
                    </div>
                    <div className="rounded-lg px-3 py-2 glass-footer text-white text-xs">
                        <strong>.glass-footer</strong> — fixed footer bar — bg: 0.50 (subtle), blur: 20px, + fade gradient above
                    </div>
                    <div className="h-10 rounded-full glass-pill flex items-center justify-center text-white text-xs">
                        <strong>.glass-pill</strong> — round icon buttons — same as .glass + border-radius: 9999px
                    </div>
                    <div className="h-10 rounded-full glass-input flex items-center px-3 text-white text-xs">
                        <strong>.glass-input</strong> — text inputs — bg: subtle, focus: standard
                    </div>
                </div>
            </div>

            {/* ============= SECTION 5: Fade Edge Comparison ============= */}
            <div className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Fade Edge Height + Mask Stop Playground
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                    This simulates the ::after pseudo-element gradient fade. Adjust height and
                    mask-image stop to see the effect on the transition from glass to content.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Fade Height: {fadeHeight.toFixed(1)}rem
                        </span>
                        <input type="range" min="0.5" max="8" step="0.5" value={fadeHeight}
                            onChange={e => setFadeHeight(Number(e.target.value))}
                            className="w-full accent-primary" />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Mask Solid Stop: {fadeMaskStop}%
                        </span>
                        <input type="range" min="0" max="50" step="5" value={fadeMaskStop}
                            onChange={e => setFadeMaskStop(Number(e.target.value))}
                            className="w-full accent-primary" />
                    </label>
                </div>

                {/* Simulated header + fade */}
                <div className="relative bg-gradient-to-b from-indigo-600 via-purple-600 to-pink-600 rounded-2xl overflow-hidden h-64">
                    {/* Fake header */}
                    <div className="glass-header h-10 flex items-center px-4 relative z-10">
                        <span className="text-white text-sm font-medium">Simulated Header</span>
                    </div>
                    {/* Fade gradient (simulated, inline) */}
                    <div
                        className="pointer-events-none"
                        style={{
                            height: `${fadeHeight}rem`,
                            background: `linear-gradient(to bottom, var(--glass-bg-subtle), transparent)`,
                            maskImage: `linear-gradient(to bottom, black ${fadeMaskStop}%, transparent)`,
                            WebkitMaskImage: `linear-gradient(to bottom, black ${fadeMaskStop}%, transparent)`,
                        }}
                    />
                    {/* Content */}
                    <div className="p-4 space-y-2">
                        {["Content scrolling behind the glass header...", "More content here", "And even more below"].map((t, i) => (
                            <div key={i} className="text-white/80 text-sm">{t}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============= SECTION 6: Dark vs Light comparison ============= */}
            <div className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Light base vs Dark base Glass
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-4 space-y-2">
                        <p className="text-white text-xs font-semibold mb-2">White-based glass (light mode)</p>
                        {[0.3, 0.5, 0.65, 0.8].map(o => (
                            <div key={o} className="rounded-lg px-3 py-2 text-sm text-zinc-900"
                                style={inlineGlass({ bg: `rgba(255,255,255,${o})`, borderOpacity: 0.45 })}
                            >
                                white @ {o}
                            </div>
                        ))}
                    </div>
                    <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-4 space-y-2">
                        <p className="text-white text-xs font-semibold mb-2">Dark-based glass (dark mode)</p>
                        {[0.3, 0.5, 0.65, 0.8].map(o => (
                            <div key={o} className="rounded-lg px-3 py-2 text-sm text-white"
                                style={inlineGlass({ bg: `rgba(39,39,42,${o})`, borderOpacity: 0.12 })}
                            >
                                zinc-800 @ {o}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Colorful blocks to scroll behind the real header */}
            <div className="space-y-3 p-4 mt-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    Scroll behind the real app header
                </h2>
                {GRADIENTS.concat(GRADIENTS).map((g, i) => (
                    <div key={i} className={`${g} rounded-2xl p-5 text-white shadow-lg`}>
                        <div className="flex items-center gap-3 mb-1">
                            {(() => { const Icon = [Star, Heart, Zap, Globe][i % 4]; return <Icon className="w-5 h-5" />; })()}
                            <h3 className="text-base font-bold">Block {i + 1}</h3>
                        </div>
                        <p className="text-sm text-white/70">Scroll this behind the app header to see the blur-through.</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
