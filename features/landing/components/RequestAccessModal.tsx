'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertCircle, Loader2, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { submitInvitationRequestStep1, submitInvitationRequestStep2 } from '../actions';
import { InvitationRequestStep1, InvitationRequestStep2, USER_TYPE_OPTIONS } from '../types';
import { cn } from '@/lib/utils';

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestAccessModal({ open, onOpenChange }: RequestAccessModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Step 1 form data
  const [step1Data, setStep1Data] = useState<InvitationRequestStep1>({
    full_name: '',
    company: '',
    email: '',
    use_case: '',
    user_type: 'business_executive',
    user_type_other: '',
  });

  // Step 2 form data
  const [step2Data, setStep2Data] = useState<InvitationRequestStep2>({
    phone: '',
    biggest_obstacle: '',
    referral_source: '',
    current_ai_systems: '',
    recent_project: '',
  });

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitInvitationRequestStep1(step1Data);

      if (!result.success) {
        setError('error' in result ? result.error : 'Failed to submit request');
        setIsSubmitting(false);
        return;
      }

      setRequestId(result.data.requestId);
      setStep(2);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!requestId) {
      setError('Invalid request. Please start over.');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await submitInvitationRequestStep2(requestId, step2Data);

      if (!result.success) {
        setError('error' in result ? result.error : 'Failed to complete request');
        setIsSubmitting(false);
        return;
      }

      // Success!
      setShowSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkipStep2 = async () => {
    setIsSubmitting(true);
    setShowSuccess(true);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    // Reset form
    setStep(1);
    setStep1Data({
      full_name: '',
      company: '',
      email: '',
      use_case: '',
      user_type: 'business_executive',
      user_type_other: '',
    });
    setStep2Data({
      phone: '',
      biggest_obstacle: '',
      referral_source: '',
      current_ai_systems: '',
      recent_project: '',
    });
    setError(null);
    setRequestId(null);
    setShowSuccess(false);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-background border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 rounded-full bg-primary/10 p-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-semibold mb-2">Request Received!</DialogTitle>
            <DialogDescription className="text-muted-foreground mb-6 max-w-sm">
              Thank you for your interest in AI Matrx. We'll review your request and be in touch soon with your
              exclusive invitation.
            </DialogDescription>
            <Button onClick={handleClose} size="lg" className="bg-primary hover:bg-primary/90">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-background border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-2">
              <div
                className={cn(
                  'h-1.5 w-8 rounded-full transition-colors',
                  step === 1 ? 'bg-primary' : 'bg-primary/30'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-8 rounded-full transition-colors',
                  step === 2 ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
              />
            </div>
            <span className="text-xs text-muted-foreground">Step {step} of 2</span>
          </div>
          <DialogTitle className="text-2xl font-semibold">
            {step === 1 ? 'Request Early Access' : 'Tell Us More (Optional)'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1
              ? 'Join the future of enterprise AI. Share a few details to request your invitation.'
              : 'Help us understand your needs better. All fields are optional.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4 mt-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                value={step1Data.full_name}
                onChange={(e) => setStep1Data({ ...step1Data, full_name: e.target.value })}
                placeholder="John Smith"
                required
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">
                Company/Organization <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company"
                type="text"
                value={step1Data.company}
                onChange={(e) => setStep1Data({ ...step1Data, company: e.target.value })}
                placeholder="Acme Corporation"
                required
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={step1Data.email}
                onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
                placeholder="john@acme.com"
                required
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* User Type */}
            <div className="space-y-2">
              <Label htmlFor="user_type" className="text-sm font-medium">
                What best describes you? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={step1Data.user_type}
                onValueChange={(value) =>
                  setStep1Data({ ...step1Data, user_type: value as any, user_type_other: '' })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="user_type" className="text-base" style={{ fontSize: '16px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Other Specification */}
            {step1Data.user_type === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="user_type_other" className="text-sm font-medium">
                  Please specify <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user_type_other"
                  type="text"
                  value={step1Data.user_type_other}
                  onChange={(e) => setStep1Data({ ...step1Data, user_type_other: e.target.value })}
                  placeholder="Your role"
                  required={step1Data.user_type === 'other'}
                  disabled={isSubmitting}
                  className="text-base"
                  style={{ fontSize: '16px' }}
                />
              </div>
            )}

            {/* Use Case */}
            <div className="space-y-2">
              <Label htmlFor="use_case" className="text-sm font-medium">
                What will you build or accomplish with this system? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="use_case"
                value={step1Data.use_case}
                onChange={(e) => setStep1Data({ ...step1Data, use_case: e.target.value })}
                placeholder="Describe what you want to achieve..."
                required
                disabled={isSubmitting}
                rows={3}
                className="resize-none text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary hover:bg-primary/90">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-4 mt-4">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={step2Data.phone}
                onChange={(e) => setStep2Data({ ...step2Data, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Biggest Obstacle */}
            <div className="space-y-2">
              <Label htmlFor="biggest_obstacle" className="text-sm font-medium">
                What is your biggest current obstacle with AI?
              </Label>
              <Textarea
                id="biggest_obstacle"
                value={step2Data.biggest_obstacle}
                onChange={(e) => setStep2Data({ ...step2Data, biggest_obstacle: e.target.value })}
                placeholder="Tell us about the challenges you're facing..."
                disabled={isSubmitting}
                rows={2}
                className="resize-none text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Referral Source */}
            <div className="space-y-2">
              <Label htmlFor="referral_source" className="text-sm font-medium">
                How did you hear about AI Matrx?
              </Label>
              <Input
                id="referral_source"
                type="text"
                value={step2Data.referral_source}
                onChange={(e) => setStep2Data({ ...step2Data, referral_source: e.target.value })}
                placeholder="LinkedIn, Twitter, colleague, etc."
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Current AI Systems */}
            <div className="space-y-2">
              <Label htmlFor="current_ai_systems" className="text-sm font-medium">
                What other AI systems do you currently use?
              </Label>
              <Input
                id="current_ai_systems"
                type="text"
                value={step2Data.current_ai_systems}
                onChange={(e) => setStep2Data({ ...step2Data, current_ai_systems: e.target.value })}
                placeholder="ChatGPT, Claude, etc."
                disabled={isSubmitting}
                className="text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Recent Project */}
            <div className="space-y-2">
              <Label htmlFor="recent_project" className="text-sm font-medium">
                Tell us about a recent AI project or experiment
              </Label>
              <Textarea
                id="recent_project"
                value={step2Data.recent_project}
                onChange={(e) => setStep2Data({ ...step2Data, recent_project: e.target.value })}
                placeholder="Share your experience..."
                disabled={isSubmitting}
                rows={3}
                className="resize-none text-base"
                style={{ fontSize: '16px' }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleSkipStep2} disabled={isSubmitting}>
                Skip
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary hover:bg-primary/90">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

