'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Globe, FileText, Tags, MoreHorizontal,
    Search, Image, DollarSign, BookOpen, FlaskConical, Bot, Settings2, Brain,
} from 'lucide-react';
import { RESEARCH_NAV_ITEMS } from '../../constants';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import LiquidGlass from 'liquid-glass-react';

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
    LayoutDashboard, Globe, FileText, Tags, Search, Image, DollarSign,
    BookOpen, FlaskConical, Bot, Settings2, Brain,
};

// Pill dimensions
const PILL_W = 54;
const PILL_H = 32;

interface ResearchMobileNavProps {
    topicId: string;
}

export function ResearchMobileNav({ topicId }: ResearchMobileNavProps) {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const [pillX, setPillX] = useState<number | null>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const { resolvedTheme } = useTheme();

    const isLight = resolvedTheme === 'light';

    const visibleItems = RESEARCH_NAV_ITEMS.filter(i => i.mobileVisible);
    const hiddenItems = RESEARCH_NAV_ITEMS.filter(i => !i.mobileVisible);

    const activeIndex = visibleItems.findIndex((item) => {
        const href = item.href(topicId);
        return item.key === 'topic' ? pathname === href : pathname.startsWith(href);
    });

    useEffect(() => {
        const nav = navRef.current;
        const activeEl = itemRefs.current[activeIndex];
        if (!nav || !activeEl) {
            setPillX(null);
            return;
        }
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        setPillX(itemRect.left - navRect.left + itemRect.width / 2);
    }, [activeIndex, pathname]);

    return (
        <>
            {/*
              * Global scoped reset: LiquidGlass renders an inner <div className="glass">
              * which collides with our project's .glass CSS class (adds bg tint + blur on top).
              * This style tag neutralizes it only inside the liquid-glass-react wrappers.
              */}
            <style>{`
                .lg-react-wrapper .glass {
                    background: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `}</style>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe px-4 pointer-events-none">
                <div
                    ref={navRef}
                    className="relative flex items-center justify-around h-11 glass-strong rounded-[22px] shadow-lg border border-white/[0.08] mb-1.5 pointer-events-auto overflow-hidden"
                >
                    {pillX !== null && (
                        <div
                            aria-hidden
                            className="lg-react-wrapper"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                width: PILL_W,
                                height: PILL_H,
                                transform: `translateX(${pillX - PILL_W / 2}px) translateY(-50%)`,
                                transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                                zIndex: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            <LiquidGlass
                                mouseContainer={navRef}
                                displacementScale={100}
                                blurAmount={0.5}
                                saturation={140}
                                aberrationIntensity={2}
                                elasticity={0.15}
                                cornerRadius={999}
                                padding="0px"
                                mode="prominent"
                                overLight={isLight}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: PILL_W,
                                    height: PILL_H,
                                    pointerEvents: 'none',
                                }}
                            >
                                <div style={{ width: PILL_W, height: PILL_H }} />
                            </LiquidGlass>
                        </div>
                    )}

                    {visibleItems.map((item, i) => {
                        const Icon = ICON_MAP[item.icon];
                        const href = item.href(topicId);
                        const isActive = i === activeIndex;

                        return (
                            <div
                                key={item.key}
                                ref={el => { itemRefs.current[i] = el; }}
                                className="relative flex items-center justify-center w-[44px] h-[44px]"
                            >
                                <Link
                                    href={href}
                                    aria-label={item.label}
                                    title={item.label}
                                    className={cn(
                                        'relative z-10 flex items-center justify-center w-full h-full transition-colors duration-200',
                                        isActive ? 'text-primary' : 'text-muted-foreground',
                                    )}
                                >
                                    {Icon && (
                                        <Icon
                                            className={cn(
                                                'h-[20px] w-[20px] transition-all duration-200',
                                                isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)] scale-110',
                                            )}
                                        />
                                    )}
                                </Link>
                            </div>
                        );
                    })}

                    <button
                        onClick={() => setMoreOpen(true)}
                        aria-label="More navigation options"
                        title="More"
                        className="relative z-10 flex items-center justify-center w-[44px] h-[44px] text-muted-foreground transition-colors"
                    >
                        <MoreHorizontal className="h-[20px] w-[20px]" />
                    </button>
                </div>
            </nav>

            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
                <DrawerContent className="max-h-[60dvh]">
                    <DrawerTitle className="sr-only">More options</DrawerTitle>
                    <div className="p-3 space-y-0.5 overflow-y-auto overscroll-contain pb-safe">
                        {hiddenItems.map((item) => {
                            const Icon = ICON_MAP[item.icon];
                            const href = item.href(topicId);
                            const isActive = item.key === 'topic'
                                ? pathname === href
                                : pathname.startsWith(href);

                            if (item.comingSoon) {
                                return (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-default"
                                    >
                                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                        <span className="flex-1">{item.label}</span>
                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-normal">
                                            Soon
                                        </Badge>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.key}
                                    href={href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]',
                                        isActive
                                            ? 'bg-primary/8 text-primary'
                                            : 'text-muted-foreground hover:bg-accent/50',
                                    )}
                                >
                                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}
