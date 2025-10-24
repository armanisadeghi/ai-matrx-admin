'use client';

import React, { useState } from 'react';
import { Menu, X, Home, ChevronRight } from 'lucide-react';
import { ThemeSwitcherIcon } from '@/styles/themes/ThemeSwitcher';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { NotificationDropdown } from '@/components/ui/notifications';
import { Notification } from '@/types/notification.types';
import { QuickActionsMenu } from '@/components/layout/QuickActionsMenu';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface MobileLayoutProps {
  children: React.ReactNode;
  primaryLinks: SidebarLink[];
  secondaryLinks?: SidebarLink[];
  uniqueId?: string;
  isAdmin?: boolean;
}

export default function MobileLayout({
  children,
  primaryLinks,
  secondaryLinks = [],
  uniqueId = "mobile-layout",
  isAdmin = false
}: MobileLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(primaryLinks[0]?.href || '');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLinkClick = (href: string) => {
    setActiveLink(href);
    setIsSidebarOpen(false);
  };

  return (
    <div id={uniqueId} className="min-h-screen bg-textured">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-textured border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left side - Menu, Logo and page-specific content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <Home className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            
            {/* Page-specific controls will be inserted here */}
            <div id="page-specific-header-content" className="flex-1 min-w-0" />
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <NotificationDropdown
              notifications={notifications}
              isMobile={true}
              onMarkAsRead={(id) => {
                setNotifications(prev => 
                  prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
              }}
              onMarkAllAsRead={() => {
                setNotifications(prev => 
                  prev.map(n => ({ ...n, isRead: true }))
                );
              }}
              onClearAll={() => {
                setNotifications([]);
              }}
              onNotificationClick={(notification) => {
                if (notification.link) {
                  window.location.href = notification.link;
                }
              }}
            />
            <QuickActionsMenu className="hover:bg-gray-100 dark:hover:bg-gray-800" />
            <ThemeSwitcherIcon className="hover:bg-gray-100 dark:hover:bg-gray-800" />
            <NavigationMenu />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-textured z-50 transform transition-transform duration-300 lg:hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
          <button
            onClick={toggleSidebar}
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Sidebar Content */}
        <nav className="p-4 overflow-y-auto">
          {/* Primary Links */}
          <div className="mb-6">
            <ul className="space-y-1">
              {primaryLinks.map((link, index) => (
                <li key={`primary-${index}`}>
                  <a
                    href={link.href}
                    onClick={() => handleLinkClick(link.href)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      activeLink === link.href
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{link.icon}</div>
                      <span className="font-medium">{link.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin Links */}
          {isAdmin && secondaryLinks.length > 0 && (
            <div>
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Admin
              </h3>
              <ul className="space-y-1">
                {secondaryLinks.map((link, index) => (
                  <li key={`secondary-${index}`}>
                    <a
                      href={link.href}
                      onClick={() => handleLinkClick(link.href)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        activeLink === link.href
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{link.icon}</div>
                        <span className="font-medium">{link.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-12 min-h-screen">
        {children}
      </main>
    </div>
  );
}