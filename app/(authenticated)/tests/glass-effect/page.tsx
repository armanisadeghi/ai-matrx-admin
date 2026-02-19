"use client";

import { Search, SlidersHorizontal, Plus, Mic, Star, Heart, Zap, Globe, ArrowDown } from "lucide-react";

const GRADIENT_BLOCKS = [
    "bg-gradient-to-r from-rose-500 to-pink-600",
    "bg-gradient-to-r from-violet-500 to-purple-600",
    "bg-gradient-to-r from-blue-500 to-cyan-600",
    "bg-gradient-to-r from-emerald-500 to-teal-600",
    "bg-gradient-to-r from-amber-500 to-orange-600",
    "bg-gradient-to-r from-red-600 to-rose-500",
    "bg-gradient-to-r from-indigo-500 to-blue-600",
    "bg-gradient-to-r from-fuchsia-500 to-pink-500",
    "bg-gradient-to-r from-lime-500 to-green-600",
    "bg-gradient-to-r from-sky-400 to-blue-500",
    "bg-gradient-to-r from-yellow-400 to-amber-500",
    "bg-gradient-to-r from-teal-400 to-cyan-500",
    "bg-gradient-to-r from-rose-500 to-pink-600",
    "bg-gradient-to-r from-violet-500 to-purple-600",
    "bg-gradient-to-r from-blue-500 to-cyan-600",
    "bg-gradient-to-r from-emerald-500 to-teal-600",
];

export default function GlassEffectTestPage() {
    return (
        <div className="relative pb-24">
            {/* Hero instruction area */}
            <div className="bg-gradient-to-b from-indigo-600 to-purple-700 text-white p-6 -mx-1 rounded-b-3xl">
                <div className="flex items-center gap-2 mb-3">
                    <ArrowDown className="w-5 h-5 animate-bounce" />
                    <h1 className="text-xl font-bold">Glass Effect Test</h1>
                </div>
                <p className="text-sm text-white/80 mb-2">
                    Scroll this page. The colored blocks below should blur/show through the
                    header bar at the top. If the header looks like a solid bar, the glass
                    is not working.
                </p>
                <p className="text-sm text-white/80">
                    The floating dock at the bottom should also show color bleeding through
                    when blocks scroll behind it.
                </p>
            </div>

            {/* Section: Inline glass component demos */}
            <div className="p-3 mt-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Glass variants on a colored background
                </h2>
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2 rounded-lg glass text-white text-sm font-medium">
                            .glass
                        </button>
                        <button className="px-4 py-2 rounded-lg glass-subtle text-white text-sm font-medium">
                            .glass-subtle
                        </button>
                        <button className="px-4 py-2 rounded-lg glass-strong text-white text-sm font-medium">
                            .glass-strong
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="h-10 w-10 glass-pill flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex-1 h-10 rounded-full glass-input flex items-center px-3">
                            <Search className="w-4 h-4 text-white/60 mr-2" />
                            <span className="text-sm text-white/60">.glass-input</span>
                        </div>
                    </div>
                    <div className="h-10 rounded-xl glass-header flex items-center px-3">
                        <span className="text-sm text-white font-medium">.glass-header (used on the actual header bar)</span>
                    </div>
                    <div className="h-10 rounded-xl glass-footer flex items-center px-3">
                        <span className="text-sm text-white font-medium">.glass-footer (used on bottom docks)</span>
                    </div>
                </div>
            </div>

            {/* Colorful scrolling blocks */}
            <div className="space-y-3 p-3 mt-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    Scroll these behind the header
                </h2>
                {GRADIENT_BLOCKS.map((gradient, i) => (
                    <div
                        key={i}
                        className={`${gradient} rounded-2xl p-5 text-white shadow-lg`}
                    >
                        <div className="flex items-center gap-3 mb-1">
                            {(() => {
                                const Icon = [Star, Heart, Zap, Globe][i % 4];
                                return <Icon className="w-5 h-5" />;
                            })()}
                            <h3 className="text-base font-bold">Block {i + 1}</h3>
                        </div>
                        <p className="text-sm text-white/70">
                            This color should be visible through the header when scrolled up.
                        </p>
                    </div>
                ))}
            </div>

            {/* Fixed floating dock test */}
            <div className="fixed bottom-0 left-0 right-0 pb-safe z-40 glass-footer">
                <div className="mx-4 my-2">
                    <div className="flex items-center gap-2">
                        <button className="h-10 w-10 flex-shrink-0 glass-pill flex items-center justify-center">
                            <SlidersHorizontal className="h-5 w-5 text-foreground" />
                        </button>

                        <button className="flex-1 flex items-center gap-2 h-10 px-3 rounded-full glass-input">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Search...</span>
                            <span className="ml-auto p-1.5 rounded-full glass-subtle">
                                <Mic className="h-4 w-4 text-muted-foreground" />
                            </span>
                        </button>

                        <button className="h-10 w-10 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
                            <Plus className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
