// Modified InlineFormCard to match ArmaniForm styling
import React, {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui";
import {X} from "lucide-react";
import {motion} from "framer-motion";
import {cn} from "@/lib/utils";
import {
    cardVariants,
    densityConfig,
    spacingConfig,
} from "../../../../config/ui/entity-layout-config";

const InlineFormCard = ({
                            parentField,
                            actionMap,
                            onClose,
                            density = 'normal',
                            animationPreset = 'smooth',
                            renderField
                        }) => {
    console.log('InlineFormCard mounted for:', {
        parentFieldName: parentField.name,
        inlineFieldsCount: parentField.inlineFields?.length
    });

    const [values, setValues] = useState({});
    const densityStyles = spacingConfig[density];

    const handleChange = (fieldName, value) => {
        console.log('InlineFormCard field changed:', { fieldName, value });
        setValues(prev => ({...prev, [fieldName]: value}));
    };
    return (
        <Card className={cn("mt-2", densityStyles.padding)}>
            <CardHeader className="pb-2">
                <CardTitle className={cn(
                    "text-lg font-medium",
                    densityConfig[density].fontSize
                )}>
                    {parentField.label} Details
                </CardTitle>
                <button
                    onClick={onClose}
                    className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Close"
                >
                    <X className="h-4 w-4"/>
                </button>
            </CardHeader>
            <CardContent className="pt-0">
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                    densityStyles.gap
                )}>
                    {parentField.inlineFields?.map((field) => (
                        <motion.div
                            key={field.name}
                            variants={cardVariants[animationPreset]}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            {renderField({
                                field,
                                value: values[field.name],
                                onChange: (value) => handleChange(field.name, value),
                                density,
                                animationPreset
                            })}
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default InlineFormCard;
