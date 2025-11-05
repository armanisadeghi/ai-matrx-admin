'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LayoutTestsPage() {
  return (
    <div className="h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-2.5rem)] flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Mobile Layout Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/layout-tests/no-scroll" className="block">
            <Button className="w-full" size="lg">
              Test 1: No Scroll Page
            </Button>
          </Link>
          
          <Link href="/layout-tests/fixed-input" className="block">
            <Button className="w-full" size="lg">
              Test 2: Fixed Bottom Input
            </Button>
          </Link>
          
          <Link href="/layout-tests/prompt-input" className="block">
            <Button className="w-full" size="lg" variant="default">
              Test 3: Real PromptInput Component
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
