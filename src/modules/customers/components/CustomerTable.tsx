"use client";

import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatPrice } from "@/modules/services/lib/currency";
import { ACCOUNT_STATUS_LABELS, SOURCE_LABELS } from "../lib/constants";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { EditCustomerDialog } from "./EditCustomerDialog";

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

type CustomerTableProps = {
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

export function CustomerTable({
  customers,
  organizationId,
  isOwner,
}: CustomerTableProps) {
  const { slug } = useParams();

  const [editTargetId, setEditTargetId] = useState<Id<"customers"> | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"customers">;
    name: string;
  } | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Phone</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead className="hidden sm:table-cell">Spent</TableHead>
            <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            {isOwner && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id}>
              <TableCell>
                <Link
                  href={`/${slug}/customers/${customer._id}`}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
                {customer.tags && customer.tags.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
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
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                {customer.phone}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {customer.email || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {customer.totalVisits ?? 0}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                {formatPrice(customer.totalSpent ?? 0)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {customer.lastVisitDate || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {customer.accountStatus && (
                  <Badge
                    variant={getStatusBadgeVariant(customer.accountStatus)}
                  >
                    {ACCOUNT_STATUS_LABELS[customer.accountStatus] ??
                      customer.accountStatus}
                  </Badge>
                )}
              </TableCell>
              {isOwner && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditTargetId(customer._id)}
                      >
                        <Edit2 className="mr-2 size-4" />
                        Edit
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <EditCustomerDialog
        open={!!editTargetId}
        onOpenChange={(open) => !open && setEditTargetId(null)}
        customerId={editTargetId}
        organizationId={organizationId}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        customerId={deleteTarget?.id ?? null}
        customerName={deleteTarget?.name ?? ""}
        organizationId={organizationId}
      />
    </>
  );
}
