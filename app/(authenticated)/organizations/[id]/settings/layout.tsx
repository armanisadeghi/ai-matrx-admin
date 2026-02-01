'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Menu, Building2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/features/organizations';
import { OrgSidebar } from '@/features/organizations/components/OrgSidebar';

export default function OrganizationSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params.id as string;
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { organization } = useOrganization(orgId);

  return (
    <div className="h-page w-full bg-textured overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="h-12 px-3 md:px-4 flex items-center gap-3">
          {/* Back Button */}
          <Link 
            href="/settings/organizations" 
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Back to Organizations"
          >
            <ArrowLeft size={18} />
          </Link>
          
          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h1 className="text-base font-semibold text-foreground truncate">
              {organization?.name || 'Organization Settings'}
            </h1>
          </div>
          
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Organizations</SheetTitle>
                </SheetHeader>
                <div className="mt-4" onClick={() => setMobileMenuOpen(false)}>
                  <OrgSidebar />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 w-full">
            <OrgSidebar />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
