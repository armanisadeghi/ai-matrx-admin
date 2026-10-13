"use client";

/**
 * The ONE look of every dropdown the editor chrome opens — menu bar, toolbar, ribbon, the
 * shared File menu and any submenu inside them. Google's menus read crisp because every glyph
 * sits on whole pixels at one size with one thin stroke in one soft ink; this is where that is
 * set, once (`editor-chrome.css`, scoped by `EDITOR_MENU_CLASS`). Call sites never style rows.
 */

import "./editor-chrome.css";

import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { DropdownMenuContent, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const EDITOR_MENU_CLASS = "matrx-editor-menu";

const InEditorMenu = createContext(false);

/** The scope class when rendered inside an editor menu (a submenu portals out of its parent). */
export function useEditorMenuClass(): string | undefined {
  return useContext(InEditorMenu) ? EDITOR_MENU_CLASS : undefined;
}

export const EditorMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(function EditorMenuContent({ className, children, ...rest }, ref) {
  return (
    <DropdownMenuContent ref={ref} className={cn(EDITOR_MENU_CLASS, className)} {...rest}>
      <InEditorMenu.Provider value>{children}</InEditorMenu.Provider>
    </DropdownMenuContent>
  );
});

export const EditorMenuSubContent = forwardRef<
  ElementRef<typeof DropdownMenuSubContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuSubContent>
>(function EditorMenuSubContent({ className, children, ...rest }, ref) {
  return (
    <DropdownMenuSubContent ref={ref} className={cn(EDITOR_MENU_CLASS, className)} {...rest}>
      <InEditorMenu.Provider value>{children}</InEditorMenu.Provider>
    </DropdownMenuSubContent>
  );
});
