"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type CustomerProfile = {
  _id: Id<"customers">;
  name: string;
  phone: string;
  email?: string;
  organizationId: Id<"organization">;
  organizationName: string;
  organizationSlug: string;
  totalVisits: number;
  totalSpent: number;
  createdAt: number;
};

export function ProfileCard({ profile }: { profile: CustomerProfile }) {
  const updateMyProfile = useMutation(api.customerAuth.updateMyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateMyProfile({
        customerId: profile._id,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string })?.message ??
              "An error occurred")
          : "Unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email ?? "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {profile.organizationName}
            </CardTitle>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary">
              {profile.totalVisits} visit{profile.totalVisits !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {formatPrice(profile.totalSpent)} spent
            </Badge>
            <span className="text-xs">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{profile.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{profile.email || "Not set"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
