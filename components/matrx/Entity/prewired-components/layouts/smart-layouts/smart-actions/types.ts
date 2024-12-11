// smart-actions/types.ts

import React from "react";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {ComponentSize} from "@/types/componentConfigTypes";
import { EntityKeys } from "@/types/entityTypes";

export interface SmartButtonProps {
    entityKey?: EntityKeys;
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    variant?: MatrxVariant;
    size?: ComponentSize;
    hideText?: boolean;
    loading?: boolean;
    showConfirmation?: boolean;
}
