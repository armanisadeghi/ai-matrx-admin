'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getStandardRelationship, RELATIONSHIP_INPUTS } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useStableJoinRecords } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';

export default function JoinRecordsTest() {
    const [relKey, setRelKey] = useState<string>('recipeMessage');
    const [parentId, setParentId] = useState('');
    
    const relDefSimple = getStandardRelationship(relKey);
    const {
      parentId: resolvedParentId,
      parentMatrxid,
      parentEntity,
      joiningEntity,
      childEntity,
      joinRecords,
      isRawLoading
    } = useStableJoinRecords(relDefSimple, parentId);
  
    return (
      <div className="w-full p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={relKey} onValueChange={setRelKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(RELATIONSHIP_INPUTS).map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="Parent ID"
            />
          </CardContent>
        </Card>
  
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>ID: {resolvedParentId}</p>
                <p>MatrxID: {parentMatrxid}</p>
                <p>Entity: {parentEntity}</p>
              </div>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Entity Names</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Joining: {joiningEntity}</p>
                <p>Child: {childEntity}</p>
              </div>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Loading: {isRawLoading.toString()}</p>
              </div>
            </CardContent>
          </Card>
  
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Join Records</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-background rounded-lg overflow-auto">
                {JSON.stringify(joinRecords, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  