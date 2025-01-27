// Create Maps for our different levels
const ENTITIES = new Map();
const FIELDS = new Map();
const FIELD_METADATA = new Map();

// Helper to set up an entity with its fields
const defineEntity = (entityName, fieldDefinitions) => {
    const entityFields = new Map();
    
    fieldDefinitions.forEach(fieldDef => {
        const fieldId = `${entityName}.${fieldDef.name}`;
        
        // Store field metadata
        FIELD_METADATA.set(fieldId, {
            isPrimaryKey: fieldDef.isPrimaryKey || false,
            displayName: fieldDef.displayName || fieldDef.name,
            isForeignKey: fieldDef.isForeignKey || false,
            // ... other metadata
        });
        
        // Store field with reference to its metadata
        entityFields.set(fieldDef.name, {
            get metadata() {
                return FIELD_METADATA.get(fieldId);
            }
        });
    });
    
    // Store entity with its fields
    ENTITIES.set(entityName, entityFields);
};

// Usage example:
defineEntity('UserPreferences', [
    {
        name: 'darkMode',
        displayName: 'Dark Mode',
        isPrimaryKey: false
    },
    {
        name: 'language',
        displayName: 'Language Preference',
        isPrimaryKey: false
    }
]);

// Access pattern:
const darkModeDisplayName = ENTITIES.get('UserPreferences')
    .get('darkMode')
    .metadata.displayName;

console.log(darkModeDisplayName); // "Dark Mode"

// You could also create helper functions for cleaner access:
const getField = (entityName, fieldName) => 
    ENTITIES.get(entityName)?.get(fieldName);

const getFieldMetadata = (entityName, fieldName) => 
    getField(entityName, fieldName)?.metadata;

// Then use like:
console.log(getFieldMetadata('UserPreferences', 'darkMode').displayName);




// Version 2 ======================================== EVEN BETTER ========================================


// export class Schema {
//     #entities = new Map();

//     entity(name) {
//         if (!this.#entities.has(name)) return null;
//         return {
//             field: (fieldName) => {
//                 const fields = this.#entities.get(name);
//                 return fields?.get(fieldName);
//             }
//         };
//     }

//     defineEntity(name, fields) {
//         defineEntity(name, fields); // Using the function from above
//         return this;
//     }
// }

// // Usage:
// const schema = new Schema();
// schema.defineEntity('UserPreferences', [
//     { name: 'darkMode', displayName: 'Dark Mode' }
// ]);

// // Access like:
// const displayName = schema
//     .entity('UserPreferences')
//     .field('darkMode')
//     .metadata.displayName;





// Version 3 ======================================== EVEN BETTER THAN BETTER ========================================

// export class Schema {
//     #entities = new Map();
//     #relationships = new Map();

//     // Define an entity with its fields
//     defineEntity(name, fields) {
//         const entityFields = new Map();
        
//         fields.forEach(field => {
//             const fieldId = `${name}.${field.name}`;
//             entityFields.set(field.name, {
//                 ...field,
//                 entity: name,
//                 get primaryKey() {
//                     return field.isPrimaryKey || false;
//                 }
//             });
//         });
        
//         this.#entities.set(name, entityFields);
//         return this;
//     }

//     // Define a relationship between entities
//     defineRelationship(config) {
//         const {
//             parent,      // parent entity name
//             parentKey,   // field name in parent entity
//             join,        // joining entity name
//             joinParentKey, // field in join table that references parent
//             joinChildKey,  // field in join table that references child
//             child,       // child entity name
//             childKey,    // field name in child entity
//         } = config;

//         const relationKey = `${parent}:${join}:${child}`;
        
//         this.#relationships.set(relationKey, {
//             parent: {
//                 entity: parent,
//                 key: parentKey,
//                 joinField: joinParentKey
//             },
//             join: {
//                 entity: join,
//                 parentField: joinParentKey,
//                 childField: joinChildKey
//             },
//             child: {
//                 entity: child,
//                 key: childKey,
//                 joinField: joinChildKey
//             }
//         });
//     }

