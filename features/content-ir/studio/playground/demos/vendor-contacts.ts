import type { PlaygroundDemo } from "../types";

/** Web / mailto / tel links, dialog + popover + tooltip inside the box, motion. */
const source = String.raw`import React from "react";
import { Building2, Globe, Mail, Phone, Info, NotebookPen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function contactText(vendor) {
  return [vendor.name, vendor.website, vendor.email, vendor.phone].filter(Boolean).join("\n");
}

function VendorPanel({ vendor, index }) {
  const name = streamText(vendor.name, "Vendor");
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="h-full">
      <KindPanel
        title={name}
        icon={Building2}
        badge={streamText(vendor.category, "")}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Terms">
                <Info className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 text-xs">{streamText(vendor.terms, "No terms yet")}</PopoverContent>
          </Popover>
        }
        footer={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <NotebookPen className="h-3.5 w-3.5" /> Notes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{streamText(vendor.notes, "No notes")}</p>
            </DialogContent>
          </Dialog>
        }
      >
        <ul className="flex flex-col gap-1 text-sm">
          {vendor.website ? (
            <li className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                {vendor.website.replace("https://", "")}
              </a>
            </li>
          ) : null}
          {vendor.email ? (
            <li className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={"mailto:" + vendor.email} className="text-primary hover:underline break-all">{vendor.email}</a>
            </li>
          ) : null}
          {vendor.phone ? (
            <li className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={"tel:" + vendor.phone.replace(/[^+0-9]/g, "")} className="text-primary hover:underline">{vendor.phone}</a>
                  </TooltipTrigger>
                  <TooltipContent>{streamText(vendor.hours, "Hours unknown")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </li>
          ) : null}
        </ul>
      </KindPanel>
    </motion.div>
  );
}

export default function VendorContacts({ data }) {
  const { value: event, arrived } = useStreamingValue(data?.event, "");
  const vendors = streamList(data?.vendors).filter(Boolean);
  if (!arrived && vendors.length === 0) return <StreamingSkeleton layout="cards" rows={3} />;
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={event || "Vendors"}
        icon={Building2}
        stats={[{ label: "vendors", value: vendors.length }]}
        copy={{ label: "Vendor contacts", human: () => vendors.map(contactText).join("\n\n"), json: () => data }}
      />
      <KindPanelGrid minColumnWidth={260} gap="sm">
        <AnimatePresence>
          {vendors.map((vendor, index) => (
            <VendorPanel key={vendor.name ?? index} vendor={vendor} index={index} />
          ))}
        </AnimatePresence>
      </KindPanelGrid>
    </div>
  );
}
`;

export const VENDOR_CONTACTS_DEMO: PlaygroundDemo = {
  slug: "playground_vendor_contacts",
  title: "Vendor contacts",
  covers: ["Web link", "mailto", "tel", "Dialog", "Popover", "Tooltip", "motion"],
  source,
  sample: {
    event: "Oakridge Library fundraiser gala",
    vendors: [
      {
        name: "Copper Pot Catering",
        category: "Food",
        website: "https://www.copperpotcatering.com",
        email: "events@copperpotcatering.com",
        phone: "+1 (503) 555-0142",
        hours: "Mon to Fri, 9 to 5",
        terms: "30% deposit, final headcount 10 days out.",
        notes: "Vegetarian option for 40 guests; no nuts in desserts.",
      },
      {
        name: "Lantern Hall",
        category: "Venue",
        website: "https://lanternhall.org",
        email: "bookings@lanternhall.org",
        phone: "+1 (503) 555-0187",
        hours: "Daily, 10 to 6",
        terms: "Load-in from 2 pm; music ends at 10:30 pm.",
        notes: "Ask about the stage riser and the coat check.",
      },
      {
        name: "Brightline AV",
        category: "Sound",
        website: "https://brightlineav.com",
        email: "crew@brightlineav.com",
        phone: "+1 (971) 555-0110",
        hours: "Weekdays, 8 to 4",
        terms: "Two wireless mics included.",
        notes: "Needs a 20 amp circuit near the stage.",
      },
    ],
  },
};
