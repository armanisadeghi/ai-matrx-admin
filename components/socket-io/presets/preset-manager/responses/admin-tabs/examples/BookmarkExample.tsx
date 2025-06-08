"use client";

import React, { useState } from "react";
import { traverseBookmarkPath, isValidBookmarkSyntax, getBookmarkDescription } from "../utils/bookmarkTraversal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Search, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";

// Example data structure
const exampleData = [
  {
    result: {
      lines: ["First line", "Second line", "Third line"],
      sections: [
        { title: "Introduction", content: "This is the intro..." },
        { title: "Main Content", content: "This is the main..." },
      ],
      metadata: {
        count: 42,
        timestamp: "2024-01-01T00:00:00Z"
      }
    }
  },
  {
    result: {
      lines: ["Different first line", "Different second line"],
      sections: [
        { title: "Other Section", content: "Other content..." }
      ]
    }
  }
];

export const BookmarkExample: React.FC = () => {
  const [bookmarkPath, setBookmarkPath] = useState('data[0]["result"]["lines"]');
  const [sourceData, setSourceData] = useState(exampleData);

  const isValidSyntax = isValidBookmarkSyntax(bookmarkPath);
  const description = getBookmarkDescription(bookmarkPath);
  const traversalResult = traverseBookmarkPath(sourceData, bookmarkPath);

  const commonPaths = [
    'data[0]["result"]["lines"]',
    'data[0]["result"]["sections"]',
    'data[0]["result"]["metadata"]',
    'data[1]["result"]["lines"]',
    'data[0]["result"]["sections"][0]',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Bookmark Traversal Example
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Path Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bookmark Path:</label>
            <div className="flex gap-2">
              <Input
                value={bookmarkPath}
                onChange={(e) => setBookmarkPath(e.target.value)}
                placeholder='e.g., data[0]["result"]["lines"]'
                className="font-mono"
              />
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Validation */}
          <div className="flex items-center gap-2">
            {isValidSyntax ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid Syntax
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Invalid Syntax
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {description}
            </span>
          </div>

          {/* Common Paths */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Examples:</label>
            <div className="flex flex-wrap gap-2">
              {commonPaths.map((path) => (
                <Button
                  key={path}
                  variant="outline"
                  size="sm"
                  onClick={() => setBookmarkPath(path)}
                  className="font-mono text-xs"
                >
                  {path}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source Data</CardTitle>
          </CardHeader>
          <CardContent>
            <RawJsonExplorer pageData={sourceData} />
          </CardContent>
        </Card>

        {/* Extracted Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            {traversalResult.success ? (
              <RawJsonExplorer pageData={traversalResult.data} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="font-medium">Extraction Failed</p>
                <p className="text-sm">{traversalResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 