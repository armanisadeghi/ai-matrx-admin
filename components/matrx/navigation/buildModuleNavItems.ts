import React from 'react';
import type { ModulePage, NavItem } from './types';

const DEFAULT_ICON_CLASS = 'w-5 h-5 sm:w-6 sm:h-6 text-primary';

export interface BuildModuleNavItemsOptions {
  /** Default icon (React node or component) used when a page has no icon. Omit for no icon. */
  defaultIcon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  /** ClassName applied when rendering a component icon (default or per-page). */
  iconClassName?: string;
}

function isReactComponent(
  value: unknown
): value is React.ComponentType<{ className?: string }> {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
}

function toIconNode(
  icon: ModulePage['icon'],
  defaultIcon: BuildModuleNavItemsOptions['defaultIcon'],
  iconClassName: string
): React.ReactNode | undefined {
  const source = icon ?? defaultIcon;
  if (source == null) return undefined;
  if (isReactComponent(source)) {
    return React.createElement(source, { className: iconClassName });
  }
  return source;
}

/**
 * Converts module config (ModulePage[]) to nav items for NextNavCardFull.
 * Applies defaultIcon when a page does not define one. Supports both pre-rendered
 * nodes and component types (e.g. Lucide icons) for config-driven automation.
 */
export function buildModuleNavItems(
  pages: ModulePage[],
  options?: BuildModuleNavItemsOptions
): NavItem[] {
  const { defaultIcon, iconClassName = DEFAULT_ICON_CLASS } = options ?? {};
  return pages.map((page) => ({
    title: page.title,
    path: page.path,
    relative: page.relative,
    description: page.description,
    icon: toIconNode(page.icon, defaultIcon, iconClassName),
    color: page.color,
    badge: undefined,
  }));
}
