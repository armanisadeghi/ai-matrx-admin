// lib/schema/registry.ts
import {UnifiedSchemaAll} from "@/lib/redux/schema/concepts/types";

export class SchemaRegistry {
    private schemas: Map<string, UnifiedSchemaAll> = new Map();
    private generators: Map<string, SchemaGenerator> = new Map();

    register(schema: UnifiedSchemaAll) {
        this.schemas.set(schema.id, schema);
    }

    registerGenerator(type: string, generator: SchemaGenerator) {
        this.generators.set(type, generator);
    }

    async generateSchema(type: string, config: any): Promise<UnifiedSchemaAll> {
        const generator = this.generators.get(type);
        if (!generator) throw new Error(`No generator found for type: ${type}`);
        const schema = await generator.generate(config);
        this.register(schema);
        return schema;
    }

    getSchema(id: string): UnifiedSchemaAll {
        const schema = this.schemas.get(id);
        if (!schema) throw new Error(`Schema not found: ${id}`);
        return schema;
    }
}
