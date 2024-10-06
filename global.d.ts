interface Clipboard {
    writeText(text: string): Promise<void>;
}

interface NavigatorClipboard {
    clipboard?: Clipboard;
}

interface Navigator extends NavigatorClipboard {}