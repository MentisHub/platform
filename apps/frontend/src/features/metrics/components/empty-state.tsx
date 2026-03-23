"use client";

import { EmptyState as BaseEmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import Link from "next/link";

export function EmptyState({ projectId }: { projectId: string }) {
  return (
    <BaseEmptyState
      icon={Activity}
      title="No training runs yet"
      description="Start a training run to see live metrics"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${projectId}/runs`}>Go to Runs →</Link>
        </Button>
      }
    />
  );
}
