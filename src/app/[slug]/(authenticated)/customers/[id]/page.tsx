"use client";

import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  GitMerge,
  Mail,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/modules/organization";
import { CustomerStats, MergeCustomerDialog } from "@/modules/customers";
import { EditCustomerDialog } from "@/modules/customers/components/EditCustomerDialog";
import {
  ACCOUNT_STATUS_LABELS,
  SOURCE_LABELS,
} from "@/modules/customers/lib/constants";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as Id<"customers">;
  const slug = params.slug as string;

  const { activeOrganization, currentRole } = useOrganization();
  const customer = useQuery(
    api.customers.get,
    activeOrganization
      ? { organizationId: activeOrganization._id, customerId }
      : "skip",
  );

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const isOwner = currentRole === "owner";

  if (customer === undefined) {
    return <CustomerDetailSkeleton />;
  }

  if (customer === null) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Customers
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="mb-4 size-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Customer not found</h3>
            <p className="text-sm text-muted-foreground">
              This customer may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${slug}/customers`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Customers
      </Link>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
              {getInitials(customer.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold truncate">
                  {customer.name}
                </h2>
                {customer.accountStatus && (
                  <Badge variant="secondary">
                    {ACCOUNT_STATUS_LABELS[customer.accountStatus] ??
                      customer.accountStatus}
                  </Badge>
                )}
                {customer.source && (
                  <Badge variant="outline">
                    {SOURCE_LABELS[customer.source] ?? customer.source}
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.preferredStaffName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="size-4" />
                    <span>Preferred: {customer.preferredStaffName}</span>
                  </div>
                )}
              </div>
              {customer.tags && customer.tags.length > 0 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMergeDialog(true)}
                >
                  <GitMerge className="mr-2 size-4" />
                  Merge
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <CustomerStats
        totalVisits={customer.totalVisits ?? 0}
        totalSpent={customer.totalSpent ?? 0}
        noShowCount={customer.noShowCount ?? 0}
        createdAt={customer.createdAt}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Notes */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Notes</CardTitle>
                <CardDescription>Notes visible to the customer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {customer.customerNotes || (
                    <span className="text-muted-foreground">No notes</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Staff Notes</CardTitle>
                <CardDescription>Internal notes for staff only</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {customer.staffNotes || (
                    <span className="text-muted-foreground">No notes</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="mb-4 size-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Appointment history will appear here after the booking engine is
                implemented.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {activeOrganization && (
        <EditCustomerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          customerId={showEditDialog ? customer._id : null}
          organizationId={activeOrganization._id}
        />
      )}

      {/* Merge Dialog */}
      {activeOrganization && (
        <MergeCustomerDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          primaryCustomerId={customerId}
          primaryCustomerName={customer.name}
          organizationId={activeOrganization._id}
        />
      )}
    </div>
  );
}
