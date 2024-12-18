// global.d.ts

interface Clipboard {
    writeText(text: string): Promise<void>;
}

interface NavigatorClipboard {
    clipboard?: Clipboard;
}

interface Navigator extends NavigatorClipboard {}

declare module 'immer' {
    type Draft<T> = T
}

export interface HTMLInputElement {
    webkitdirectory?: boolean | string;
}


// declare namespace SchemaTypes {
//     export * from './types/automationTableTypes.ts';
// }



// import * as SchemaTypes from './types/automationTableTypes.ts';
//
// declare global {
//     type SchemaTypes = typeof SchemaTypes;
// }

