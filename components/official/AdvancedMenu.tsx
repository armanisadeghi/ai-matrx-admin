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
  const [adjustedPosition, setAdjustedPosition] = useState<"bottom-left" | "bottom-right" | "top-left" | "top-right" | "center">(position);
  const hasAdjustedRef = useRef(false); // Track if we've already adjusted position
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Track if component is mounted for portal rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate menu position based on anchor element when menu opens
  useEffect(() => {
    if (!isOpen || !anchorElement) {
      setMenuPosition(null);
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const menuWidth = parseInt(width) || 280;
    const menuHeight = 500; // Approximate max height
    const padding = 8; // Gap from trigger
    const viewportPadding = 16; // Padding from viewport edges

    let top = 0;
    let left = 0;

    // Calculate initial position based on preference
    switch (position) {
      case "bottom-left":
        top = rect.bottom + padding;
        left = rect.left;
        break;
      case "bottom-right":
        top = rect.bottom + padding;
        left = rect.right - menuWidth;
        break;
      case "top-left":
        top = rect.top - menuHeight - padding;
        left = rect.left;
        break;
      case "top-right":
        top = rect.top - menuHeight - padding;
        left = rect.right - menuWidth;
        break;
      case "center":
        top = (window.innerHeight - menuHeight) / 2;
        left = (window.innerWidth - menuWidth) / 2;
        setMenuPosition({ top: Math.max(viewportPadding, top), left: Math.max(viewportPadding, left) });
        return;
    }

    // Check if menu would go off screen and adjust
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if going off screen
    if (left + menuWidth > viewportWidth - viewportPadding) {
      // Menu would go off right side, align to right edge
      left = viewportWidth - menuWidth - viewportPadding;
    }
    if (left < viewportPadding) {
      // Menu would go off left side, align to left edge
      left = viewportPadding;
    }

    // Adjust vertical position if going off screen
    if (top + menuHeight > viewportHeight - viewportPadding) {
      // Would go off bottom, try putting it above the trigger
      const topPosition = rect.top - menuHeight - padding;
      if (topPosition >= viewportPadding) {
        top = topPosition;
      } else {
        // Can't fit above or below, center it vertically
        top = Math.max(viewportPadding, (viewportHeight - menuHeight) / 2);
      }
    }
    if (top < viewportPadding) {
      // Would go off top, align to top edge
      top = viewportPadding;
    }

    setMenuPosition({ top, left });
  }, [isOpen, anchorElement, position, width]);

  // Reset adjusted position when menu closes or position prop changes
  useEffect(() => {
    if (!isOpen) {
      setAdjustedPosition(position);
      hasAdjustedRef.current = false;
    } else {
      // When menu opens with a new position, reset the adjustment flag
      setAdjustedPosition(position);
      hasAdjustedRef.current = false;
    }
  }, [isOpen, position]);

  // Adjust position to prevent menu from going off-screen (only once per open)
  useEffect(() => {
    if (!isOpen || !menuRef.current || isMobile || hasAdjustedRef.current) return;

    // Small delay to ensure menu is rendered and positioned
    const timer = setTimeout(() => {
      if (!menuRef.current || hasAdjustedRef.current) return;
      
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const padding = 16; // Padding from viewport edges

      let newPosition = position;

      // Check vertical overflow
      const overflowsTop = menuRect.top < padding;
      const overflowsBottom = menuRect.bottom > viewportHeight - padding;

      // Check horizontal overflow
      const overflowsLeft = menuRect.left < padding;
      const overflowsRight = menuRect.right > viewportWidth - padding;

      // Check if menu is too large for viewport or both directions overflow
      const menuTooTall = menuRect.height > viewportHeight - padding * 2;
      const noGoodPosition = overflowsTop && overflowsBottom;

      // If menu won't fit anywhere or is too large, center it immediately
      if (menuTooTall || noGoodPosition) {
        setAdjustedPosition("center");
        hasAdjustedRef.current = true;
        return; // Exit early, no more adjustments needed
      }

      // Only adjust if current position is causing overflow
      // Adjust vertical position
      if (overflowsTop && !overflowsBottom) {
        // Switch from top to bottom (only if we're not already in a bottom position)
        if (position === "top-left") newPosition = "bottom-left";
        else if (position === "top-right") newPosition = "bottom-right";
      } else if (overflowsBottom && !overflowsTop) {
        // Switch from bottom to top (only if we're not already in a top position)
        if (position === "bottom-left") newPosition = "top-left";
        else if (position === "bottom-right") newPosition = "top-right";
      }

      // Adjust horizontal position
      if (overflowsRight && !overflowsLeft) {
        // Switch from right to left
        if (newPosition === "bottom-right" || newPosition === "top-right") {
          newPosition = newPosition.replace("right", "left") as typeof position;
        }
      } else if (overflowsLeft && !overflowsRight) {
        // Switch from left to right
        if (newPosition === "bottom-left" || newPosition === "top-left") {
          newPosition = newPosition.replace("left", "right") as typeof position;
        }
      }

      // Only update if position actually changed
      if (newPosition !== position) {
        setAdjustedPosition(newPosition);
      }
      
      // Mark that we've done the adjustment
      hasAdjustedRef.current = true;
    }, 10); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [isOpen, position, isMobile]);

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

  // Position classes - uses adjustedPosition to handle viewport overflow
  const getPositionClasses = () => {
    // Mobile always centers if forceMobileCenter is true
    if (isMobile && forceMobileCenter) {
      return "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)]";
    }

    // For portaled menus with anchor element, use fixed positioning
    if (anchorElement && menuPosition) {
      return "fixed";
    }

    // Desktop positioning - uses adjusted position to prevent overflow
    const positionToUse = adjustedPosition;
    
    switch (positionToUse) {
      case "bottom-left":
        // Menu below trigger, aligned left
        return "absolute left-0 top-full mt-2";
      case "bottom-right":
        // Menu below trigger, aligned right
        return "absolute right-0 top-full mt-2";
      case "top-left":
        // Menu above trigger, aligned left
        return "absolute left-0 bottom-full mb-2";
      case "top-right":
        // Menu above trigger, aligned right
        return "absolute right-0 bottom-full mb-2";
      case "center":
        return "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "absolute left-0 top-full mt-2";
    }
  };

  // Get inline styles for positioning when using portal with anchor
  const getPositionStyles = () => {
    if (!anchorElement || !menuPosition) return {};
    
    if (position === "center") {
      return {
        transform: "translate(-50%, -50%)"
      };
    }
    
    return {
      top: `${menuPosition.top}px`,
      left: `${menuPosition.left}px`
    };
  };

  if (!isOpen || !mounted) return null;

  // Calculate max height to prevent overflow
  const maxMenuHeight = isMobile ? "70vh" : "calc(100vh - 32px)";

  const menuContent = (
    <>
      {/* Backdrop Overlay */}
      {showBackdrop && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/20 dark:bg-black/40",
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
          ...getPositionStyles()
        }}
        className={cn(
          getPositionClasses(),
          "z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]",
          "rounded-xl border border-zinc-300 dark:border-zinc-600",
          "overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200",
          className
        )}
      >
        {/* Header */}
        {showHeader && (
          <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/60">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Menu Content */}
        <div className="overflow-y-auto scrollbar-thin">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="py-1">
              {/* Category Header (only show if categorizing and category name exists) */}
              {categorizeItems && category && (
                <div className="px-3 py-0.5">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category}
                  </h4>
                </div>
              )}

              {/* Category Items */}
              <div className="px-2">
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
                        "w-full flex items-start gap-2 px-2.5 py-1.5 rounded-lg",
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
                            size={16}
                            className="animate-spin text-gray-400 dark:text-gray-500"
                          />
                        ) : isSuccess ? (
                          <Check
                            size={16}
                            className="text-green-500 dark:text-green-400"
                          />
                        ) : (
                          <Icon
                            size={16}
                            className={item.iconColor || "text-gray-600 dark:text-gray-400"}
                          />
                        )}
                      </div>

                      {/* Label & Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isSuccess && "text-green-700 dark:text-green-300",
                              isError && "text-red-700 dark:text-red-300",
                              !isSuccess && !isError && "text-gray-900 dark:text-gray-100"
                            )}
                          >
                            {item.label}
                          </span>
                          {item.disabled && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400">
                              Soon
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                            {isLoading
                              ? item.loadingMessage || "Processing..."
                              : isSuccess
                              ? "Done!"
                              : isError
                              ? "Failed"
                              : item.description}
                          </p>
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

