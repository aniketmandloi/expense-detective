"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Filter, X, Search } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  flagged:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function ExpensesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const expensesQuery = useQuery(
    trpc.expenses.list.queryOptions({
      status: statusFilter as
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "flagged"
        | undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 50,
      offset: 0,
    })
  );

  const expenses = expensesQuery.data || [];

  // Filter expenses by search query (client-side for now)
  const filteredExpenses = searchQuery
    ? expenses.filter(
        (expense) =>
          expense.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : expenses;

  const activeFiltersCount =
    (statusFilter ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter(undefined);
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto py-8 px-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground text-base">
              Manage and track your expense submissions
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/expenses/new">
              <Plus className="h-5 w-5" />
              New Expense
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by merchant or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid gap-6 md:grid-cols-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={statusFilter || ""}
                    onChange={(e) =>
                      setStatusFilter(e.target.value || undefined)
                    }
                    className="w-full h-11 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Expenses List */}
        {expensesQuery.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card
                key={i}
                className="p-6 border-gray-200 dark:border-gray-800"
              >
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : expensesQuery.isError ? (
          <Card className="p-6 border-gray-200 dark:border-gray-800">
            <p className="text-destructive font-medium">
              Error loading expenses: {expensesQuery.error.message}
            </p>
          </Card>
        ) : filteredExpenses.length === 0 ? (
          <Card className="p-12 text-center border-gray-200 dark:border-gray-800">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery || activeFiltersCount > 0
                ? "No expenses match your filters"
                : "No expenses yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || activeFiltersCount > 0
                ? "Try adjusting your search or filters"
                : "Get started by creating your first expense"}
            </p>
            {searchQuery || activeFiltersCount > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/expenses/new">Create Expense</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <Card
                key={expense.id}
                className="p-6 border-gray-200 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer group"
              >
                <Link href={`/expenses/${expense.id}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                        <Receipt className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg truncate">
                            {expense.merchant || "No merchant"}
                          </h3>
                          <Badge
                            className={
                              statusColors[expense.status] || statusColors.draft
                            }
                          >
                            {expense.status}
                          </Badge>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {expense.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-medium text-base text-foreground">
                            {formatCurrency(
                              parseFloat(expense.amount),
                              expense.currency
                            )}
                          </span>
                          <span>•</span>
                          <span>{formatDate(expense.expenseDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
