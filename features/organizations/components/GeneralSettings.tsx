'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateOrganization, validateOrgName, type Organization, type OrgRole } from '@/features/organizations';
import { format } from 'date-fns';

interface GeneralSettingsProps {
  organization: Organization;
  canEdit: boolean;
  userRole: OrgRole;
}

/**
 * GeneralSettings - Tab for editing general organization details
 * 
 * Features:
 * - Edit name, description, website, logo
 * - View-only mode for members
 * - Form validation
 * - Save/cancel functionality
 * - Loading states
 */
export function GeneralSettings({ organization, canEdit, userRole }: GeneralSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description || '');
  const [website, setWebsite] = useState(organization.website || '');
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');

  // Reset form when organization changes
  useEffect(() => {
    setName(organization.name);
    setDescription(organization.description || '');
    setWebsite(organization.website || '');
    setLogoUrl(organization.logoUrl || '');
    setIsEditing(false);
  }, [organization]);

  // Check if form has changes
  const hasChanges = 
    name !== organization.name ||
    description !== (organization.description || '') ||
    website !== (organization.website || '') ||
    logoUrl !== (organization.logoUrl || '');

  // Validation
  const nameValidation = name ? validateOrgName(name) : { valid: false, error: 'Name is required' };
  const isFormValid = nameValidation.valid;

  // Handle save
  const handleSave = async () => {
    if (!isFormValid) {
      toast.error('Please fix validation errors');
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateOrganization(organization.id, {
        name,
        description,
        website: website || undefined,
        logoUrl: logoUrl || undefined,
      });

      if (result.success) {
        toast.success('Organization updated successfully');
        setIsEditing(false);
        // The organization prop will be updated by parent refresh
      } else {
        toast.error(result.error || 'Failed to update organization');
      }
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setName(organization.name);
    setDescription(organization.description || '');
    setWebsite(organization.website || '');
    setLogoUrl(organization.logoUrl || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">General Information</h3>
          <p className="text-sm text-muted-foreground">
            Basic details about your organization
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || !isFormValid || isSaving}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name *</Label>
          {isEditing ? (
            <>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
                maxLength={50}
                disabled={isSaving}
                className={!nameValidation.valid ? 'border-red-500' : ''}
              />
              {!nameValidation.valid && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {nameValidation.error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters
              </p>
            </>
          ) : (
            <p className="text-sm font-medium">{organization.name}</p>
          )}
        </div>

        {/* Slug (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">aimatrx.com/org/</span>
            <span className="text-sm font-medium">{organization.slug}</span>
            <Badge variant="secondary" className="text-xs">Read-only</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            The slug cannot be changed after creation
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          {isEditing ? (
            <>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your organization do?"
                rows={4}
                maxLength={500}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </>
          ) : (
            <p className="text-sm">
              {organization.description || <span className="text-muted-foreground italic">No description provided</span>}
            </p>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          {isEditing ? (
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              disabled={isSaving}
            />
          ) : (
            <p className="text-sm">
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {organization.website}
                </a>
              ) : (
                <span className="text-muted-foreground italic">No website provided</span>
              )}
            </p>
          )}
        </div>

        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          {isEditing ? (
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={isSaving}
            />
          ) : (
            <div className="flex items-center gap-4">
              {organization.logoUrl ? (
                <>
                  <img
                    src={organization.logoUrl}
                    alt={organization.name}
                    className="w-16 h-16 rounded-lg object-cover border"
                  />
                  <a
                    href={organization.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View logo
                  </a>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">No logo provided</span>
              )}
            </div>
          )}
        </div>

        {/* Metadata (Read-only) */}
        <div className="pt-6 border-t space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Metadata
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="text-sm">
                {organization.createdAt ? format(new Date(organization.createdAt), 'PPP') : 'Unknown'}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Last Updated</Label>
              <p className="text-sm">
                {organization.updatedAt ? format(new Date(organization.updatedAt), 'PPP') : 'Unknown'}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Organization Type</Label>
              <p className="text-sm">
                {organization.isPersonal ? (
                  <Badge variant="secondary">Personal</Badge>
                ) : (
                  <Badge variant="secondary">Team</Badge>
                )}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Your Role</Label>
              <p className="text-sm">
                <Badge>{userRole}</Badge>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

