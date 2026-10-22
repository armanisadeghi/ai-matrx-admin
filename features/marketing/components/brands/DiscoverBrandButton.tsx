"use client";

import { Telescope } from "lucide-react";

import { DropdownMenuItem } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { useDiscoverBrand } from "@/features/marketing/components/brands/useDiscoverBrand";

interface Props {
  brandId: string;
  organizationId: string;
}

/** Discover on the brand header (wider screens): starts or rejoins the brand_discovery run. */
export function DiscoverBrandButton({ brandId, organizationId }: Props) {
  const { discover, starting } = useDiscoverBrand(brandId, organizationId);
  return (
    <Button
      variant="outline"
      icon={<Telescope />}
      disabled={starting}
      onClick={() => void discover()}
      title="Read what the brand says about itself and propose candidates"
      data-testid="brand-discover"
    >
      Discover
    </Button>
  );
}

/** The same action in the phone overflow menu. */
export function DiscoverBrandMenuItem({ brandId, organizationId }: Props) {
  const { discover, starting } = useDiscoverBrand(brandId, organizationId);
  return (
    <DropdownMenuItem disabled={starting} onSelect={() => void discover()}>
      <Telescope />
      Discover
    </DropdownMenuItem>
  );
}
