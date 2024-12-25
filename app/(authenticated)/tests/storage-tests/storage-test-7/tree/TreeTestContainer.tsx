'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

export type TestMode = 'cli' | 'sql' | 'both';

type TreeTestContainerProps = {
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
  onSubmit: (mode: TestMode) => Promise<void>;
};

export default function TreeTestContainer({ 
  title, 
  children, 
  isLoading,
  onSubmit 
}: TreeTestContainerProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const mode = (formData.get('mode') as TestMode) || 'cli';
    await onSubmit(mode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            {children}
          </div>
          
          <div className="flex items-center justify-between">
            <RadioGroup defaultValue="cli" name="mode" className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cli" id="cli" />
                <Label htmlFor="cli">CLI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sql" id="sql" />
                <Label htmlFor="sql">SQL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>

            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Run Test'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}