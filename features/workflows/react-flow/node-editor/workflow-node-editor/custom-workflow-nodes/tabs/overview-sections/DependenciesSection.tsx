'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BaseNode } from '@/features/workflows/types';

interface DependenciesSectionProps {
  node: BaseNode;
  onNodeUpdate: (node: BaseNode) => void;
}

/**
 * DependenciesSection - Displays the dependencies table
 */
const DependenciesSection: React.FC<DependenciesSectionProps> = ({ node }) => {
  const dependencies = node.additional_dependencies || [];

  // Don't render if no dependencies
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Dependencies</h3>
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-8">Source Broker</TableHead>
              <TableHead className="h-8">Target Broker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dependencies.map((dependency, index) => (
              <TableRow key={index} className="text-xs">
                <TableCell className="py-2 font-mono">{dependency.source_broker_id}</TableCell>
                <TableCell className="py-2 font-mono">{dependency.target_broker_id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DependenciesSection; 