
// Custom hooks (if needed)
import {useSelector} from "react-redux";
import {
    makeEntityNamesToDatabaseSelector,
    makeSelectEntityFields,
    selectEntity, selectEntityDatabaseName,
    selectEntityFields,
    selectEntityNames
} from "@/lib/redux/schema/old/schemaSelectors";
import {EntityNameOfficial} from "@/types/schema";
import {RootState} from "@/lib/redux/store";
import {useMemo} from "react";
import {EntityKeys} from "@/types/entityTypes";

export const useEntityNames = () => useSelector(selectEntityNames);

// Hooks for common use cases
export const useEntity = (entityName: EntityKeys) =>
    useSelector((state: RootState) => selectEntity(state, entityName));

export const useEntityFields = (entityName: EntityKeys) =>
    useSelector((state: RootState) => selectEntityFields(state, entityName));



export const useField = (entityName: string, fieldName: string) =>
    useSelector((state: RootState) =>
        state.globalCache.fieldsByName[`${entityName}.${fieldName}`]);



export const useEntityDatabaseName = (entityName: EntityKeys) =>
    useSelector((state: RootState) => selectEntityDatabaseName(state, entityName));

export const useEntityDatabaseNames = (entityNames: EntityKeys[]) => {
    const convertNames = useMemo(makeEntityNamesToDatabaseSelector, []);
    return useSelector((state: RootState) => convertNames(state, entityNames));
};
