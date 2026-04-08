"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HierarchyTree,
  HierarchyCascade,
  HierarchyBreadcrumb,
  HierarchyCommand,
  HierarchyPills,
  EMPTY_SELECTION,
} from "@/features/context/components/hierarchy-selection";
import type { HierarchySelection } from "@/features/context/components/hierarchy-selection";

function SelectionDebug({
  label,
  value,
}: {
  label: string;
  value: HierarchySelection;
}) {
  return (
    <div className="mt-2 p-2 bg-muted/30 rounded-md border border-border/50">
      <p className="text-[9px] font-mono text-muted-foreground mb-1">
        {label} state:
      </p>
      <div className="flex flex-wrap gap-1">
        {value.organizationName && (
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            org: {value.organizationName}
          </Badge>
        )}
        {value.projectName && (
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            proj: {value.projectName}
          </Badge>
        )}
        {value.taskName && (
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            task: {value.taskName}
          </Badge>
        )}
        {!value.organizationId && !value.projectId && !value.taskId && (
          <span className="text-[9px] text-muted-foreground italic">
            nothing selected
          </span>
        )}
      </div>
    </div>
  );
}

export default function HierarchySelectionDemoPage() {
  const [treeVal, setTreeVal] = useState<HierarchySelection>(EMPTY_SELECTION);
  const [cascadeHVal, setCascadeHVal] =
    useState<HierarchySelection>(EMPTY_SELECTION);
  const [cascadeVVal, setCascadeVVal] =
    useState<HierarchySelection>(EMPTY_SELECTION);
  const [breadcrumbVal, setBreadcrumbVal] =
    useState<HierarchySelection>(EMPTY_SELECTION);
  const [commandVal, setCommandVal] =
    useState<HierarchySelection>(EMPTY_SELECTION);
  const [pillsVal, setPillsVal] = useState<HierarchySelection>(EMPTY_SELECTION);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Hierarchy Selection System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5 variants of the same standardized org/project/task selector. All
          share the same data hook and type system.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Tree */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyTree
              <Badge variant="secondary" className="text-[9px] h-4">
                sidebar / explorer
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Expandable tree with search. Best for full-page sidebars and admin
              views.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] border border-border rounded-lg overflow-hidden">
              <HierarchyTree
                levels={["organization", "project", "task"]}
                value={treeVal}
                onChange={setTreeVal}
              />
            </div>
            <SelectionDebug label="Tree" value={treeVal} />
          </CardContent>
        </Card>

        {/* 2. Cascade (Horizontal) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyCascade
              <Badge variant="secondary" className="text-[9px] h-4">
                horizontal dropdowns
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Cascading dependent dropdowns. Best for top-of-page context bars.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border border-border rounded-lg bg-card">
              <HierarchyCascade
                levels={["organization", "project"]}
                value={cascadeHVal}
                onChange={setCascadeHVal}
                layout="horizontal"
              />
            </div>
            <SelectionDebug label="Cascade (H)" value={cascadeHVal} />
          </CardContent>
        </Card>

        {/* 3. Cascade (Vertical) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyCascade (vertical)
              <Badge variant="secondary" className="text-[9px] h-4">
                stacked dropdowns
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Same as cascade but stacked. Best for narrow sidebars and settings
              panels.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border border-border rounded-lg bg-card w-64">
              <HierarchyCascade
                levels={["organization", "project", "task"]}
                value={cascadeVVal}
                onChange={setCascadeVVal}
                layout="vertical"
              />
            </div>
            <SelectionDebug label="Cascade (V)" value={cascadeVVal} />
          </CardContent>
        </Card>

        {/* 4. Breadcrumb */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyBreadcrumb
              <Badge variant="secondary" className="text-[9px] h-4">
                breadcrumb trail
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Shows current path as clickable breadcrumbs. Best for displaying
              current scope in headers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border border-border rounded-lg bg-card">
              <HierarchyBreadcrumb
                levels={["organization", "project", "task"]}
                value={breadcrumbVal}
                onChange={setBreadcrumbVal}
              />
            </div>
            <p className="text-[9px] text-muted-foreground italic">
              Use alongside another variant (e.g. Tree or Command) to set
              context — breadcrumb is display + navigation.
            </p>
            <div className="p-3 border border-border rounded-lg bg-card w-64">
              <HierarchyCascade
                levels={["organization", "project", "task"]}
                value={breadcrumbVal}
                onChange={setBreadcrumbVal}
                layout="vertical"
                showSeparators={false}
              />
            </div>
            <SelectionDebug label="Breadcrumb" value={breadcrumbVal} />
          </CardContent>
        </Card>

        {/* 5. Command Palette */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyCommand
              <Badge variant="secondary" className="text-[9px] h-4">
                command palette
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Searchable popover with command palette UX. Best for compact forms
              and inline selection.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border border-border rounded-lg bg-card">
              <HierarchyCommand
                levels={["organization", "project", "task"]}
                value={commandVal}
                onChange={setCommandVal}
              />
            </div>
            <SelectionDebug label="Command" value={commandVal} />
          </CardContent>
        </Card>

        {/* 6. Pills */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              HierarchyPills
              <Badge variant="secondary" className="text-[9px] h-4">
                filter pills
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Compact pill filters with dropdown menus. Best for list pages,
              tables, and filter bars.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border border-border rounded-lg bg-card">
              <HierarchyPills
                levels={["organization", "project"]}
                value={pillsVal}
                onChange={setPillsVal}
              />
            </div>
            <div className="p-3 border border-border rounded-lg bg-card">
              <HierarchyPills
                levels={["organization", "project", "task"]}
                value={pillsVal}
                onChange={setPillsVal}
                size="md"
              />
            </div>
            <SelectionDebug label="Pills" value={pillsVal} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
