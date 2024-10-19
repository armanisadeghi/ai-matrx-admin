import { AutomationSchema, TableShape, FieldName, FieldType } from './AutomationSchemaTypes';

// Concrete schema example
const schema: AutomationSchema = {
    users: {
        tableNameVariations: {
            frontendName: "User",
            backendName: "User",
            databaseName: "users",
            prettyName: "User",
            componentName: "UserComponent",
        },
        type: "table",
        fields: {
            id: {
                fieldNameVariations: {
                    frontendName: "id",
                    backendName: "id",
                    databaseName: "id",
                    prettyName: "ID",
                    componentName: "IdField",
                },
                dataType: "uuid",
                isNullable: false,
                structure: "single",
                isPrimaryKey: true,
            },
            username: {
                fieldNameVariations: {
                    frontendName: "username",
                    backendName: "username",
                    databaseName: "username",
                    prettyName: "Username",
                    componentName: "UsernameInput",
                },
                dataType: "string",
                isNullable: false,
                structure: "single",
                maxLength: 50,
            },
            email: {
                fieldNameVariations: {
                    frontendName: "email",
                    backendName: "email",
                    databaseName: "email",
                    prettyName: "Email",
                    componentName: "EmailInput",
                },
                dataType: "string",
                isNullable: false,
                structure: "single",
            },
            age: {
                fieldNameVariations: {
                    frontendName: "age",
                    backendName: "age",
                    databaseName: "age",
                    prettyName: "Age",
                    componentName: "AgeInput",
                },
                dataType: "number",
                isNullable: true,
                structure: "single",
            },
        },
        fetchStrategy: "lazy",
        relationships: [],
    },
};

// Type usage examples
type UserShape = TableShape<typeof schema, "users">;
// Should be: { id: string; username: string; email: string; age: number | null; }

type UserFields = FieldName<typeof schema, "users">;
// Should be: "id" | "username" | "email" | "age"

type EmailType = FieldType<typeof schema, "users", "email">;
// Should be: string

// Function using the inferred types
function processUser(user: UserShape) {
    console.log(user.username);  // TypeScript should recognize this as a string
    if (user.age !== null) {
        console.log(`User is ${user.age} years old`);  // TypeScript should recognize age as number | null
    }
}

// Usage
const user: UserShape = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "john_doe",
    email: "john@example.com",
    age: 30
};

processUser(user);
