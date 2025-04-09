import React, { useState, ReactNode, useEffect } from "react";
import { MoreHorizontal, X, ChevronRight, ArrowLeft } from "lucide-react";

// Basic types for menu items
export type MenuItemType = 'default' | 'toggle' | 'submenu' | 'action';

export interface BaseMenuItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  activeIcon?: ReactNode;
  inactiveIcon?: ReactNode;
  disabled?: boolean;
  type: MenuItemType;
  closeOnClick?: boolean;
}

export interface DefaultMenuItem extends BaseMenuItem {
  type: 'default';
  onClick?: () => void;
}

export interface ToggleMenuItem extends BaseMenuItem {
  type: 'toggle';
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

export interface SubmenuMenuItem extends BaseMenuItem {
  type: 'submenu';
  renderSubmenu: (onClose?: () => void, onBack?: () => void) => ReactNode;
}

export interface ActionMenuItem extends BaseMenuItem {
  type: 'action';
  onClick: () => void;
}

export type MenuItem = DefaultMenuItem | ToggleMenuItem | SubmenuMenuItem | ActionMenuItem;

// Props for the main menu component
export interface MobileMenuProps {
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  title?: string;
  closeButtonText?: string;
  isDisabled?: boolean;
  onOpenStateChange?: (isOpen: boolean) => void;
  menuItems: MenuItem[];
}

// Simple Mobile Menu component
const MobileMenu: React.FC<MobileMenuProps> = ({
  triggerIcon = <MoreHorizontal size={20} />,
  triggerClassName = "p-2 rounded-full text-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700",
  title = "Menu",
  closeButtonText = "Close",
  isDisabled = false,
  onOpenStateChange,
  menuItems
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  
  // Force component to rerender when a submenu is opened
  const [, forceUpdate] = useState({});
  
  // Toggle menu visibility
  const toggleMenu = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Reset submenu when closing
    if (!newState) {
      setActiveSubmenuId(null);
    }
    
    if (onOpenStateChange) {
      onOpenStateChange(newState);
    }
  };

  // Get the proper icon to display
  const getIcon = (item: MenuItem) => {
    if (item.type === 'toggle' && (item as ToggleMenuItem).enabled && item.activeIcon) {
      return item.activeIcon;
    }
    if (item.type === 'toggle' && !(item as ToggleMenuItem).enabled && item.inactiveIcon) {
      return item.inactiveIcon;
    }
    return item.icon;
  };

  // Handle clicking a menu item
  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;

    switch (item.type) {
      case 'toggle':
        const toggleItem = item as ToggleMenuItem;
        toggleItem.onToggle(!toggleItem.enabled);
        break;
      case 'submenu':
        setActiveSubmenuId(item.id);
        // Force rerender when opening a submenu to ensure fresh state
        forceUpdate({});
        break;
      case 'action':
      case 'default':
        if ('onClick' in item && item.onClick) {
          item.onClick();
        }
        if (item.closeOnClick) {
          toggleMenu();
        }
        break;
    }
  };

  // Handle going back from submenu
  const handleBack = () => {
    setActiveSubmenuId(null);
  };

  // Find current active submenu item
  const activeSubmenuItem = activeSubmenuId 
    ? menuItems.find(item => item.id === activeSubmenuId && item.type === 'submenu') as SubmenuMenuItem | undefined
    : undefined;

  // Render a menu item
  const renderMenuItem = (item: MenuItem) => (
    <div 
      key={item.id}
      className={`flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg 
        ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"}`}
      onClick={() => handleItemClick(item)}
      aria-disabled={item.disabled}
    >
      <div className="flex items-center gap-3">
        {getIcon(item) && (
          <div className="text-xl text-zinc-800 dark:text-zinc-200">
            {getIcon(item)}
          </div>
        )}
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</div>
          {item.description && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </div>
          )}
        </div>
      </div>
      
      {/* Different right-side elements based on menu item type */}
      {item.type === 'submenu' && (
        <ChevronRight className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
      )}
      {item.type === 'toggle' && (
        <div 
          className={`w-12 h-6 rounded-full flex items-center transition-colors duration-200 
            ${(item as ToggleMenuItem).enabled ? 'bg-blue-500 justify-end' : 'bg-zinc-400 dark:bg-zinc-500 justify-start'}`}
        >
          <div className={`w-5 h-5 rounded-full mx-0.5 bg-white`}></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Menu trigger button */}
      <button
        className={triggerClassName}
        onClick={toggleMenu}
        disabled={isDisabled}
        aria-label="Open menu"
      >
        {triggerIcon}
      </button>
      
      {/* Full screen menu */}
      {isOpen && (
        <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-800 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-300 dark:border-zinc-700">
            {activeSubmenuItem ? (
              <button 
                onClick={handleBack}
                className="p-2 rounded-full text-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-10"></div> // Spacer for alignment
            )}
            
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {activeSubmenuItem ? activeSubmenuItem.title : title}
            </h2>
            
            <button 
              className="p-2 rounded-full text-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={toggleMenu}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Menu content - either showing active submenu or main menu items */}
          <div className="flex-1 overflow-y-auto">
            {activeSubmenuItem ? (
              // CRUCIAL CHANGE: explicitly pass toggleMenu and handleBack 
              activeSubmenuItem.renderSubmenu(toggleMenu, handleBack)
            ) : (
              // Render main menu items
              <div className="py-4">
                <div className="flex flex-col space-y-4 px-4">
                  {menuItems.map(renderMenuItem)}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          {!activeSubmenuItem && (
            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700">
              <button
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                onClick={toggleMenu}
              >
                {closeButtonText}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileMenu;