import React, { useState } from 'react';
import { MapPin, Loader2, Building2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import MarkdownStream from '@/components/markdown';

export default function SampleAppCode({ onExecute, response, isExecuting, isStreaming, error, rateLimitInfo }) {
  const [variables, setVariables] = useState({
    city_or_region: ''
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (variables.city_or_region.trim()) {
      await onExecute(variables);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isExecuting && !isStreaming && variables.city_or_region.trim()) {
      handleSubmit();
    }
  };

  const isFormValid = variables.city_or_region.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto px-6 pb-6 space-y-6">
      {/* Input Card */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Metropolitan Area Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Enter any U.S. city or region to discover its unique economic sectors, key characteristics, and geographic context
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="city">City or Region</Label>
              <Input
                id="city"
                value={variables.city_or_region}
                onChange={(e) => setVariables({ city_or_region: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Seattle, Bay Area, Austin, Research Triangle..."
                disabled={isExecuting || isStreaming}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to submit
              </p>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || isExecuting || isStreaming}
              className="w-full sm:w-auto"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Map className="w-4 h-4 mr-2" />
                  Analyze Metropolitan Area
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rate Limit Warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ Only {rateLimitInfo.remaining} free {rateLimitInfo.remaining === 1 ? 'analysis' : 'analyses'} remaining.
            <a href="/sign-up" className="underline ml-1 font-semibold hover:text-amber-900 dark:hover:text-amber-100">
              Sign up
            </a> for unlimited access.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="font-semibold text-destructive">{error.type}</p>
          <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        </div>
      )}

      {/* Results Card */}
      {response && (
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              Metropolitan Area Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-textured">
            <MarkdownStream content={response} />
            {isStreaming && (
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-muted-foreground">
                  Analyzing metropolitan area characteristics...
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}