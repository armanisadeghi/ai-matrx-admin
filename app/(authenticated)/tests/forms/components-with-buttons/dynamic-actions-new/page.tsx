'use client';

import React from 'react';
import {useAppDispatch} from 'lib/redux/hooks';
import ActionForm from "./components/DynamicActionForm";
import {mapFields} from "./action-creator";


export default function Page() {
    const fieldDefinitions = [
        {
            label: 'Function 1 Name',
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
            label: 'Module Name',
            defaultComponent: 'input',
            subComponent: null,
            type: 'simple',
            actionKeys: ['entityQuickSidebar'],
            actionProps: {entityKey: 'emails'},
        },
        {
            label: 'Function Description',
            defaultComponent: 'Textarea',
            subComponent: "RichText",
            type: 'simple',
            actionKeys: []
        },
        {
            label: 'Arguments',
            defaultComponent: 'input',
            type: 'relation',
            actionKeys: ['entityList'],
            actionProps: {entityKey: 'registeredFunction'},
            inlineFields: [
                {
                    label: 'ID',
                    type: 'custom',
                    actionKeys: ['entityList'],
                    actionProps: {entityKey: 'arg', showCreateNewButton: false}
                },
                {
                    label: 'Name',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
                {
                    label: 'Value',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
                {
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
                    label: 'Description',
                    type: 'sheet',
                    actionKeys: ['sheetTriggerAction']
                },
            ]
        },
        {
            label: 'System Function',
            defaultComponent: 'input',
            type: 'relation',
            actionKeys: ['entityList'],
            actionProps: {entityKey: 'registeredFunction'},
            inlineFields: [
                {
                    label: 'Function ID',
                    type: 'custom',
                    actionKeys: ['entityList'],
                    actionProps: {entityKey: 'systemFunction', showCreateNewButton: true}
                },
                {
                    label: 'Official Function Name',
                    type: 'sheet',
                    actionKeys: []
                },
                {
                    label: 'Function Description',
                    type: 'sheet',
                    actionKeys: []
                },
            ]
        },
        {
            label: 'Configuration',
            type: 'json',
            actionKeys: ['jsonEditor']
        },
        {
            label: 'Entity Selection',
            type: 'custom',
            actionKeys: ['entityList'],
            actionProps: {entityKey: 'arg', showCreateNewButton: true}
        },
        {
            label: 'Sheet Field',
            type: 'sheet',
            actionKeys: ['sheetTriggerAction']
        },
    ];

    const dispatch = useAppDispatch();
    const fields = mapFields(dispatch, fieldDefinitions);
    return <ActionForm fields={fields}/>;
}
