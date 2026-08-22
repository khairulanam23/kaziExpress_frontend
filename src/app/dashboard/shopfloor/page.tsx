"use client";

import * as React from "react";
import Link from "next/link";
import { List } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { ShopfloorBoard } from "@/features/operations/shopfloor-board";
import { TaskDetailDrawer } from "@/features/operations/task-detail-drawer";

/**
 * Shopfloor: the production pipeline as a board, tuned for people working on
 * the floor — large tap targets, image-led cards, and the accept/start/report
 * actions available without opening anything.
 */
export default function ShopfloorPage() {
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Shopfloor"
        description="Every production task on one board, from pending through to completed."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/operations">
              <List className="size-4" />
              Table view
            </Link>
          </Button>
        }
      />

      <ShopfloorBoard onOpenTask={setOpenTaskId} />

      <TaskDetailDrawer
        taskId={openTaskId}
        open={!!openTaskId}
        onOpenChange={(open) => !open && setOpenTaskId(null)}
      />
    </div>
  );
}
