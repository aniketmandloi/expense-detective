"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Edit, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const severityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const actionColors = {
  flag: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  require_approval:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  auto_reject: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function PoliciesPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const policiesQuery = useQuery(trpc.policies.list.queryOptions());
  const deletePolicy = useMutation(
    trpc.policies.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["policies", "list"]] });
        setDeletingId(null);
      },
    })
  );

  if (policiesQuery.isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (policiesQuery.isError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading policies: {policiesQuery.error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  const policies = policiesQuery.data || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Expense Policies</h1>
          <p className="text-muted-foreground">
            Manage spending policies and rules for your organization
          </p>
        </div>
        <Button asChild>
          <Link href="/policies/new">
            <Plus className="mr-2 h-4 w-4" />
            New Policy
          </Link>
        </Button>
      </div>

      {policies.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No policies yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first policy to start enforcing spending rules
          </p>
          <Button asChild>
            <Link href="/policies/new">Create Policy</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => {
            let config: Record<string, unknown> = {};
            try {
              config = JSON.parse(policy.config);
            } catch {
              // Invalid JSON
            }

            return (
              <Card
                key={policy.id}
                className="p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {policy.name}
                    </h3>
                    {policy.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {policy.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={
                      severityColors[policy.severity] || severityColors.medium
                    }
                  >
                    {policy.severity}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">
                      {policy.policyType.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Action:</span>
                    <Badge
                      className={
                        actionColors[policy.action] || actionColors.flag
                      }
                    >
                      {policy.action.replace("_", " ")}
                    </Badge>
                  </div>
                  {policy.targetType !== "all" && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium capitalize">
                        {policy.targetType}
                        {policy.targetRole && ` - ${policy.targetRole}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/policies/${policy.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        confirm("Are you sure you want to delete this policy?")
                      ) {
                        setDeletingId(policy.id);
                        deletePolicy.mutate({ id: policy.id });
                      }
                    }}
                    disabled={deletingId === policy.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
