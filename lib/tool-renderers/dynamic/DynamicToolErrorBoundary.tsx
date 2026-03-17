"use client";

import React from "react";
import { reportRuntimeError } from "./incident-reporter";

interface Props {
    toolName: string;
    componentType: "inline" | "overlay";
    componentId?: string;
    componentVersion?: string;
    toolUpdates?: unknown[];
    fallback: React.ReactNode;
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary specifically for dynamic tool components.
 *
 * When a dynamically compiled component throws during render, this boundary:
 * 1. Catches the error
 * 2. Reports it as an incident to the database
 * 3. Renders the fallback (GenericRenderer)
 *
 * This ensures one broken dynamic component never crashes the entire chat.
 */
export class DynamicToolErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        reportRuntimeError(
            this.props.toolName,
            this.props.componentType,
            error,
            this.props.toolUpdates,
            this.props.componentId,
            this.props.componentVersion
        );

        console.error(
            `[DynamicToolErrorBoundary] Runtime error in ${this.props.toolName} (${this.props.componentType}):`,
            error,
            errorInfo.componentStack
        );
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}
