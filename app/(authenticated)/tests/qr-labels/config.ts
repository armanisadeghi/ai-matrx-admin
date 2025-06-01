// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'QR Label Generator',
        path: 'qr-label-generator',
        relative: true,
        description: ''
    },
    {
        title: 'PDF Generator',
        path: 'pdf-generator',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/qr-labels';
export const MODULE_NAME = 'QR Label Generator';


export const sampleLabelEntries = [
    {
      qr_value: 'VS3126-Ava-Mini-MN-RED-XL',
      text_elements: ['Ava-Mini', 'Mini Dress', 'Red', 'XL', '01/15/24 | Price: $45 | Inv: 24 |     |     |     |     |     |']
    },
    {
        'qr_value': 'VS3126-Ava-Mini-MN-RED-XL',
        'text_elements': ['Ava-Mini', 'Mini Dress', 'Red', 'XL', '01/15/24 | Prince: $45 | Inv: 24 |     |     |     |     |     |'],
    },
    {
        'qr_value': '1122334455',
        'text_elements': ['Product C', 'Description C', 'More Info C', 'Additional C', 'Extra C'],
    },  ];
