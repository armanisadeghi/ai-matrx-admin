type ValidationData = {
    [key: string]: any; // Contains the data object
    fields?: string[]; // For validations that work on multiple fields
    field?: string; // For validations that target a single field
    regex?: RegExp; // For format validations
    maxLength?: number; // For length validations
    range?: { min: number; max: number }; // For range validations
    foreignKeyTable?: string; // For foreign key validations
    allowedValues?: any[]; // For enum validations
    defaultValue?: any; // For default value validations
    lastUpdated?: Date; // For concurrency validations
};

type ValidationResult = true | { field: string; message: string };

const validateUniqueness = (props: ValidationData): ValidationResult => {
    const {field, [field!]: value} = props;
    console.log(`Validating uniqueness for field: ${field}, value: ${value}`);
    // Example failure condition
    if (!value) {
        return {field: field!, message: `Field "${field}" must be unique but is missing or empty.`};
    }
    return true;
};

const validateRequiredFields = (props: ValidationData): ValidationResult => {
    const {fields, ...data} = props;
    console.log(`Validating required fields: ${fields}, data:`, data);

    const missingFields = fields!.filter((f) => !data[f]);
    if (missingFields.length > 0) {
        return {
            field: missingFields[0],
            message: `Required field "${missingFields[0]}" is missing.`,
        };
    }
    return true;
};


const validateLength = (props: ValidationData): ValidationResult => {
    const {field, maxLength, [field!]: value} = props;
    if (typeof value === "string" && value.length > maxLength!) {
        return {field: field!, message: `Field "${field}" exceeds maximum length of ${maxLength}.`};
    }
    console.log(`Validating length for field: ${field}, value: ${value}, maxLength: ${maxLength}`);
    return true;
};

const validateRange = (props: ValidationData): ValidationResult => {
    const {field, range, [field!]: value} = props;
    if (typeof value === "number" && (value < range!.min || value > range!.max)) {
        return {field: field!, message: `Field "${field}" must be between ${range!.min} and ${range!.max}.`};
    }
    console.log(`Validating range for field: ${field}, value: ${value}, range: ${JSON.stringify(range)}`);
    return true;
};

const validateForeignKey = (props: ValidationData): ValidationResult => {
    const {field, foreignKeyTable, [field!]: value} = props;
    // Placeholder: Replace with actual check for foreign key existence
    console.log(`Validating foreign key for field: ${field}, value: ${value}, foreign key table: ${foreignKeyTable}`);
    return true;
};

const validateEnum = (props: ValidationData): ValidationResult => {
    const {field, allowedValues, [field!]: value} = props;
    if (!allowedValues!.includes(value)) {
        return {field: field!, message: `Field "${field}" must be one of: ${allowedValues!.join(", ")}.`};
    }
    console.log(`Validating enum for field: ${field}, value: ${value}, allowed values: ${allowedValues}`);
    return true;
};

const validateCompositeKey = (props: ValidationData): ValidationResult => {
    const {fields, ...data} = props;
    const values = fields!.map((f) => data[f]);
    if (values.some((v) => v === undefined || v === null)) {
        return {
            field: fields![0],
            message: `Composite key validation failed for fields: ${fields}. Missing value in one or more fields.`
        };
    }
    console.log(`Validating composite key for fields: ${fields}, values: ${values}`);
    return true;
};

const validateInputFormat = (props: ValidationData): ValidationResult => {
    const {field, regex, [field!]: value} = props;
    if (!regex!.test(value)) {
        return {field: field!, message: `Field "${field}" does not match the required format.`};
    }
    console.log(`Validating input format for field: ${field}, value: ${value}, regex: ${regex}`);
    return true;
};

const validateDefaultValues = (props: ValidationData): ValidationResult => {
    const {field, defaultValue, [field!]: value} = props;
    if (value === undefined || value === null) {
        return {field: field!, message: `Field "${field}" is missing and should default to "${defaultValue}".`};
    }
    console.log(`Validating default value for field: ${field}, value: ${value}, default: ${defaultValue}`);
    return true;
};

const validateConcurrency = (props: ValidationData): ValidationResult => {
    const {field, lastUpdated, [field!]: value} = props;
    // Placeholder: Replace with actual concurrency logic
    console.log(`Validating concurrency for field: ${field}, value: ${value}, last updated: ${lastUpdated}`);
    return true;
};

const validateIndexConstraint = (props: ValidationData): ValidationResult => {
    const {field, [field!]: value} = props;
    // Placeholder: Replace with actual index constraint logic
    console.log(`Validating index constraint for field: ${field}, value: ${value}`);
    return true;
};


export const runEntityValidation = (data: { [key: string]: any }): ValidationResult[] | true => {
    const {validationFunctions, ...validationData} = data;

    // Map of validation function names to actual functions
    const validationMap: { [key: string]: (props: ValidationData) => ValidationResult } = {
        validateUniqueness,
        validateRequiredFields,
        validateLength,
        validateRange,
        validateForeignKey,
        validateEnum,
        validateCompositeKey,
        validateInputFormat,
        validateDefaultValues,
        validateConcurrency,
        validateIndexConstraint,
    };

    const errors: { field: string; message: string }[] = [];

    validationFunctions.forEach((validationFunction: string) => {
        const validation = validationMap[validationFunction];
        if (validation) {
            const result = validation(validationData);
            if (result !== true) {
                errors.push(result);
            }
        } else {
            console.warn(`Validation function "${validationFunction}" not found.`);
        }
    });

    return errors.length === 0 ? true : errors;
};

/*
// Example usage
const exampleData = {
    name: "John Doe",
    email: "",
    username: "johndoe",
    age: 30,
    userId: 1,
    status: "active",
    productId: 101,
    createdAt: new Date(),
    updatedAt: new Date(),
    validationFunctions: ["validateRequiredFields", "validateUniqueness"],
};

const validationResult = runEntityValidation({
    ...exampleData,
    fields: ["name", "email"], // For validateRequiredFields
    field: "email", // For validateUniqueness
});

if (validationResult === true) {
    console.log("All validations passed!");
} else {
    console.error("Validation errors:", validationResult);
}
*/
