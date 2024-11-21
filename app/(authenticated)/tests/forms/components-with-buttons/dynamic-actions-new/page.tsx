'use client';

import React from 'react';
import {useAppDispatch} from 'lib/redux/hooks';
import ActionForm from "./components/DynamicActionForm";
import {mapFields} from "./action-creator";


export default function Page() {
    const fieldDefinitions = [
        {
            id: '1001-func-name',
            label: 'Function Name',
            defaultComponent: 'select',
            enumValues: [
                {value: 'someName', label: 'Some name'},
                {value: 'anotherName', label: 'Another Name'},
                {value: 'yetAnotherName', label: 'Yet Another Name'},
                {value: 'oneMoreName', label: 'One More Name'},
            ],
            subComponent: null,
            type: 'simple',
            actionKeys: [],
            actionProps: {}
        },
        {
            id: '1001-module_name',
            label: 'Module Name',
            defaultComponent: 'input',
            subComponent: null,
            type: 'simple',
            actionKeys: ['entityQuickSidebar'],
            componentProps: {entityKey: 'emails'},
        },
        {
            id: 'func_description',
            label: 'Function Description',
            defaultComponent: 'Textarea',
            subComponent: "RichText",
            type: 'simple',
            actionKeys: []
        },
        {
            id: '1002-args',
            label: 'Arguments',
            defaultComponent: 'input',
            type: 'relation',
            actionKeys: ['entityList'],
            componentProps: {entityKey: 'registeredFunction'},
            inlineFields: [
                {
                    id: 'arg_id',
                    label: 'ID',
                    type: 'custom',
                    actionKeys: ['entityList'],
                    componentProps: {entityKey: 'arg', showCreateNewButton: false}
                },
                {
                    id: 'argName',
                    label: 'Name',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
                {
                    id: '1005',
                    label: 'Value',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
                {
                    id: '1006',
                    label: 'Ready',
                    defaultComponent: 'select',
                    enumValues: [
                        {value: 'yes', label: 'Yes'},
                        {value: 'no', label: 'No'}
                    ],
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
                {
                    id: '1007',
                    label: 'Description',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
            ]
        },
        {
            id: '1002-sys-func',
            label: 'System Function',
            defaultComponent: 'input',
            type: 'relation',
            actionKeys: ['entityList'],
            componentProps: {entityKey: 'registeredFunction'},
            inlineFields: [
                {
                    id: 'sys_func_id',
                    label: 'Function ID',
                    type: 'custom',
                    actionKeys: ['entityList'],
                    componentProps: {entityKey: 'systemFunction', showCreateNewButton: false}
                },
                {
                    id: 'funcName',
                    label: 'Official Function Name',
                    type: 'sheet',
                    actionKeys: []
                },
                {
                    id: 'description',
                    label: 'Function Description',
                    type: 'sheet',
                    actionKeys: []
                },
            ]
        },
        {
            id: '1002-json-test',
            label: 'Configuration',
            type: 'json',
            actionKeys: ['jsonEditor']
        },
        {
            id: '1003-entity-list',
            label: 'Entity Selection',
            type: 'custom',
            actionKeys: ['entityList'],
            componentProps: {entityKey: 'arg', showCreateNewButton: false}
        },
        {
            id: '1004-sheet-test',
            label: 'Sheet Field',
            type: 'sheet',
            actionKeys: ['sheetTriggerAction']
        },
    ];

    const dispatch = useAppDispatch();
    const fields = mapFields(dispatch, fieldDefinitions);
    return <ActionForm fields={fields}/>;
}
