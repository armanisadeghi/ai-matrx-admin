import CreateEntityButton from './CreateEntityButton';
import DeleteEntityButton from './DeleteEntityButton';
import UpdateEntityButton from './UpdateEntityButton';
import {EntityKeys} from "@/types/entityTypes";
import React from "react";

export { default as CreateEntityButton } from './CreateEntityButton';
export { default as DeleteEntityButton } from './DeleteEntityButton';
export { default as UpdateEntityButton } from './UpdateEntityButton';

// Optionally group these as EntityActionButtons
const EntityActionButtons = {
    CreateEntityButton,
    DeleteEntityButton,
    UpdateEntityButton,
};

export default EntityActionButtons;


export interface BaseEntityActionProps {
    entityKey: EntityKeys;
    className?: string;
    children?: React.ReactNode;
    onSuccess?: () => void;
}

export interface CreateEntityButtonProps extends BaseEntityActionProps {
    data: Record<string, any>;
}


export interface DeleteEntityButtonProps extends BaseEntityActionProps {
    recordId: string;
    confirmTitle?: string;
    confirmDescription?: string;
}


export interface UpdateEntityButtonProps extends BaseEntityActionProps {
    recordId: string;
    data: Record<string, any>;
}
