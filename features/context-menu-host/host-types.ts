// The app's share-permission vocabulary, handed to the context menu's types
// (`@ai-matrx/chat/context-menu/types` `ContextMenuHostTypes`). The package
// augments the rich-document shapes itself; `resourceType` stays with the host.
import type { ResourceType as HostResourceType } from "@ai-matrx/sharing/core";

declare module "@ai-matrx/chat/context-menu/types" {
  interface ContextMenuHostTypes {
    resourceType: HostResourceType;
  }
}

export {};
