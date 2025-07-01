"use client";
import React, { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import FieldsWithLabels from "./FieldsWithlabels";
import { selectFieldsByIds, selectFieldById } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { fetchFieldByIdThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { normalizeFieldDefinition, FieldDefinition } from "@/types/customAppTypes";

interface FieldsWithFetchProps {
    fieldIds: string | string[];
    sourceId: string;
    isMobile?: boolean;
    source?: string;
    className?: string;
    wrapperClassName?: string;
    showLabels?: boolean;
    showHelpText?: boolean;
    showRequired?: boolean;
    labelPosition?: "top" | "left" | "right";
    labelClassName?: string;
    emptyLabelSpacing?: string;
    separatorStyle?: "border" | "spacing" | "background" | "none";
}

const FieldsWithFetch: React.FC<FieldsWithFetchProps> = ({
    fieldIds,
    sourceId,
    isMobile = false,
    source = "applet",
    className = "",
    wrapperClassName = "mb-6 last:mb-0", // Updated to match new default
    showLabels = true,
    showHelpText = true,
    showRequired = true,
    labelPosition = "top",
    labelClassName = "",
    emptyLabelSpacing = "mb-3",
    separatorStyle = "spacing", // New prop with default value
}) => {
    const dispatch = useAppDispatch();
    
    // Normalize fieldIds to always be an array
    const fieldIdsArray = useMemo(() => {
        if (typeof fieldIds === 'string') {
            return [fieldIds];
        }
        return fieldIds || [];
    }, [fieldIds]);
    
    // Get fields from Redux state
    const fieldsFromState = useAppSelector((state) => {
        if (fieldIdsArray.length === 1) {
            const field = selectFieldById(state, fieldIdsArray[0]);
            return field ? [field] : [];
        }
        return selectFieldsByIds(state, fieldIdsArray);
    });
    
    // Check which fields are missing from state
    const missingFieldIds = useMemo(() => {
        const existingIds = new Set(
            fieldsFromState
                .filter(field => field && field.id) // Filter out null/undefined fields or fields without id
                .map(field => field.id)
        );
        return fieldIdsArray.filter(id => !existingIds.has(id));
    }, [fieldIdsArray, fieldsFromState]);
    
    // Fetch missing fields
    useEffect(() => {
        const fetchMissingFields = async () => {
            for (const fieldId of missingFieldIds) {
                try {
                    await dispatch(fetchFieldByIdThunk(fieldId)).unwrap();
                } catch (error) {
                    console.warn(`Failed to fetch field ${fieldId}:`, error);
                }
            }
        };
        
        if (missingFieldIds.length > 0) {
            fetchMissingFields();
        }
    }, [dispatch, missingFieldIds]);
    
    // Convert FieldBuilder objects to FieldDefinition objects
    const normalizedFields: FieldDefinition[] = useMemo(() => {
        return fieldsFromState
            .filter(field => field !== null && field !== undefined)
            .map(field => normalizeFieldDefinition(field));
    }, [fieldsFromState]);
    
    // If we don't have all the fields yet, show a loading state or empty div
    if (normalizedFields.length < fieldIdsArray.length) {
        return <div className={className}></div>;
    }
    
    // Render the FieldsWithLabels component with all props passed through
    return (
        <FieldsWithLabels
            fields={normalizedFields}
            sourceId={sourceId}
            isMobile={isMobile}
            source={source}
            className={className}
            wrapperClassName={wrapperClassName}
            showLabels={showLabels}
            showHelpText={showHelpText}
            showRequired={showRequired}
            labelPosition={labelPosition}
            labelClassName={labelClassName}
            emptyLabelSpacing={emptyLabelSpacing}
            separatorStyle={separatorStyle}
        />
    );
};

export default FieldsWithFetch;