import { MatrxRecordId } from "@/types"

type DataBrokers = {
    id: MatrxRecordId
    name: string
    defaultValue?: string
    color?: string
    status?: "new" | "active" | "archived" | "deleted" | string
    defaultComponent?: string
    dataType?: string
}

export enum DisplayMode {
    ENCODED = 'encoded',
    ID_ONLY = 'id_only',
    NAME = 'name',
    DEFAULT_VALUE = 'default_value',
    STATUS = 'status'
}

export interface LayoutMetadata {
    position: number;
    isVisible: boolean;
    type?: string;
}


export interface EditorState {
    encodedContent: string;
    currentDisplay: DisplayMode;
    displayContent?: string;
    brokers: DataBrokers[];
    layout?: LayoutMetadata;
}
