"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Receipt,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ManagerPage() {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  const approvalsQuery = useQuery(
    trpc.approvals.list.queryOptions({
      status: "pending",
      limit: 50,
      offset: 0,
    })
  );

  const approveMutation = useMutation(
    trpc.approvals.approve.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["approvals", "list"]] });
        setSelectedApproval(null);
        setComments("");
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.approvals.reject.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["approvals", "list"]] });
        setSelectedApproval(null);
        setComments("");
      },
    })
  );

  if (approvalsQuery.isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
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

  if (approvalsQuery.isError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>Error loading approvals: {approvalsQuery.error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  const approvals = approvalsQuery.data || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve expense requests from your team
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
          <p className="text-muted-foreground">
            There are no pending approvals at this time.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map(({ approval, expense }) => {
            const isSelected = selectedApproval === approval.id;
            const isProcessing =
              approveMutation.isPending || rejectMutation.isPending;

            return (
              <Card
                key={approval.id}
                className={`p-6 transition-all ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex gap-6">
                  {/* Receipt Image */}
                  {expense.receipt && (
                    <div className="relative h-32 w-32 shrink-0 rounded-lg overflow-hidden border">
                      <Image
                        src={expense.receipt.fileUrl}
                        alt="Receipt"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Expense Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          {expense.merchant || "No merchant"}
                        </h3>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            parseFloat(expense.amount),
                            expense.currency
                          )}
                        </p>
                        <Badge className="mt-2">{expense.status}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Receipt className="h-4 w-4" />
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Requested {formatDate(approval.createdAt)}</span>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <Textarea
                          placeholder="Add comments (optional)"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              approveMutation.mutate({
                                id: approval.id,
                                comments: comments || undefined,
                              });
                            }}
                            disabled={isProcessing}
                            className="flex-1"
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (!comments.trim()) {
                                alert("Please provide a reason for rejection");
                                return;
                              }
                              rejectMutation.mutate({
                                id: approval.id,
                                comments,
                              });
                            }}
                            disabled={isProcessing || !comments.trim()}
                            className="flex-1"
                          >
                            {rejectMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isSelected && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1"
                        >
                          <Link href={`/expenses/${expense.id}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setSelectedApproval(approval.id)}
                          className="flex-1"
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
