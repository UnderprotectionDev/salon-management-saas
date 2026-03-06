"use client";

import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  Edit2,
  GitMerge,
  Mail,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
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
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/status-colors";
import {
  CustomerStats,
  DeleteCustomerDialog,
  EditCustomerDialog,
  MergeCustomerDialog,
} from "@/modules/customers";
import { CustomerDetailSkeleton } from "@/modules/customers/components/skeletons/CustomerDetailSkeleton";
import { AppointmentHistoryListSkeleton } from "@/modules/customers/components/skeletons/AppointmentHistoryListSkeleton";
import {
  ACCOUNT_STATUS_LABELS,
  SOURCE_LABELS,
} from "@/modules/customers/lib/constants";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/lib/currency";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

type AppointmentRow = {
  _id: Id<"appointments">;
  date: string;
  startTime: number;
  endTime: number;
  status: string;
  staffName: string;
  total: number;
  services: { serviceName: string; duration: number; price: number }[];
};

const appointmentColumns: ColumnDef<AppointmentRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.date}</span>
    ),
    meta: {
      headerTitle: "Date",
      skeleton: <Skeleton className="h-4 w-20" />,
    },
  },
  {
    id: "time",
    header: () => (
      <span className="text-secondary-foreground/80 text-[0.8125rem]">
        Time
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatTime(row.original.startTime)} -{" "}
        {formatTime(row.original.endTime)}
      </span>
    ),
    enableSorting: false,
    meta: {
      headerTitle: "Time",
      skeleton: <Skeleton className="h-4 w-24" />,
    },
  },
  {
    id: "services",
    header: () => (
      <span className="text-secondary-foreground/80 text-[0.8125rem]">
        Services
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.services.length > 0
          ? row.original.services.map((s) => s.serviceName).join(", ")
          : "No services"}
      </span>
    ),
    enableSorting: false,
    meta: {
      headerTitle: "Services",
      headerClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
      skeleton: <Skeleton className="h-4 w-32" />,
    },
  },
  {
    accessorKey: "staffName",
    header: () => (
      <span className="text-secondary-foreground/80 text-[0.8125rem]">
        Staff
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.staffName}</span>
    ),
    enableSorting: false,
    meta: {
      headerTitle: "Staff",
      headerClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
      skeleton: <Skeleton className="h-4 w-24" />,
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status as AppointmentStatus;
      return (
        <Badge
          variant="secondary"
          className={APPOINTMENT_STATUS_BADGE_CLASSES[status] ?? ""}
        >
          {APPOINTMENT_STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
    meta: {
      headerTitle: "Status",
      skeleton: <Skeleton className="h-5 w-20" />,
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => (
      <span className="text-sm font-medium tabular-nums">
        {formatPrice(row.original.total)}
      </span>
    ),
    meta: {
      headerTitle: "Total",
      skeleton: <Skeleton className="h-4 w-16" />,
    },
  },
];

function AppointmentHistory({
  customerId,
  organizationId,
}: {
  customerId: Id<"customers">;
  organizationId: Id<"organization">;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const appointments = useQuery(api.appointments.getByCustomer, {
    organizationId,
    customerId,
    limit: 200,
  });

  const table = useReactTable({
    data: appointments ?? [],
    columns: appointmentColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (appointments === undefined) {
    return <AppointmentHistoryListSkeleton />;
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarDays className="mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No appointments yet</h3>
          <p className="text-sm text-muted-foreground">
            This customer hasn&apos;t had any appointments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Appointment History</h3>
        <span className="text-sm text-muted-foreground">
          {appointments.length >= 200
            ? "200+ appointments"
            : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={appointments.length}
          tableLayout={{
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25]} className="px-4 py-2.5" />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold">
              {getInitials(customer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold truncate">
                  {customer.name}
                </h1>
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit2 className="mr-2 size-4" />
                Edit
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMergeDialog(true)}
                  >
                    <GitMerge className="mr-2 size-4" />
                    Merge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <CustomerStats
        totalVisits={customer.totalVisits ?? 0}
        totalSpent={customer.totalSpent ?? 0}
        noShowCount={customer.noShowCount ?? 0}
        createdAt={customer.createdAt}
      />

      {/* Overview Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Notes</CardTitle>
            <CardDescription>Notes visible to the customer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
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
            <p className="whitespace-pre-wrap text-sm">
              {customer.staffNotes || (
                <span className="text-muted-foreground">No notes</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      {activeOrganization && (
        <AppointmentHistory
          customerId={customerId}
          organizationId={activeOrganization._id}
        />
      )}

      {/* Dialogs */}
      {activeOrganization && (
        <>
          <EditCustomerDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            customerId={showEditDialog ? customer._id : null}
            organizationId={activeOrganization._id}
          />

          <MergeCustomerDialog
            open={showMergeDialog}
            onOpenChange={setShowMergeDialog}
            primaryCustomerId={customerId}
            primaryCustomerName={customer.name}
            organizationId={activeOrganization._id}
          />

          <DeleteCustomerDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            customerId={showDeleteDialog ? customer._id : null}
            customerName={customer.name}
            organizationId={activeOrganization._id}
          />
        </>
      )}
    </div>
  );
}
