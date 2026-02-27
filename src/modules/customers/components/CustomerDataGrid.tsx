"use client";

import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Edit2, GitMerge, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ACCOUNT_STATUS_LABELS } from "../lib/constants";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { EditCustomerDialog } from "./EditCustomerDialog";
import { MergeCustomerDialog } from "./MergeCustomerDialog";

type CustomerItem = {
  _id: Id<"customers">;
  _creationTime: number;
  name: string;
  email?: string;
  phone: string;
  accountStatus?: string;
  totalVisits?: number;
  totalSpent?: number;
  lastVisitDate?: string;
  noShowCount?: number;
  tags?: string[];
  source?: string;
  createdAt: number;
};

type CustomerDataGridProps = {
  customers: CustomerItem[];
  organizationId: Id<"organization">;
  isOwner: boolean;
};

function getStatusBadgeVariant(
  status?: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "registered":
      return "default";
    case "recognized":
    case "prompted":
      return "secondary";
    default:
      return "outline";
  }
}

export function CustomerDataGrid({
  customers,
  organizationId,
  isOwner,
}: CustomerDataGridProps) {
  const { slug } = useParams();
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [editTargetId, setEditTargetId] = useState<Id<"customers"> | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"customers">;
    name: string;
  } | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{
    id: Id<"customers">;
    name: string;
  } | null>(null);

  const columns: ColumnDef<CustomerItem>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div>
            <Link
              href={`/${slug}/customers/${customer._id}`}
              className="font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.name}
            </Link>
            {customer.tags && customer.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {customer.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {customer.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{customer.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
      meta: {
        headerTitle: "Name",
        skeleton: <Skeleton className="h-4 w-32" />,
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
      enableSorting: false,
      meta: {
        headerTitle: "Phone",
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        skeleton: <Skeleton className="h-4 w-28" />,
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.email || (
            <span className="text-muted-foreground">-</span>
          )}
        </span>
      ),
      enableSorting: false,
      meta: {
        headerTitle: "Email",
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
        skeleton: <Skeleton className="h-4 w-36" />,
      },
    },
    {
      accessorKey: "totalVisits",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Visits" />
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.totalVisits ?? 0}
        </span>
      ),
      meta: {
        headerTitle: "Visits",
        skeleton: <Skeleton className="h-4 w-8" />,
      },
    },
    {
      accessorKey: "totalSpent",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Spent" />
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatPrice(row.original.totalSpent ?? 0)}
        </span>
      ),
      meta: {
        headerTitle: "Spent",
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        skeleton: <Skeleton className="h-4 w-16" />,
      },
    },
    {
      accessorKey: "lastVisitDate",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Last Visit" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.lastVisitDate || (
            <span className="text-muted-foreground">-</span>
          )}
        </span>
      ),
      meta: {
        headerTitle: "Last Visit",
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
        skeleton: <Skeleton className="h-4 w-20" />,
      },
    },
    {
      accessorKey: "accountStatus",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.accountStatus;
        if (!status) return null;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {ACCOUNT_STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
      enableSorting: false,
      meta: {
        headerTitle: "Status",
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
        skeleton: <Skeleton className="h-5 w-16" />,
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditTargetId(customer._id)}>
                  <Edit2 className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        setMergeTarget({
                          id: customer._id,
                          name: customer.name,
                        })
                      }
                    >
                      <GitMerge className="mr-2 size-4" />
                      Merge
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setDeleteTarget({
                          id: customer._id,
                          name: customer.name,
                        })
                      }
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      size: 48,
      meta: {
        skeleton: <Skeleton className="size-8 rounded-md" />,
      },
    },
  ];

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: customers,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={customers.length}
          onRowClick={(row) => router.push(`/${slug}/customers/${row._id}`)}
          tableLayout={{
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} className="px-4 py-2.5" />
        </DataGrid>
      </DataGridContainer>

      <EditCustomerDialog
        open={!!editTargetId}
        onOpenChange={(open) => !open && setEditTargetId(null)}
        customerId={editTargetId}
        organizationId={organizationId}
      />

      <DeleteCustomerDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        customerId={deleteTarget?.id ?? null}
        customerName={deleteTarget?.name ?? ""}
        organizationId={organizationId}
      />

      <MergeCustomerDialog
        open={!!mergeTarget}
        onOpenChange={(open) => !open && setMergeTarget(null)}
        primaryCustomerId={mergeTarget?.id ?? null}
        primaryCustomerName={mergeTarget?.name ?? ""}
        organizationId={organizationId}
      />
    </>
  );
}
