"use client";
import React, { useRef, useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { LucideIcon, Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type MenuItemAction = () => void | Promise<void>;

export interface MenuItem {
  key: string;
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  description?: string;
  action: MenuItemAction;
  category?: string;
  disabled?: boolean;
  showToast?: boolean; // Default true
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface AdvancedMenuProps {
  // Core
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  
  // Header
  title?: string;
  description?: string;
  showHeader?: boolean; // Default true
  
  // Positioning
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right" | "center";
  anchorElement?: HTMLElement | null;
  
  // Styling
  className?: string;
  width?: string; // Default "280px"
  maxWidth?: string; // Default "320px"
  zIndex?: number; // Menu z-index, Default 9999
  backdropZIndex?: number; // Backdrop z-index, Default 9998
  
  // Behavior
  closeOnAction?: boolean; // Default true for non-async, false for async
  showBackdrop?: boolean; // Default true
  backdropBlur?: boolean; // Default true
  categorizeItems?: boolean; // Default true if items have categories
  
  // Mobile
  forceMobileCenter?: boolean; // Force center positioning on mobile
  
  // Callbacks
  onActionStart?: (key: string) => void;
  onActionSuccess?: (key: string) => void;
  onActionError?: (key: string, error: any) => void;
}

type ActionState = "idle" | "loading" | "success" | "error";

const AdvancedMenu: React.FC<AdvancedMenuProps> = ({
  isOpen,
  onClose,
  items,
  title = "Options",
  description,
  showHeader = true,
  position = "bottom-left",
  anchorElement,
  className = "",
  width = "280px",
  maxWidth = "320px",
  zIndex = 9999,
  backdropZIndex = 9998,
  closeOnAction = true,
  showBackdrop = true,
  backdropBlur = true,
  categorizeItems = true,
  forceMobileCenter = true,
  onActionStart,
  onActionSuccess,
  onActionError,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Track if component is mounted for portal rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate menu position with intelligent viewport-aware positioning
  useEffect(() => {
    if (!isOpen || !anchorElement) {
      setMenuPosition(null);
      return;
    }

    // Wait for next frame to ensure menu is rendered
    requestAnimationFrame(() => {
      if (!menuRef.current) return;

      const rect = anchorElement.getBoundingClientRect();
      const menuWidth = parseInt(width) || 280;
      const menuHeight = menuRef.current.scrollHeight || menuRef.current.offsetHeight;
      const gap = 8; // Gap from trigger
      const edgePadding = 12; // Padding from viewport edges

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      // Handle center positioning
      if (position === "center" || (isMobile && forceMobileCenter)) {
        top = Math.max(edgePadding, (viewportHeight - menuHeight) / 2);
        left = Math.max(edgePadding, (viewportWidth - menuWidth) / 2);
        setMenuPosition({ top, left });
        return;
      }

      // Determine preferred vertical position
      const preferBottom = position.includes("bottom");
      const spaceBelow = viewportHeight - rect.bottom - gap - edgePadding;
      const spaceAbove = rect.top - gap - edgePadding;

      // Choose vertical position based on available space
      if (preferBottom && spaceBelow >= menuHeight) {
        // Enough space below, use bottom position
        top = rect.bottom + gap;
      } else if (!preferBottom && spaceAbove >= menuHeight) {
        // Enough space above, use top position
        top = rect.top - menuHeight - gap;
      } else if (spaceBelow > spaceAbove) {
        // More space below, even if not ideal
        top = rect.bottom + gap;
      } else {
        // More space above
        top = rect.top - menuHeight - gap;
      }

      // Ensure menu doesn't go off top or bottom
      if (top < edgePadding) {
        top = edgePadding;
      } else if (top + menuHeight > viewportHeight - edgePadding) {
        top = viewportHeight - menuHeight - edgePadding;
      }

      // Determine horizontal position
      const preferRight = position.includes("right");
      
      if (preferRight) {
        // Try to align right edge
        left = rect.right - menuWidth;
      } else {
        // Try to align left edge
        left = rect.left;
      }

      // Ensure menu doesn't go off left or right
      if (left < edgePadding) {
        left = edgePadding;
      } else if (left + menuWidth > viewportWidth - edgePadding) {
        left = viewportWidth - menuWidth - edgePadding;
      }

      setMenuPosition({ top, left });
    });
  }, [isOpen, anchorElement, position, width, isMobile, forceMobileCenter, items]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Action state management
  const setActionState = (key: string, state: ActionState) => {
    setActionStates((prev) => ({ ...prev, [key]: state }));
    if (state === "success" || state === "error") {
      setTimeout(() => {
        setActionStates((prev) => ({ ...prev, [key]: "idle" }));
      }, 2000);
    }
  };

  const getActionState = (key: string): ActionState => {
    return actionStates[key] || "idle";
  };

  // Handle action execution
  const handleAction = async (item: MenuItem) => {
    if (item.disabled) return;

    const state = getActionState(item.key);
    if (state === "loading") return;

    try {
      setActionState(item.key, "loading");
      onActionStart?.(item.key);

      const result = item.action();
      
      // Check if action is async
      if (result instanceof Promise) {
        await result;
      }

      setActionState(item.key, "success");
      onActionSuccess?.(item.key);

      if (item.showToast !== false) {
        toast({
          title: "Success",
          description: item.successMessage || `${item.label} completed`,
        });
      }

      // Close menu after action completes (respects closeOnAction)
      if (closeOnAction) {
        setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      setActionState(item.key, "error");
      onActionError?.(item.key, error);

      if (item.showToast !== false) {
        toast({
          title: "Error",
          description: item.errorMessage || `${item.label} failed`,
          variant: "destructive",
        });
      }
    }
  };

  // Categorize items
  const groupedItems = React.useMemo(() => {
    if (!categorizeItems) {
      return { "": items };
    }

    return items.reduce((acc, item) => {
      const category = item.category || "Actions";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [items, categorizeItems]);

  // Position styles - always use calculated position when available
  const getPositionStyles = () => {
    if (!menuPosition) return {};
    
    return {
      top: `${menuPosition.top}px`,
      left: `${menuPosition.left}px`
    };
  };

  if (!isOpen || !mounted) return null;

  // Calculate max height to prevent overflow - more conservative to ensure it fits
  const maxMenuHeight = isMobile 
    ? "calc(100vh - 24px)" 
    : "calc(100vh - 24px)";

  const menuContent = (
    <>
      {/* Backdrop Overlay */}
      {showBackdrop && (
        <div
          style={{ zIndex: backdropZIndex }}
          className={cn(
            "fixed inset-0 bg-black/20 dark:bg-black/40",
            backdropBlur && "backdrop-blur-[2px]"
          )}
          onClick={onClose}
        />
      )}

      {/* Menu */}
      <div
        ref={menuRef}
        style={{ 
          minWidth: width, 
          maxWidth,
          maxHeight: maxMenuHeight,
          zIndex: zIndex,
          ...getPositionStyles()
        }}
        className={cn(
          "fixed bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]",
          "rounded-lg border border-zinc-300 dark:border-zinc-600",
          "overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200",
          className
        )}
      >
        {/* Header - Minimal */}
        {showHeader && title && (
          <div className="px-2.5 py-1.5 border-b border-zinc-200/60 dark:border-zinc-700/60">
            <h3 className="text-[11px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          </div>
        )}

        {/* Menu Content - iOS-Style Minimal */}
        <div className="overflow-y-auto scrollbar-thin">
          {Object.entries(groupedItems).map(([category, categoryItems], catIndex) => (
            <div key={category}>
              {/* Category Header - Minimal */}
              {categorizeItems && category && catIndex > 0 && (
                <div className="px-2.5 pt-2 pb-1">
                  <h4 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {category}
                  </h4>
                </div>
              )}

              {/* Category Items - iOS Style: Icon + Label Only */}
              <div className="px-1.5 py-0.5">
                {categoryItems.map((item) => {
                  const state = getActionState(item.key);
                  const Icon = item.icon;
                  const isLoading = state === "loading";
                  const isSuccess = state === "success";
                  const isError = state === "error";
                  const isDisabled = item.disabled || isLoading;

                  return (
                    <button
                      key={item.key}
                      onClick={() => !isDisabled && handleAction(item)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md",
                        "text-left transition-all duration-150",
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/70 active:scale-[0.98]",
                        isSuccess && "bg-green-50 dark:bg-green-900/20",
                        isError && "bg-red-50 dark:bg-red-900/20",
                        "group"
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 transition-transform duration-150",
                          !isDisabled && "group-hover:scale-110"
                        )}
                      >
                        {isLoading ? (
                          <Loader2
                            size={15}
                            className="animate-spin text-gray-400 dark:text-gray-500"
                          />
                        ) : isSuccess ? (
                          <Check
                            size={15}
                            className="text-green-500 dark:text-green-400"
                          />
                        ) : (
                          <Icon
                            size={15}
                            className={item.iconColor || "text-gray-600 dark:text-gray-400"}
                          />
                        )}
                      </div>

                      {/* Label Only - iOS Style */}
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "text-[13px] font-medium",
                            isSuccess && "text-green-700 dark:text-green-300",
                            isError && "text-red-700 dark:text-red-300",
                            !isSuccess && !isError && "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {item.label}
                        </span>
                        {item.disabled && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 font-medium">
                            SOON
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // Render menu in a portal to avoid overflow-hidden issues
  return createPortal(menuContent, document.body);
};

export default AdvancedMenu;

