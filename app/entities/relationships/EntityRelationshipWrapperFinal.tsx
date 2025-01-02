"use client";

import React, { useMemo } from "react";
import {
  EntityStateField,
  MatrxRecordId,
} from "@/lib/redux/entity/types/stateTypes";
import RelatedEntityAccordionFinal from "./RelatedEntityAccordionFinal";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntityKeys } from "@/types";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";

export interface EntityRelationshipWrapperProps {
  entityKey: EntityKeys;
  fieldName: string;
  recordId?: MatrxRecordId;
  unifiedLayoutProps?: UnifiedLayoutProps;
  className?: string;
}

const EntityRelationshipWrapperFinal = ({
  entityKey,
  fieldName,
  recordId = null,
  unifiedLayoutProps,
  className = "",
}: EntityRelationshipWrapperProps) => {
  const Component = RelatedEntityAccordionFinal;
  const selectors = useMemo(
    () => createEntitySelectors(entityKey),
    [entityKey]
  );
  const entityStatus = useAppSelector(selectors.selectEntityStatus);
  const fieldMetadata = useAppSelector((state) =>
    selectors.selectFieldMetadata(state, fieldName)
  );
  const databaseValue = useAppSelector((state) =>
    recordId
      ? selectors.selectFieldValue(state, recordId, fieldName)
      : undefined
  );

  const entityKeyToUse = (fieldMetadata: EntityStateField) => {
    if (!fieldMetadata.isNative) {
      // console.log('EntityRelationshipWrapperFinal: returning entityName:', fieldMetadata.entityName);
      return fieldMetadata.entityName;
    } else {
      throw new Error(
        "EntityRelationshipWrapperFinal: field is not an entity relationship"
      );
    }
  };

  return (
    <Component
      entityKey={entityKeyToUse(fieldMetadata)}
      unifiedLayoutProps={unifiedLayoutProps}
      fieldValue={databaseValue}
      activeEntityRecordId={recordId}
      activeEntityKey={entityKey}
    />
  );
};

EntityRelationshipWrapperFinal.displayName = "EntityRelationshipWrapperFinal";

export default EntityRelationshipWrapperFinal;
