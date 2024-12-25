// utils.ts
import { TreeItem } from './types';

export function sortStorageItems(items: TreeItem[]): TreeItem[] {
  return items.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
}

export function formatSize(bytes: number | undefined): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function buildPath(currentPath: string, itemName: string): string {
  return currentPath ? `${currentPath}/${itemName}` : itemName;
}