//     // Getters for relationships
//     getRelationship(parentEntity, joinEntity, childEntity) {
//         const key = `${parentEntity}:${joinEntity}:${childEntity}`;
//         return this.#relationships.get(key);
//     }

//     // Get field info from an entity
//     getField(entityName, fieldName) {
//         return this.#entities.get(entityName)?.get(fieldName);
//     }
// }

// // Usage example:
// const schema = new Schema();

// // Define entities
// schema.defineEntity('users', [
//     { name: 'user_id', isPrimaryKey: true },
//     { name: 'name' }
// ]);

// schema.defineEntity('projects', [
//     { name: 'id', isPrimaryKey: true },
//     { name: 'name' }
// ]);

// schema.defineEntity('userProjects', [
//     { name: 'user', isForeignKey: true },
//     { name: 'project', isForeignKey: true },
//     { name: 'status' }
// ]);

// // Define the relationship
// schema.defineRelationship({
//     parent: 'users',
//     parentKey: 'user_id',
//     join: 'userProjects',
//     joinParentKey: 'user',
//     joinChildKey: 'project',
//     child: 'projects',
//     childKey: 'id'
// });

// // Usage examples:
// const relationship = schema.getRelationship('users', 'userProjects', 'projects');
// console.log(relationship);
// /* Output would look like:
// {
//     parent: {
//         entity: 'users',
//         key: 'user_id',
//         joinField: 'user'
//     },
//     join: {
//         entity: 'userProjects',
//         parentField: 'user',
//         childField: 'project'
//     },
//     child: {
//         entity: 'projects',
//         key: 'id',
//         joinField: 'project'
//     }
// }
// */

// // You could even add helper methods for common queries:
// const userProjectField = schema.getField('userProjects', 'user');
// console.log(userProjectField);  // { name: 'user', isForeignKey: true, entity: 'userProjects' }


// Version 4 ======================================== EVEN BETTER THAN BETTER THAN BETTER ========================================

export class Schema {
    #entities = new Map();
    #relationships = new Map();

    defineEntity(name, fields) {
        // ... same as before ...
    }

    // More flexible relationship definition
    defineRelationship({
        name,           // optional name for the relationship
        references = [] // array of all entity references in order
    }) {
        // Create a unique key for this relationship
        const relationKey = name || references.map(ref => ref.entity).join(':');
        
        // Store the relationship chain
        this.#relationships.set(relationKey, {
            references: references.map((ref, index) => ({
                entity: ref.entity,
                as: ref.as,                    // what this entity calls it
                referencedAs: ref.referencedAs // what other entities call it
            }))
        });
    }
}

// Usage examples:
const schema = new Schema();

// Direct relationship (2 entities)
schema.defineRelationship({
    name: 'userSettings',
    references: [
        { 
            entity: 'users',
            as: 'id'           // users table calls it 'id'
        },
        {
            entity: 'settings',
            as: 'settings_id',     // settings table calls it 'settings_id'
            referencedAs: 'user_id' // but references users.id as 'user_id'
        }
    ]
});

// Three-way relationship
schema.defineRelationship({
    name: 'userProjects',
    references: [
        {
            entity: 'users',
            as: 'user_id'
        },
        {
            entity: 'userProjects',
            as: 'id',
            referencedAs: 'user'  // references users as 'user'
        },
        {
            entity: 'projects',
            as: 'project_id',
            referencedAs: 'project' // referenced in userProjects as 'project'
        }
    ]
});

// Complex relationship (5 entities)
schema.defineRelationship({
    name: 'userTeamProjectTaskComments',
    references: [
        { entity: 'users', as: 'id' },
        { entity: 'teams', as: 'team_id', referencedAs: 'team' },
        { entity: 'projects', as: 'project_id', referencedAs: 'project' },
        { entity: 'tasks', as: 'task_id', referencedAs: 'task' },
        { entity: 'comments', as: 'comment_id', referencedAs: 'comment' }
    ]
});