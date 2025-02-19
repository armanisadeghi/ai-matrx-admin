"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useCallback, useEffect, useState } from "react";
import {  useAppSelector, useEntityTools } from "@/lib/redux";
import { BrokerValueData, DataBrokerRecordWithKey } from "@/types";
import useCreateUpdateRecord from "@/app/entities/hooks/crud/useCreateUpdateRecord";


export const useCreateUpdateBrokerValue = (brokerId: string) => {    
    const { start, updateField, updateFields, save, currentRecordId, recordDataWithDefaults, recordDataWithoutDefaults, fieldDefaults } =
        useCreateUpdateRecord({
            entityKey: "brokerValue",
        });
    const { selectors: brokerSelectors } = useEntityTools("dataBroker");
    const brokerRecordKey = `id:${brokerId}`;
    const broker = useAppSelector((state) =>
        brokerSelectors.selectRecordWithKey(state, brokerRecordKey)
    ) as DataBrokerRecordWithKey;
    const brokerDataType = broker?.dataType || "str";

    const [recordId, setRecordId] = useState<string | null>(currentRecordId);
    const brokerValueDefaults = fieldDefaults as BrokerValueData;
    const [valueEntry, setValueEntry] = useState<any>(null);
    const [tags, setTags] = useState<string[]>(brokerValueDefaults.tags);
    const [category, setCategory] = useState<string>(brokerValueDefaults.category);
    const [subCategory, setSubCategory] = useState<string>(brokerValueDefaults.subCategory);
    const [comments, setComments] = useState<string>(brokerValueDefaults.comments);

    const { userId } = useUser();

    useEffect(() => {
        const initialData = {dataBroker: brokerId};
        const recordId = start(initialData);
        setRecordId(recordId);
    }, []);

    const brokerValueData = {
        id: recordId,
        userId,
        dataBroker: brokerId,
        data: { value: valueEntry },
        tags: tags,
        category: category,
        subCategory: subCategory,
        comments: comments,
    };

    const handleUpdateBrokerValue = useCallback(
        (newValue: any) => {
            setValueEntry(newValue);
            updateField("data", { value: newValue });
        },
        [updateField, brokerValueData]
    );

    const handleUpdateTags = useCallback(
        (newTags: string[]) => {
            setTags(newTags);
            updateField("tags", newTags);
        },
        [updateField, brokerValueData]
    );

    const handleUpdateCategory = useCallback(
        (newCategory: string) => {
            setCategory(newCategory);
            updateField("category", newCategory);
        },
        [updateField, brokerValueData]
    );

    const handleUpdateSubCategory = useCallback(
        (newSubCategory: string) => {
            setSubCategory(newSubCategory);
            updateField("subCategory", newSubCategory);
        },
        [updateField, brokerValueData]
    );

    const handleUpdateComments = useCallback(
        (newComments: string) => {
            setComments(newComments);
            updateField("comments", newComments);
        },
        [updateField, brokerValueData]
    );

    const handleSave = useCallback(() => {
        save();
    }, [save]);

    const saveAndGetRecordId = useCallback(() => {
        save();
        const recordId = currentRecordId?.replace("new-record-", "");
        setRecordId(recordId);
    }, [save, currentRecordId]);

    const convertValue = (value: any): any => {
        switch (brokerDataType) {
            case "bool":
                return Boolean(value);
            case "int":
                return parseInt(value);
            case "float":
                return parseFloat(value);
            case "list":
                return Array.isArray(value) ? value : [value];
            case "dict":
                return typeof value === "object" ? value : {};
            default:
                return String(value);
        }
    };

    const setValue = (newValue: any) => {
        const convertedValue = convertValue(newValue);
        handleUpdateBrokerValue(convertedValue);
        setValueEntry(convertedValue);
    };

    return {
        valueEntry,
        setValue,
        tags,
        category,
        subCategory,
        comments,
        handleUpdateBrokerValue,
        handleUpdateTags,
        handleUpdateCategory,
        handleUpdateSubCategory,
        handleUpdateComments,
        handleSave,
        saveAndGetRecordId,
        recordId,
        updateFields,
        recordDataWithDefaults,
        recordDataWithoutDefaults,
        fieldDefaults,
    };
};
