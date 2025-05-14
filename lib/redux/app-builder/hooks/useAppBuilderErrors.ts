"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { selectAppletError } from "../selectors/appletSelectors";
import { selectAppError } from "../selectors/appSelectors";
import { selectContainerError } from "../selectors/containerSelectors";
import { selectFieldError } from "../selectors/fieldSelectors";
import { useToast } from "@/components/ui/use-toast";

export default function useAppBuilderErrors() {
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const appletError = useAppSelector(selectAppletError);
    const appError = useAppSelector(selectAppError);
    const containerError = useAppSelector(selectContainerError);
    const fieldError = useAppSelector(selectFieldError);

    useEffect(() => {
        if (appletError) {
            setError(appletError);
        }
    }, [appletError]);

    useEffect(() => {
        if (appError) {
            setError(appError);
        }
    }, [appError]);

    useEffect(() => {
        if (containerError) {
            setError(containerError);
        }
    }, [containerError]);

    useEffect(() => {
        if (fieldError) {
            setError(fieldError);
        }
    }, [fieldError]);

    useEffect(() => {
        if (error) {
            toast({
                title: "Error",
                description: error,
                variant: "destructive",
            });
            setError(null);
        }
    }, [error, toast]);

    return { error };
}
