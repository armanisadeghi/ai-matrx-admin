'use client';

import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy load modals for better initial page load
const InvitationCodeModal = dynamic(
  () => import('./InvitationCodeModal').then((mod) => ({ default: mod.InvitationCodeModal })),
  { ssr: false }
);

const RequestAccessModal = dynamic(
  () => import('./RequestAccessModal').then((mod) => ({ default: mod.RequestAccessModal })),
  { ssr: false }
);

export function LandingCTAs() {
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setInvitationModalOpen(true)}
        size="lg"
        className="w-full sm:w-auto text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        Enter Invitation Code
      </Button>
      
      <Button
        onClick={() => setRequestModalOpen(true)}
        data-request-access
        size="lg"
        variant="outline"
        className="w-full sm:w-auto text-base border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
      >
        Request Access
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      <Suspense fallback={null}>
        <InvitationCodeModal open={invitationModalOpen} onOpenChange={setInvitationModalOpen} />
      </Suspense>
      
      <Suspense fallback={null}>
        <RequestAccessModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
      </Suspense>
    </>
  );
}

