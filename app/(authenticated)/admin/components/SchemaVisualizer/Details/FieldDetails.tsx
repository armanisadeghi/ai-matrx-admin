// components/SchemaVisualizer/Details/FieldDetails.tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
    Settings2,
    KeyRound,
    Eye,
    Database,
    Component,
    History,
    AlertCircle
} from "lucide-react"
import { ComponentIcon } from '../ComponentIcon'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {AutomationEntity, EntityKeys} from '@/types/entityTypes'

interface FieldDetailsProps {
    entity: AutomationEntity<EntityKeys>;
    fieldName: string;
}

export function FieldDetails({ entity, fieldName }: FieldDetailsProps) {
    const field = entity.entityFields[fieldName];
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-6 p-6">
                {/* Field Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">{field.fieldNameFormats.pretty}</h2>
                        <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Advanced
                        </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {field.isPrimaryKey && (
                            <Badge variant="default" className="flex items-center">
                                <KeyRound className="mr-1 h-3 w-3" />
                                Primary Key
                            </Badge>
                        )}
                        {field.isDisplayField && (
                            <Badge variant="secondary" className="flex items-center">
                                <Eye className="mr-1 h-3 w-3" />
                                Display Field
                            </Badge>
                        )}
                        <Badge variant="outline" className="flex items-center">
                            <Database className="mr-1 h-3 w-3" />
                            {field.dataType}
                        </Badge>
                    </div>
                </div>

                <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="component">Component</TabsTrigger>
                        <TabsTrigger value="validation">Validation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Field Name</p>
                                        <p className="text-sm text-muted-foreground">{field.fieldNameFormats.original}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Database Field</p>
                                        <p className="text-sm text-muted-foreground">{field.databaseFieldName}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Pretty Name</p>
                                        <p className="text-sm text-muted-foreground">{field.fieldNameFormats.pretty}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Camel Case</p>
                                        <p className="text-sm text-muted-foreground">{field.fieldNameFormats.camel}</p>
                                    </div>
                                </div>

                                {showAdvanced && (
                                    <div className="pt-4 border-t">
                                        <h4 className="text-sm font-medium mb-2">Advanced Properties</h4>
                                        <pre className="bg-muted p-4 rounded-lg text-xs">
                                            {JSON.stringify(field, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="component">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Component className="h-5 w-5" />
                                    UI Component
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {field.defaultComponent ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <ComponentIcon
                                                component={field.defaultComponent}
                                                className="h-8 w-8 text-primary"
                                            />
                                            <div>
                                                <p className="font-medium">{field.defaultComponent}</p>
                                                <p className="text-sm text-muted-foreground">Default Component</p>
                                            </div>
                                        </div>

                                        {field.componentProps && (
                                            <div className="border rounded-lg p-4">
                                                <p className="text-sm font-medium mb-2">Component Properties</p>
                                                <pre className="bg-muted p-3 rounded-md text-xs">
                                                    {JSON.stringify(field.componentProps, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                     <Alert>
                                         <AlertCircle className="h-4 w-4" />
                                         <AlertTitle>No Default Component</AlertTitle>
                                         <AlertDescription>
                                             This field doesn't have a default UI component assigned.
                                         </AlertDescription>
                                     </Alert>
                                 )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="validation">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {field.validations ? (
                                        Object.entries(field.validations).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                                                <span className="font-medium">{key}</span>
                                                <Badge variant="secondary">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                         <Alert>
                                             <AlertCircle className="h-4 w-4" />
                                             <AlertTitle>No Validations</AlertTitle>
                                             <AlertDescription>
                                                 This field doesn't have any validation rules defined.
                                             </AlertDescription>
                                         </Alert>
                                     )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ScrollArea>
    )
}
