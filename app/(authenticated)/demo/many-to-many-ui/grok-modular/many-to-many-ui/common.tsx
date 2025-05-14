import { EntityDisplayConfig } from "./definitions";

export const renderEntityFields = (entity: any, config: EntityDisplayConfig) => {
    const primary = entity[config.primaryField] || config.fallbackPrimary || "Unnamed";
    const secondary = config.secondaryFields
        ?.map(({ field, label, format }) => (entity[field] ? `${label || field}: ${format ? format(entity[field]) : entity[field]}` : ""))
        .filter(Boolean)
        .join(" • ");

    return (
        <div>
            <span className="font-semibold">{primary}</span>
            {secondary && <p className="text-xs text-gray-600 dark:text-gray-400">{secondary}</p>}
        </div>
    );
};
