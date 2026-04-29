// features/administration/schema-visualizer/ComponentIcon.tsx
// Maps a Postgres `data_type` string to a Lucide icon. Standalone — no
// dependency on the legacy `ENTITY_FIELD_COMPONENTS` registry.

import {
    AlignLeft,
    Braces,
    Calendar,
    Clock,
    Component,
    Hash,
    Image as ImageIcon,
    Key,
    Link2,
    ListFilter,
    TextIcon,
    ToggleLeft,
    Type,
    type LucideIcon,
} from "lucide-react";

// Best-effort mapping. Anything not matched falls back to a generic Component icon.
const dataTypeIconMap: Record<string, LucideIcon> = {
    // Strings
    text: AlignLeft,
    "character varying": TextIcon,
    varchar: TextIcon,
    char: TextIcon,
    "character": TextIcon,
    citext: TextIcon,
    name: TextIcon,

    // Numbers
    integer: Hash,
    int: Hash,
    int2: Hash,
    int4: Hash,
    int8: Hash,
    smallint: Hash,
    bigint: Hash,
    numeric: Hash,
    decimal: Hash,
    real: Hash,
    "double precision": Hash,
    float: Hash,
    float4: Hash,
    float8: Hash,
    money: Hash,

    // Booleans
    boolean: ToggleLeft,
    bool: ToggleLeft,

    // Date / time
    date: Calendar,
    timestamp: Clock,
    "timestamp without time zone": Clock,
    "timestamp with time zone": Clock,
    timestamptz: Clock,
    time: Clock,
    "time without time zone": Clock,
    "time with time zone": Clock,
    interval: Clock,

    // JSON
    json: Braces,
    jsonb: Braces,

    // UUID / identity
    uuid: Key,

    // Arrays / enum-ish
    "ARRAY": ListFilter,
    "USER-DEFINED": Type,

    // Binary / images
    bytea: ImageIcon,

    // Network / link-like
    inet: Link2,
    cidr: Link2,
    macaddr: Link2,
};

export function ComponentIcon({
    dataType,
    className,
    size = 16,
    strokeWidth = 2,
}: {
    dataType: string;
    className?: string;
    size?: number;
    strokeWidth?: number;
}) {
    const normalized = dataType?.toLowerCase?.() ?? "";
    const IconComponent =
        dataTypeIconMap[dataType] ?? dataTypeIconMap[normalized] ?? Component;

    return (
        <IconComponent className={className} size={size} strokeWidth={strokeWidth} />
    );
}
