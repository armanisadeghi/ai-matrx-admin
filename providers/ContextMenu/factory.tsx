// factory.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { MenuItem, MenuConfig } from './types';
import { useMenuSystem } from './hooks';
import {
    ConfirmDialog,
    InputDialog,
    SelectDialog,
    LoaderDialog,
    CustomDialog
} from './dialogs';

interface MenuFactoryProps {
    config: MenuConfig;
    children: React.ReactNode;
    className?: string;
}

function renderMenuItem(item: MenuItem, onAction: (item: MenuItem) => void) {
    if (item.hidden) return null;

    if (item.children?.length) {
        return (
            <ContextMenuSub key={item.id}>
                <ContextMenuSubTrigger disabled={item.disabled}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                    {item.children.map((child, index) => (
                        <React.Fragment key={child.id}>
                            {renderMenuItem(child, onAction)}
                            {index < item.children.length - 1 && <ContextMenuSeparator />}
                        </React.Fragment>
                    ))}
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }

    if (item.type === 'link') {
        return (
            <Link href={item.href} passHref>
                <ContextMenuItem disabled={item.disabled}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                </ContextMenuItem>
            </Link>
        );
    }

    return (
        <ContextMenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => onAction(item)}
        >
            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
            {item.label}
        </ContextMenuItem>
    );
}

export function MenuFactory({ config, children, className }: MenuFactoryProps) {
    const { activeDialog, handleMenuItem, handleDialogResult, closeDialog } = useMenuSystem();

    // Wrap handlers to ensure consistent behavior
    const handleConfirm = (result: boolean) => handleDialogResult(result);
    const handleInput = (value: string) => handleDialogResult(value);
    const handleSelect = (value: string) => handleDialogResult(value);

    return (
        <>
            <ContextMenu>
                {children}
                <ContextMenuContent className={className}>
                    {config.items.map((item, index) => (
                        <React.Fragment key={item.id}>
                            {renderMenuItem(item, handleMenuItem)}
                            {index < config.items.length - 1 && <ContextMenuSeparator />}
                        </React.Fragment>
                    ))}
                </ContextMenuContent>
            </ContextMenu>

            {activeDialog && (
                <>
                    {activeDialog.config.type === 'confirm' && (
                        <ConfirmDialog
                            open={true}
                            onClose={closeDialog}
                            onConfirm={handleConfirm}
                            {...activeDialog.config}
                        />
                    )}
                    {activeDialog.config.type === 'input' && (
                        <InputDialog
                            open={true}
                            onClose={closeDialog}
                            onSubmit={handleInput}
                            {...activeDialog.config}
                        />
                    )}
                    {activeDialog.config.type === 'select' && (
                        <SelectDialog
                            open={true}
                            onClose={closeDialog}
                            onSelect={handleSelect}
                            {...activeDialog.config}
                        />
                    )}
                    {activeDialog.config.type === 'loader' && (
                        <LoaderDialog
                            open={true}
                            {...activeDialog.config}
                        />
                    )}
                    {activeDialog.config.type === 'custom' && (
                        <CustomDialog
                            open={true}
                            onClose={closeDialog}
                            {...activeDialog.config}
                        >
                            {activeDialog.config.content}
                        </CustomDialog>
                    )}
                </>
            )}
        </>
    );
}
