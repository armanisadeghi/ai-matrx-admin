"use client";

import React, { useMemo } from "react";
import SmartCrudButtons from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import FieldSelectionControls from "./form-helpers/FieldSelectionControls";
import { EntityKeys, MatrxRecordId } from "@/types/entityTypes";
import { useFieldVisibility } from "../hooks/form-related/useFieldVisibility";
import { useFieldRenderer } from "../hooks/form-related/useFieldRenderer";

// This is the type for formColumns in the unifiedLayoutProps
// export const FORM_COLUMNS = [1, 2, 3, 4, 5, 6, "auto"] as const;
// export type FormColumnsOptions = (typeof FORM_COLUMNS)[number];

import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";
import { ComponentDensity } from "@/types/componentConfigTypes";
import { FormColumnsOptions } from "@/types/componentConfigTypes";

export const filterRelFields = (relationshipFields: EntityStateField[], unifiedLayoutProps: UnifiedLayoutProps) => {
    const fields = relationshipFields || [];
    const entitiesToHideList = unifiedLayoutProps.entitiesToHide || [];
    return {
        filteredRelFields: fields.filter((field) => !entitiesToHideList.includes(field.entityName)),
        hiddenRelFields: fields.filter((field) => entitiesToHideList.includes(field.entityName)),
    };
};

// Helper function to generate grid column classes based on formColumns setting
const getGridColumnsClass = (formColumns: FormColumnsOptions): string => {
    if (formColumns === "auto") {
        // Auto responsive behavior
        return "grid grid-cols-1 @[600px]:grid-cols-2 @[900px]:grid-cols-3 @[1200px]:grid-cols-4";
    }

    // Fixed column count
    return `grid grid-cols-${formColumns}`;
};

// Helper function to get gap class based on density
const getGapClass = (density: ComponentDensity): string => {
    switch (density) {
        case "compact":
            return "gap-1";
        case "normal":
            return "gap-2";
        case "comfortable":
            return "gap-5";
        default:
            return "gap-2";
    }
};

const formStyles = {
    form: {
        compact: "@container w-full py-0.5, px-1",
        normal: "@container w-full py-1, px-2",
        comfortable: "@container w-full py-2, px-3",
    },
    header: {
        compact: "flex items-center justify-end p-1 gap-1",
        normal: "flex items-center justify-end p-2 gap-2",
        comfortable: "flex items-center justify-end p-3 gap-3",
    },
    fieldsWrapper: {
        compact: "space-y-0",
        normal: "space-y-1",
        comfortable: "space-y-2",
    },
    relationshipFields: {
        compact: "space-y-0",
        normal: "space-y-1",
        comfortable: "space-y-2",
    },
    nativeFieldsMinimal: {
        compact: "grid grid-cols-1 gap-1 space-y-2",
        normal: "grid grid-cols-1 gap-3 space-y-3",
        comfortable: "grid grid-cols-1 gap-5 space-y-5",
    },
    footer: {
        compact: "flex items-center justify-end pt-2",
        normal: "flex items-center justify-end pt-3",
        comfortable: "flex items-center justify-end pt-4 pb-1",
    },
};

type StyleElement = "form" | "header" | "fieldsWrapper" | "relationshipFields" | "nativeFieldsMinimal" | "footer";

export const getFormStyle = (element: StyleElement, density: ComponentDensity): string => {
    return formStyles[element][density];
};

// New function to get native fields style with dynamic columns
export const getNativeFieldsStyle = (formColumns: FormColumnsOptions, density: ComponentDensity): string => {
    const gridClass = getGridColumnsClass(formColumns);
    const gapClass = getGapClass(density);
    return `${gridClass} ${gapClass}`;
};


const EntityFormStandard = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps, recordId?: MatrxRecordId) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const recordIdToUse = recordId || useAppSelector(selectors.selectActiveRecordId);
    const showRelatedFields = true;
    const density = useMemo(() => unifiedLayoutProps.dynamicStyleOptions?.density || "normal", [unifiedLayoutProps.dynamicStyleOptions]);
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields, visibleRelationshipFields } = fieldVisibility;

    const gridColumns = unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions?.formColumns!;

    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer<TEntity>(
        entityKey,
        recordIdToUse,
        unifiedLayoutProps
    );

    return (
        <div className={getFormStyle("form", density)}>
            <div className={getFormStyle("header", density)}>
                <SmartCrudButtons
                    entityKey={entityKey}
                    recordId={recordIdToUse}
                    options={{
                        allowCreate: true,
                        allowEdit: true,
                        allowCancel: true,
                        allowDelete: true,
                        allowRefresh: true,
                        allowAdvanced: true,
                        showConfirmation: true,
                        forceEnable: true,
                    }}
                    layout={{
                        buttonLayout: "row",
                        buttonSize: "icon",
                    }}
                    unifiedLayoutProps={unifiedLayoutProps}
                />
                <FieldSelectionControls fieldVisibility={fieldVisibility} showControls={false} />
            </div>

            <div className={getFormStyle("fieldsWrapper", density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getNativeFieldsStyle(gridColumns, density)}>{visibleNativeFields.map(getNativeFieldComponent)}</div>
                )}

                {visibleRelationshipFields.length > 0 && (
                    <div className={getFormStyle("relationshipFields", density)}>
                        {visibleRelationshipFields.map(getRelationshipFieldComponent)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntityFormStandard;
