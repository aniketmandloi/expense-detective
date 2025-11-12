"use client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  draft: { label: "Draft", icon: Clock, color: "text-gray-600" },
  submitted: { label: "Submitted", icon: Clock, color: "text-blue-600" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600" },
  flagged: { label: "Flagged", icon: Flag, color: "text-yellow-600" },
};

export default function Dashboard({
  customerState,
  session,
}: {
  customerState: ReturnType<typeof authClient.customer.state>;
  session: typeof authClient.$Infer.Session;
}) {
  const statsQuery = useQuery(trpc.dashboard.stats.queryOptions());
  const hasProSubscription = customerState?.activeSubscriptions?.length! > 0;

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <Card className="p-6">
        <p className="text-destructive">
          Error loading dashboard: {statsQuery.error.message}
        </p>
      </Card>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-muted-foreground text-base">
            Here's your expense overview
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/expenses/new">
            <Plus className="h-5 w-5" />
            New Expense
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Total Spent
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(stats.totalSpent, "USD")}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Pending
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(stats.pendingAmount, "USD")}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                This Month
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(stats.monthlySpending, "USD")}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Alerts
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {stats.openAlertsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(stats.expenseCounts).map(([status, count]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          return (
            <Card
              key={status}
              className="p-5 border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {config.label}
                  </p>
                  <p className="text-2xl font-semibold mt-1">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Expenses */}
      <Card className="border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Recent Expenses
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your latest expense submissions
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/expenses">View All</Link>
          </Button>
        </div>

        {stats.recentExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium mb-1">No expenses yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Get started by creating your first expense
            </p>
            <Button asChild>
              <Link href="/expenses/new">Create Your First Expense</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentExpenses.map((expense) => {
              const config =
                statusConfig[expense.status as keyof typeof statusConfig];
              const StatusIcon = config.icon;
              return (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base truncate">
                        {expense.merchant || "No merchant"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="font-semibold text-base">
                      {formatCurrency(
                        parseFloat(expense.amount),
                        expense.currency
                      )}
                    </p>
                    <Badge className="mt-1.5 text-xs">{config.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pending Approvals (for managers/admins) */}
      {stats.pendingApprovalsCount > 0 && (
        <Card className="p-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-base">
                  {stats.pendingApprovalsCount} Pending Approval
                  {stats.pendingApprovalsCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Review and approve expense requests
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/manager">Review</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Subscription Status (if applicable) */}
      {hasProSubscription && (
        <Card className="p-6 bg-primary/5 border-primary/20 dark:border-primary/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Pro Plan Active</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  You have access to all premium features
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => await authClient.customer.portal()}
            >
              Manage Subscription
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
