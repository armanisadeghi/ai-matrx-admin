import React from "react";
import {ModalPresentation} from "./ModalPresentation";
import {SheetPresentation} from "./SheetPresentation";
import {PopoverPresentation} from "./PopoverPresentation";
import {
    BottomDrawerPresentation,
    CenterDrawerPresentation,
    DrawerPresentation,
    SideDrawerPresentation
} from "./DrawerPresentation";
import {InlinePresentation} from "./InlinePresentation";
import {TooltipPresentation} from "./TooltipPresentation";
import {CollapsePresentation} from "./CollapsePresentation";
import {HoverCardPresentation} from "./HoverCardPresentation";
import {ContextMenuPresentation} from "./ContextMenuPresentation";
import {CustomPresentation} from "./CustomPresentation";
import {PresentationConfig, PresentationControls} from "@/components/matrx/ArmaniForm/action-system/presentation/types";

export const PRESENTATION_TYPES = {
    MODAL: 'modal',
    SHEET: 'sheet',
    POPOVER: 'popover',
    INLINE: 'inline',
    DROPDOWN: 'dropdown',
    TOOLTIP: 'tooltip',
    DRAWER: 'drawer',
    DRAWER_BOTTOM: 'drawerBottom',
    DRAWER_SIDE: 'drawerSide',
    DRAWER_CENTER: 'drawerCenter',
    COLLAPSE: 'collapse',
    HOVER_CARD: 'hoverCard',
    CONTEXT_MENU: 'contextMenu',
    CUSTOM: 'custom',
} as const;


export const PRESENTATION_COMPONENTS = {
    MODAL: ModalPresentation,
    SHEET: SheetPresentation,
    POPOVER: PopoverPresentation,
    INLINE: InlinePresentation,
    TOOLTIP: TooltipPresentation,
    DRAWER: DrawerPresentation,
    DRAWER_BOTTOM: BottomDrawerPresentation,
    DRAWER_SIDE: SideDrawerPresentation,
    DRAWER_CENTER: CenterDrawerPresentation,
    COLLAPSE: CollapsePresentation,
    HOVER_CARD: HoverCardPresentation,
    CONTEXT_MENU: ContextMenuPresentation,
    CUSTOM: CustomPresentation,
} as const;

export type PresentationTypes = keyof typeof PRESENTATION_COMPONENTS;


