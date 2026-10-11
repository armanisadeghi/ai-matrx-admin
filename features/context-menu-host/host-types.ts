// The app's share-permission vocabulary, handed to the context menu's types
// (`@ai-matrx/chat/context-menu/types` `ContextMenuHostTypes`). The package
// augments the rich-document shapes itself; `resourceType` stays with the host.
import type { ResourceType as HostResourceType } from "@/utils/permissions/types";

declare module "@ai-matrx/chat/context-menu/types" {
  interface ContextMenuHostTypes {
    resourceType: HostResourceType;
  }
}

export {};
