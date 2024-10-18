interface Clipboard {
    writeText(text: string): Promise<void>;
}

interface NavigatorClipboard {
    clipboard?: Clipboard;
}

interface Navigator extends NavigatorClipboard {}

import * as SchemaTypes from './types/tableSchemaTypes';

declare global {
    type SchemaTypes = typeof SchemaTypes;
}
