/**
 * AdvancedMenu - Usage Examples
 * 
 * A beautiful, feature-rich menu component with automatic action feedback,
 * mobile responsiveness, and extensive customization options.
 */

import React from "react";
import { Copy, Save, Trash, Share2, Edit, Eye, Download } from "lucide-react";
import AdvancedMenu, { MenuItem } from "./AdvancedMenu";
import { useAdvancedMenu, createMenuItem } from "@/hooks/use-advanced-menu";
import { Button } from "@/components/ui/button";

// ============================================================================
// Example 1: Basic Usage
// ============================================================================
export function BasicMenuExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    {
      key: "copy",
      icon: Copy,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Copy",
      description: "Copy to clipboard",
      action: async () => {
        await navigator.clipboard.writeText("Hello World");
      },
    },
    {
      key: "save",
      icon: Save,
      iconColor: "text-green-500 dark:text-green-400",
      label: "Save",
      description: "Save changes",
      action: () => {
        console.log("Saved!");
      },
    },
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Open Menu</Button>
      <AdvancedMenu {...menu.menuProps} items={items} title="Actions" />
    </div>
  );
}

// ============================================================================
// Example 2: Categorized Menu
// ============================================================================
export function CategorizedMenuExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    // Edit category
    {
      key: "copy",
      icon: Copy,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Copy",
      description: "Copy to clipboard",
      category: "Edit",
      action: async () => {
        await navigator.clipboard.writeText("Content");
      },
    },
    {
      key: "edit",
      icon: Edit,
      iconColor: "text-purple-500 dark:text-purple-400",
      label: "Edit",
      description: "Edit content",
      category: "Edit",
      action: () => {
        console.log("Edit");
      },
    },
    // Share category
    {
      key: "share",
      icon: Share2,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      label: "Share",
      description: "Share with others",
      category: "Share",
      action: () => {
        console.log("Share");
      },
    },
    {
      key: "download",
      icon: Download,
      iconColor: "text-green-500 dark:text-green-400",
      label: "Download",
      description: "Download file",
      category: "Share",
      action: () => {
        console.log("Download");
      },
    },
    // Delete category
    {
      key: "delete",
      icon: Trash,
      iconColor: "text-red-500 dark:text-red-400",
      label: "Delete",
      description: "Remove permanently",
      category: "Danger",
      action: () => {
        console.log("Delete");
      },
    },
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Open Categorized Menu</Button>
      <AdvancedMenu
        {...menu.menuProps}
        items={items}
        title="Document Actions"
        description="Manage your document"
      />
    </div>
  );
}

// ============================================================================
// Example 3: Context Menu (Right Click)
// ============================================================================
export function ContextMenuExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    createMenuItem("copy", "Copy", Copy, async () => {
      await navigator.clipboard.writeText("Context menu content");
    }),
    createMenuItem("edit", "Edit", Edit, () => console.log("Edit")),
    createMenuItem("delete", "Delete", Trash, () => console.log("Delete"), {
      iconColor: "text-red-500 dark:text-red-400",
    }),
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    menu.open(e.currentTarget as HTMLElement);
  };

  return (
    <div
      className="p-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg cursor-context-menu"
      onContextMenu={handleContextMenu}
    >
      Right-click me to open context menu
      <AdvancedMenu
        {...menu.menuProps}
        items={items}
        title="Context Menu"
        position="bottom-left"
      />
    </div>
  );
}

