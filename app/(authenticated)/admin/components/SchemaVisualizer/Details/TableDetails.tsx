// components/SchemaVisualizer/Details/TableDetails.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {ENTITY_FIELD_COMPONENTS} from "@/components/matrx/ArmaniForm/field-components";


interface EntityField {
    fieldNameFormats: { pretty: string };
    dataType: string;
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
    defaultComponent?: keyof typeof ENTITY_FIELD_COMPONENTS;
}

type RelationshipType = 'foreignKey' | 'inverseForeignKey' | 'manyToMany';

interface Relationship {
    relationshipType: RelationshipType;
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

interface Entity {
    entityNameFormats: { pretty: string };
    schemaType: string;
    primaryKey: string | string[];
    entityFields: Record<string, { fieldNameFormats: { pretty: string }; dataType: string }>;
    relationships: Relationship[];
}

export function TableDetails({ entity }) {
    return (
        <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-2xl font-bold mb-2">{entity.entityNameFormats.pretty}</h2>
                    <Badge variant={
                        entity.schemaType === 'table' ? 'default' :
                        entity.schemaType === 'view' ? 'secondary' :
                        entity.schemaType === 'dynamic' ? 'destructive' : 'outline'
                    }>
                        {entity.schemaType}
                    </Badge>
                </div>

                <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="fields">Fields</TabsTrigger>
                        <TabsTrigger value="relationships">Relationships</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Primary Key</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type</span>
                                        <span>{entity.primaryKeyMetadata.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fields</span>
                                        <span>{entity.primaryKeyMetadata.fields.join(', ')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Display Field</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Field Name</span>
                                        <span>{entity.displayFieldMetadata.fieldName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Database Field</span>
                                        <span>{entity.displayFieldMetadata.databaseFieldName}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="fields">
                        <Card>
                            <CardContent className="space-y-4">
                                {Object.entries(entity.entityFields).map(([key, field]) => (
                                    <div key={key} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                                        <div>
                                            <p className="font-medium">{field.fieldNameFormats.pretty}</p>
                                            <p className="text-sm text-muted-foreground">{field.dataType}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {field.isPrimaryKey && (
                                                <Badge variant="secondary">Primary Key</Badge>
                                            )}
                                            {field.isDisplayField && (
                                                <Badge variant="outline">Display Field</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="relationships">
                        <Card>
                            <CardContent className="space-y-4">
                                {entity.relationships.map((rel, index) => (
                                    <div key={index} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={
                                                rel.relationshipType === 'foreignKey' ? 'default' :
                                                rel.relationshipType === 'manyToMany' ? 'secondary' :
                                                'outline'
                                            }>
                                                {rel.relationshipType}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Column</span>
                                                <span>{rel.column}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Related Table</span>
                                                <span>{rel.relatedTable}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Related Column</span>
                                                <span>{rel.relatedColumn}</span>
                                            </div>
                                            {rel.junctionTable && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Junction Table</span>
                                                    <span>{rel.junctionTable}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ScrollArea>
    )
}
