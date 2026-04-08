"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Wand2, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createAgent } from "@/features/agents/redux/agent-definition/thunks";
import { toast } from "@/lib/toast-service";

interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function NewAgentForm({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const basePath = "/agents";
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const result = await dispatch(
        createAgent({ name: name.trim() }),
      ).unwrap();
      toast.success("Agent created!");
      onClose();
      startTransition(() => router.push(`${basePath}/${result}/build`));
    } catch (err) {
      console.error("Failed to create agent:", err);
      toast.error("Failed to create agent. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor="agent-name">Agent Name</Label>
        <Input
          id="agent-name"
          placeholder="My Agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
          style={{ fontSize: "16px" }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="w-full"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {isCreating ? "Creating..." : "Create Blank Agent"}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          disabled={isCreating}
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function NewAgentModal({ isOpen, onClose }: NewAgentModalProps) {
  const isMobile = useIsMobile();

  const title = "Create New Agent";
  const description =
    "Start building your AI agent. You can configure messages, tools, variables, and more in the editor.";

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <NewAgentForm onClose={onClose} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <NewAgentForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
