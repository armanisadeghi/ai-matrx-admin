// features/applet/runner/header/navigation-menu/useMenuAnimations.ts
'use client'

import { useEffect, useState } from "react";

interface UseMenuAnimationsProps {
    enabled: boolean;
    userIsCreator: boolean;
    firstListenerId?: string | null;
    customTrigger?: string | null;
}

export const useMenuAnimations = ({
    enabled,
    userIsCreator,
    firstListenerId,
    customTrigger,
}: UseMenuAnimationsProps) => {
    const [prevListenerId, setPrevListenerId] = useState<string | null>(null);
    const [prevCustomTrigger, setPrevCustomTrigger] = useState<string | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);

    // Track listenerId changes to trigger the animation effect
    useEffect(() => {
        if (!enabled) return;

        if (firstListenerId && firstListenerId !== prevListenerId) {
            setPrevListenerId(firstListenerId);
            setShowAnimation(true);
            // Reset animation after 3 seconds
            const timer = setTimeout(() => {
                setShowAnimation(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [enabled, firstListenerId, prevListenerId]);

    // Track custom trigger changes
    useEffect(() => {
        if (!enabled) return;

        if (customTrigger && customTrigger !== prevCustomTrigger) {
            setPrevCustomTrigger(customTrigger);
            setShowAnimation(true);
            // Reset animation after 3 seconds
            const timer = setTimeout(() => {
                setShowAnimation(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [enabled, customTrigger, prevCustomTrigger]);

    // Add CSS for animation when component mounts
    useEffect(() => {
        if (!enabled) return;

        const shouldShowAnimationStyles = userIsCreator || showAnimation;
        
        if (shouldShowAnimationStyles) {
            // Add the animation styles to the document if they don't exist
            if (!document.getElementById("creator-animation-styles")) {
                const styleSheet = document.createElement("style");
                styleSheet.id = "creator-animation-styles";
                styleSheet.innerHTML = `
          @keyframes creator-pulse {
            0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
            50% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3); }
            100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          }
          
          .creator-button {
            position: relative;
          }
          
          .creator-button::after {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border-radius: 9999px;
            z-index: -1;
            animation: creator-pulse 2s 1.5;
            animation-fill-mode: forwards;
          }
          
          .creator-menu-highlight {
            position: relative;
          }
          
          .creator-menu-highlight::before {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: 0.375rem;
            border: 1px solid transparent;
            background: linear-gradient(90deg, rgba(245, 158, 11, 0.7), rgba(249, 115, 22, 0.7), rgba(217, 70, 239, 0.7), rgba(245, 158, 11, 0.7));
            background-size: 400% 100%;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            animation: gradient-rotate 3s ease;
            animation-fill-mode: forwards;
          }
          
          @keyframes gradient-rotate {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `;
                document.head.appendChild(styleSheet);
            }
            
            // Remove animation classes after 3 seconds
            const timer = setTimeout(() => {
                const menuElements = document.querySelectorAll(".creator-menu-highlight");
                const buttonElements = document.querySelectorAll(".creator-button");
                menuElements.forEach((element) => {
                    element.classList.remove("creator-menu-highlight");
                });
                buttonElements.forEach((element) => {
                    element.classList.remove("creator-button");
                });
            }, 3000);
            
            return () => {
                clearTimeout(timer);
                // Clean up is optional since this is a persistent component
                const styleSheet = document.getElementById("creator-animation-styles");
                if (styleSheet && !userIsCreator && !showAnimation) {
                    styleSheet.remove();
                }
            };
        }
    }, [enabled, userIsCreator, showAnimation]);

    const shouldShowAnimation = enabled && (userIsCreator || showAnimation);
    const creatorAnimClass = shouldShowAnimation ? "creator-menu-highlight" : "";
    const creatorButtonClass = shouldShowAnimation ? "creator-button" : "";

    return {
        shouldShowAnimation,
        creatorAnimClass,
        creatorButtonClass,
    };
};