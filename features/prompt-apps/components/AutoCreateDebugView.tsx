'use client';

import { useAppSelector } from '@/lib/redux/hooks';
import { selectPrimaryResponseTextByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MarkdownStream from '@/components/MarkdownStream';

interface AutoCreateDebugViewProps {
  codeTaskId: string | null;
  metadataTaskId: string | null;
  progress: string;
}

export function AutoCreateDebugView({ codeTaskId, metadataTaskId, progress }: AutoCreateDebugViewProps) {
  const codeResponse = useAppSelector((state) => 
    codeTaskId ? selectPrimaryResponseTextByTaskId(codeTaskId)(state) : ''
  );
  
  const metadataResponse = useAppSelector((state) => 
    metadataTaskId ? selectPrimaryResponseTextByTaskId(metadataTaskId)(state) : ''
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="text-center space-y-2 py-4">
        <h3 className="text-xl font-semibold">Creating Your App (Debug Mode)</h3>
        <p className="text-sm text-muted-foreground">{progress}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Code Generation</span>
              <Badge variant={codeResponse.length > 0 ? 'default' : 'secondary'}>
                {codeResponse.length} chars
              </Badge>
            </CardTitle>
            <div className="text-xs text-muted-foreground font-mono">
              Task: {codeTaskId || 'Not started'}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            {codeResponse ? (
              <MarkdownStream content={codeResponse} />
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for response...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Metadata Generation</span>
              <Badge variant={metadataResponse.length > 0 ? 'default' : 'secondary'}>
                {metadataResponse.length} chars
              </Badge>
            </CardTitle>
            <div className="text-xs text-muted-foreground font-mono">
              Task: {metadataTaskId || 'Not started'}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            {metadataResponse ? (
              <MarkdownStream content={metadataResponse} />
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for response...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

