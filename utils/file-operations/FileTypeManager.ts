// utils/file-operations/file-type-manager.ts

import { StorageItem } from "./StorageBase";
import { FileCategory, FileTypeInfo, FolderTypeInfo } from "./types";
import {getFileDetailsByExtension} from "@/utils/file-operations/constants";



export class FileTypeManager {
    private static instance: FileTypeManager;

    private constructor() {}

    static getInstance(): FileTypeManager {
        if (!FileTypeManager.instance) {
            FileTypeManager.instance = new FileTypeManager();
        }
        return FileTypeManager.instance;
    }

    private canPreviewFile(item: StorageItem, category: FileCategory): boolean {
        // Size check
        const maxPreviewSize = 5 * 1024 * 1024; // 5MB
        if (item.size > maxPreviewSize) return false;

        // Check supported categories and extensions
        switch (category) {
            case 'CODE':
            case 'DOCUMENT':
                return true;
            case 'IMAGE':
                return ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(
                    item.name.split('.').pop()?.toLowerCase() || ''
                );
            case 'VIDEO':
                return false; // Video preview might need special handling
            case 'AUDIO':
                return false; // Audio preview might need special handling
            default:
                return false;
        }
    }

    getFileDetails(item: StorageItem): FileTypeInfo {
        const fileDetails = getFileDetailsByExtension(item.name);
        const extension = item.name.includes('.') ? `.${item.name.split('.').pop()?.toLowerCase()}` : '';
        const mimeType = item.metadata?.mimetype || 'application/octet-stream';

        return {
            id: item.id || '',
            name: item.name,
            extension,
            mimeType,
            icon: fileDetails.icon,
            category: fileDetails.category,
            subCategory: fileDetails.subCategory,
            canPreview: this.canPreviewFile(item, fileDetails.category),
            description: fileDetails.subCategory || 'File',
            color: fileDetails.color || 'default'
        };
    }


    getItemTypeInfo(item: StorageItem): FileTypeInfo | FolderTypeInfo {
        if (item.isFolder) {
            return {
                id: null,
                name: item.name,
                extension: null,
                mimeType: null,
                icon: ENHANCED_FILE_ICONS.categories.UNKNOWN.DEFAULT,
                category: 'FOLDER',
                subCategory: 'FOLDER',
                canPreview: false,
                description: 'Folder',
                color: 'default'
            };
        }

        const fileDetails = getFileDetailsByExtension(item.name);
        const extension = item.name.includes('.') ? `.${item.name.split('.').pop()?.toLowerCase()}` : '';
        const mimeType = item.metadata?.mimetype || 'application/octet-stream';

        return {
            id: item.id || '',
            name: item.name,
            extension,
            mimeType,
            icon: fileDetails.icon,
            category: fileDetails.category,
            subCategory: fileDetails.subCategory,
            canPreview: this.canPreviewFile(item, fileDetails.category),
            description: fileDetails.subCategory || 'File',
            color: fileDetails.color || 'default'
        };
    }

    sortItems(items: StorageItem[], config: EnhancedDirectoryTreeConfig): StorageItem[] {
        const { sorting } = config;

        return [...items].sort((a, b) => {
            if (sorting.foldersFirst && a.isFolder !== b.isFolder) {
                return a.isFolder ? -1 : 1;
            }

            switch (sorting.by) {
                case 'name':
                    return sorting.natural
                        ? a.name.localeCompare(b.name, undefined, { numeric: true })
                        : a.name.localeCompare(b.name);
                case 'date':
                    const aDate = a.updated_at || a.created_at || '';
                    const bDate = b.updated_at || b.created_at || '';
                    return sorting.direction === 'asc'
                        ? aDate.localeCompare(bDate)
                        : bDate.localeCompare(aDate);
                case 'size':
                    return sorting.direction === 'asc'
                        ? a.size - b.size
                        : b.size - a.size;
                case 'type':
                    const aType = this.getItemTypeInfo(a);
                    const bType = this.getItemTypeInfo(b);
                    return sorting.direction === 'asc'
                        ? aType.category.localeCompare(bType.category)
                        : bType.category.localeCompare(aType.category);
                default:
                    return 0;
            }
        });
    }

    filterItems(items: StorageItem[], config: EnhancedDirectoryTreeConfig): StorageItem[] {
        const { filter } = config;

        return items.filter(item => {
            if (filter.hideHiddenFiles && item.name.startsWith('.')) {
                return false;
            }

            if (item.isFolder) {
                return !filter.excludePatterns.some(pattern =>
                    new RegExp(pattern.replace(/\*/g, '.*')).test(item.name)
                );
            }

            if (filter.includeMimeTypes?.length || filter.excludeMimeTypes?.length) {
                const itemType = this.getItemTypeInfo(item);
                if (!('mimeType' in itemType)) return false;

                if (filter.includeMimeTypes?.length &&
                    !filter.includeMimeTypes.includes(itemType.mimeType)) {
                    return false;
                }

                if (filter.excludeMimeTypes?.length &&
                    filter.excludeMimeTypes.includes(itemType.mimeType)) {
                    return false;
                }
            }

            return !filter.excludePatterns.some(pattern =>
                new RegExp(pattern.replace(/\*/g, '.*')).test(item.name)
            );
        });
    }

    groupItemsByCategory(items: StorageItem[]): Partial<Record<FileCategory | 'FOLDER', StorageItem[]>> {
        const groupedItems: Partial<Record<FileCategory | 'FOLDER', StorageItem[]>> = {
            FOLDER: [],
            CODE: [],
            DOCUMENT: [],
            IMAGE: [],
            AUDIO: [],
            VIDEO: [],
            DATA: [],
            ARCHIVE: [],
            UNKNOWN: []
        };

        items.forEach(item => {
            const typeInfo = this.getItemTypeInfo(item);
            const category = item.isFolder ? 'FOLDER' : typeInfo.category;

            if (!groupedItems[category]) {
                groupedItems[category] = [];
            }

            groupedItems[category]!.push(item);
        });

        return groupedItems;
    }
}

// Helper function to work with StorageManager
export function withFileTypes(manager: any) {
    const fileTypeManager = FileTypeManager.getInstance();

    return {
        ...manager,
        getItemTypeInfo(item: StorageItem) {
            return fileTypeManager.getItemTypeInfo(item);
        },
        sortItems(config: EnhancedDirectoryTreeConfig) {
            return fileTypeManager.sortItems(manager.getCurrentItems(), config);
        },
        filterItems(config: EnhancedDirectoryTreeConfig) {
            return fileTypeManager.filterItems(manager.getCurrentItems(), config);
        },
        groupItemsByCategory() {
            return fileTypeManager.groupItemsByCategory(manager.getCurrentItems());
        }
    };
}