import { PromptBuiltin, ScopeMapping, ShortcutCategory } from "./core";
import { ResultDisplay } from "./execution-modes";

export interface ShortcutItem {
    type: 'prompt_shortcut';
    id: string;
    label: string;
    description: string | null;
    icon_name: string | null;
    sort_order: number;
    keyboard_shortcut: string | null;
    scope_mappings: ScopeMapping;
    available_scopes: string[] | null;
    result_display: ResultDisplay;
    auto_run: boolean;
    allow_chat: boolean;
    show_variables: boolean;
    apply_variables: boolean;
    prompt_builtin_id: string | null;
    // Included builtin data (for execution)
    prompt_builtin: PromptBuiltin | null;
  }
  
  // Content block item (from content_blocks table)
  export interface ContentBlockItem {
    type: 'content_block';
    id: string;
    label: string;
    description: string | null;
    icon: any; // Lucide icon component
    icon_name: string | null;
    sort_order: number;
    template: string;
    block_id: string;
  }
  
  // Union type for all menu items
  export type MenuItem = ShortcutItem | ContentBlockItem;
  
  // Category with its items (hierarchical!)
  export interface CategoryGroup {
    category: ShortcutCategory;
    items: MenuItem[];
    children?: CategoryGroup[]; // Recursive structure for nested categories
  }
  