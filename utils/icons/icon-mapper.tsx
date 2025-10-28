// utils/icon-mapper.tsx

import * as LucideIcons from "lucide-react";
import React from "react";

// Type for Lucide icon names
type LucideIconName = keyof typeof LucideIcons;

// Simple fallback icons based on category
const FALLBACK_ICONS: Record<string, React.ReactNode> = {
  'code': <LucideIcons.Code size={20} />,
  'api': <LucideIcons.Zap size={20} />,
  'core': <LucideIcons.Settings size={20} />,
  'web': <LucideIcons.Globe size={20} />,
  'data': <LucideIcons.Database size={20} />,
  'seo': <LucideIcons.Search size={20} />,
  'text': <LucideIcons.Type size={20} />,
  'location': <LucideIcons.MapPin size={20} />,
  'files': <LucideIcons.FileText size={20} />,
  'default': <LucideIcons.Wrench size={20} />,
};

/**
 * Maps an icon string from the database to a React icon component
 * 
 * @param iconName - The icon name from the database (e.g., "Eye", "Play", "Database") 
 * @param category - The tool category for fallback mapping
 * @param size - The icon size (default: 20)
 * @returns React icon component
 */
export function mapIcon(
  iconName?: string | null, 
  category?: string, 
  size: number = 20
): React.ReactNode {
  // Try to map by icon name from database
  if (iconName && typeof iconName === 'string') {
    // Clean the icon name - ensure it's in PascalCase format
    const cleanIconName = iconName.trim().replace(/^\w/, c => c.toUpperCase());
    
    // Check if it's a valid Lucide icon
    if (cleanIconName in LucideIcons) {
      const IconComponent = LucideIcons[cleanIconName as LucideIconName] as React.ComponentType<{ size?: number }>;
      return <IconComponent size={size} />;
    }
    
    // Try with different case variations if direct match fails
    const variations = [
      cleanIconName,
      cleanIconName.toLowerCase(),
      cleanIconName.charAt(0).toUpperCase() + cleanIconName.slice(1).toLowerCase()
    ];
    
    for (const variation of variations) {
      const matchingIcon = Object.keys(LucideIcons).find(
        key => key.toLowerCase() === variation.toLowerCase()
      );
      
      if (matchingIcon) {
        const IconComponent = LucideIcons[matchingIcon as LucideIconName] as React.ComponentType<{ size?: number }>;
        return <IconComponent size={size} />;
      }
    }
  }
  
  // Fallback to category-based icon
  if (category && FALLBACK_ICONS[category.toLowerCase()]) {
    return FALLBACK_ICONS[category.toLowerCase()];
  }
  
  // Final fallback to default icon
  return FALLBACK_ICONS.default;
}

/**
 * Get all available Lucide icon names for reference
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(LucideIcons).filter(key => 
    typeof LucideIcons[key as LucideIconName] === 'function'
  );
}

/**
 * Check if an icon name is valid
 */
export function isValidIconName(iconName: string): boolean {
  const cleanIconName = iconName.replace(/\s+/g, '').replace(/^\w/, c => c.toUpperCase());
  return cleanIconName in LucideIcons;
}
