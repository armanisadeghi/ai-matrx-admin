import { FileSystemNode } from "@/lib/redux/fileSystem/types";

export function isInPath(activeNode: FileSystemNode, currentNode: FileSystemNode): boolean {
    if (!activeNode.storagePath || !currentNode.storagePath) {
      throw new Error("Both nodes must have valid storagePath values.");
    }
  
    // Ensure paths match with trailing slash normalization for directories
    const activePath = activeNode.storagePath.endsWith('/')
      ? activeNode.storagePath
      : `${activeNode.storagePath}/`;
  
    const currentPath = currentNode.storagePath.endsWith('/')
      ? currentNode.storagePath
      : `${currentNode.storagePath}/`;
  
    return currentPath.startsWith(activePath) && currentPath !== activePath;
  }
  