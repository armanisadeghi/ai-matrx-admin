// components/admin/debug/debugModuleRegistry.tsx

import { LucideIcon, ShieldCheck, Database, Wifi, Cog, Activity, Lock } from 'lucide-react';
import TokenStatusDebug from './TokenStatusDebug';
import { ComponentType } from 'react';

/**
 * Debug Module Definition
 * 
 * Each debug module represents a specific area of the application
 * that can be inspected/debugged through the Admin Indicator
 */
export interface DebugModule {
  id: string;
  name: string;
  icon: LucideIcon;
  component: ComponentType<any>;
  description: string;
  color?: string; // Optional custom color for the icon
}

/**
 * Debug Module Registry
 * 
 * To add a new debug module:
 * 1. Create your debug component in components/admin/debug/
 * 2. Import it here
 * 3. Add a new entry to this array with:
 *    - Unique id
 *    - Display name
 *    - Lucide icon
 *    - Your component
 *    - Brief description
 * 
 * That's it! The icon will automatically appear in the Admin Indicator
 */
export const debugModules: DebugModule[] = [
  {
    id: 'auth',
    name: 'Authentication',
    icon: ShieldCheck,
    component: TokenStatusDebug,
    description: 'Monitor token refresh status and session expiry',
    color: 'text-green-500',
  },
  // Add more debug modules here as you create them:
  // {
  //   id: 'database',
  //   name: 'Database',
  //   icon: Database,
  //   component: DatabaseDebug,
  //   description: 'Monitor database queries and performance',
  //   color: 'text-blue-500',
  // },
  // {
  //   id: 'websocket',
  //   name: 'WebSocket',
  //   icon: Wifi,
  //   component: WebSocketDebug,
  //   description: 'Monitor WebSocket connections and messages',
  //   color: 'text-purple-500',
  // },
];

/**
 * Get a debug module by ID
 */
export const getDebugModule = (id: string): DebugModule | undefined => {
  return debugModules.find(module => module.id === id);
};

/**
 * Check if a debug module exists
 */
export const hasDebugModule = (id: string): boolean => {
  return debugModules.some(module => module.id === id);
};

