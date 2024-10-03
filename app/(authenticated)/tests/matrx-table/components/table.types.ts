import {HeaderGroup} from "react-table";
import React from "react";

export type TableData = Record<string, any>;

export interface TableHeaderProps {
    headerGroups: HeaderGroup<TableData>[];
}

export interface ActionDefinition {
    name: string;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

