import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArtistTable } from "./ArtistTable";

interface ArtistManagementDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ArtistManagementDialog = ({
  jobId,
  open,
  onOpenChange,
}: ArtistManagementDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Manage Festival Artists</DialogTitle>
        </DialogHeader>
        <ArtistTable jobId={jobId} />
      </DialogContent>
    </Dialog>
  );
};