// ============================================================================
// Example 4: Custom Positioning
// ============================================================================
export function CustomPositionExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    createMenuItem("action1", "Action 1", Eye, () => console.log("Action 1")),
    createMenuItem("action2", "Action 2", Save, () => console.log("Action 2")),
  ];

  return (
    <div className="flex gap-4">
      <div className="relative">
        <Button onClick={() => menu.open()}>Bottom Left</Button>
        <AdvancedMenu
          {...menu.menuProps}
          items={items}
          position="bottom-left"
          title="Bottom Left"
        />
      </div>

      <div className="relative">
        <Button onClick={() => menu.open()}>Bottom Right</Button>
        <AdvancedMenu
          {...menu.menuProps}
          items={items}
          position="bottom-right"
          title="Bottom Right"
        />
      </div>

      <div className="relative">
        <Button onClick={() => menu.open()}>Center</Button>
        <AdvancedMenu
          {...menu.menuProps}
          items={items}
          position="center"
          title="Centered"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: With Disabled Items
// ============================================================================
export function DisabledItemsExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    createMenuItem("available", "Available Action", Copy, () =>
      console.log("Available")
    ),
    createMenuItem("coming-soon", "Coming Soon", Share2, () =>
      console.log("Coming Soon"), {
      disabled: true,
    }),
    createMenuItem("beta", "Beta Feature", Eye, () => console.log("Beta"), {
      disabled: true,
    }),
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Open Menu</Button>
      <AdvancedMenu {...menu.menuProps} items={items} />
    </div>
  );
}

// ============================================================================
// Example 6: With Callbacks
// ============================================================================
export function CallbacksExample() {
  const menu = useAdvancedMenu({
    onOpen: () => console.log("Menu opened"),
    onClose: () => console.log("Menu closed"),
    onActionStart: (key) => console.log(`Action ${key} started`),
    onActionSuccess: (key) => console.log(`Action ${key} succeeded`),
    onActionError: (key, error) => console.error(`Action ${key} failed:`, error),
  });

  const items: MenuItem[] = [
    createMenuItem("success", "Success Action", Copy, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }),
    createMenuItem("error", "Error Action", Trash, async () => {
      throw new Error("This action failed");
    }),
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Open Menu</Button>
      <AdvancedMenu {...menu.menuProps} items={items} />
    </div>
  );
}

// ============================================================================
// Example 7: No Backdrop or Header
// ============================================================================
export function MinimalMenuExample() {
  const menu = useAdvancedMenu();

  const items: MenuItem[] = [
    createMenuItem("action1", "Action 1", Copy, () => console.log("Action 1")),
    createMenuItem("action2", "Action 2", Save, () => console.log("Action 2")),
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Open Minimal Menu</Button>
      <AdvancedMenu
        {...menu.menuProps}
        items={items}
        showHeader={false}
        showBackdrop={false}
        categorizeItems={false}
      />
    </div>
  );
}

// ============================================================================
// Example 8: Message Options Menu (Original Use Case)
// ============================================================================
export function MessageOptionsMenuExample() {
  const menu = useAdvancedMenu();
  const messageContent = "Sample message content";

  const items: MenuItem[] = [
    // Copy Options
    createMenuItem(
      "copy-plain",
      "Copy text",
      Copy,
      async () => {
        await navigator.clipboard.writeText(messageContent);
      },
      {
        description: "Plain text to clipboard",
        category: "Copy",
        iconColor: "text-blue-500 dark:text-blue-400",
      }
    ),
    createMenuItem(
      "copy-formatted",
      "Copy formatted",
      Copy,
      async () => {
        // Copy logic here
      },
      {
        description: "With formatting",
        category: "Copy",
        iconColor: "text-green-500 dark:text-green-400",
      }
    ),
    // Export Options
    createMenuItem("html-preview", "HTML preview", Eye, () => console.log("Preview"), {
      description: "View formatted HTML",
      category: "Export",
      iconColor: "text-indigo-500 dark:text-indigo-400",
    }),
    createMenuItem("download", "Download", Download, () => console.log("Download"), {
      description: "Save as file",
      category: "Export",
      iconColor: "text-orange-500 dark:text-orange-400",
    }),
    // Actions
    createMenuItem("save", "Save to data", Save, () => console.log("Save"), {
      description: "Store in database",
      category: "Actions",
      iconColor: "text-cyan-500 dark:text-cyan-400",
      disabled: true,
    }),
  ];

  return (
    <div className="relative">
      <Button onClick={() => menu.open()}>Message Options</Button>
      <AdvancedMenu
        {...menu.menuProps}
        items={items}
        title="Message Options"
        description="Copy, export, or save this message"
      />
    </div>
  );
}

