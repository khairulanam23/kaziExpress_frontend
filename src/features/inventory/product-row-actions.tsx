"use client";

import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import type { Product } from "@/types";

/**
 * Row/card action menu.
 *
 * Edit and Delete are gated on the permissions their endpoints enforce
 * (`PRODUCT_UPDATE` / `PRODUCT_DELETE`). They used to be offered to everyone:
 * the server still rejected the call, so nothing was ever exposed, but a
 * view-only user was shown two actions that could only ever fail.
 */
export function ProductRowActions({
  product,
  onView,
  onEdit,
  onDelete,
  className,
}: {
  product: Product;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  className?: string;
}) {
  const { has } = usePermissions();
  const canEdit = has(PERMISSIONS.PRODUCT_UPDATE);
  const canDelete = has(PERMISSIONS.PRODUCT_DELETE);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Actions for ${product.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(product)}>
          <Eye /> View details
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(product)}>
            <Pencil /> Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(product)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
