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
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/status-colors";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function getInitials(name: string): string {
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

export function AppointmentHistory({
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
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
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
