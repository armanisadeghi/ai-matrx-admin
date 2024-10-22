interface Clipboard {
    writeText(text: string): Promise<void>;
}

interface NavigatorClipboard {
    clipboard?: Clipboard;
}

interface Navigator extends NavigatorClipboard {}

import * as SchemaTypes from './lib/redux/concepts/tableSchemaTypes';

declare global {
    type SchemaTypes = typeof SchemaTypes;
}
