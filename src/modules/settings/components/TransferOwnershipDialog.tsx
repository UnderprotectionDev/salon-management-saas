"use client";

import { useMutation } from "convex/react";
import { AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Member = {
  _id: Id<"member">;
  userId: string;
  role: "owner" | "admin" | "member";
  name?: string;
  email?: string;
};

type TransferOwnershipDialogProps = {
  organizationId: Id<"organization">;
  members: Member[];
};

export function TransferOwnershipDialog({
  organizationId,
  members,
}: TransferOwnershipDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const transferOwnership = useMutation(api.members.transferOwnership);

  const nonOwnerMembers = members.filter((m) => m.role !== "owner");

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setStep(1);
      setSelectedMemberId("");
    }
  };

  const handleTransfer = async () => {
    if (!selectedMemberId) return;
    setIsTransferring(true);
    try {
      await transferOwnership({
        organizationId,
        newOwnerId: selectedMemberId as Id<"member">,
      });
      toast.success("Ownership transferred successfully");
      handleOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to transfer ownership. Please try again.";
      toast.error(message);
      setStep(1);
      setSelectedMemberId("");
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedMember = nonOwnerMembers.find(
    (m) => m._id === selectedMemberId,
  );

  if (nonOwnerMembers.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="mr-2 size-4" />
          Transfer Ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Transfer organization ownership to another team member
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="space-y-4 py-4">
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {nonOwnerMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name || member.email || member.userId} (
                      {member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!selectedMemberId} onClick={() => setStep(2)}>
                Transfer Ownership
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  You are about to transfer ownership to{" "}
                  <strong>
                    {selectedMember?.name ||
                      selectedMember?.email ||
                      "this member"}
                  </strong>
                  . You will be demoted to Admin. This cannot be easily undone.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep(1)}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleTransfer}
                disabled={isTransferring}
              >
                {isTransferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
