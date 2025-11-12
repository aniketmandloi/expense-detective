"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(
    formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const reportQuery = useQuery(
    trpc.reports.generate.queryOptions({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format: "json",
    })
  );

  const summaryQuery = useQuery(
    trpc.reports.summary.queryOptions({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })
  );

  const handleExportCSV = async () => {
    try {
      const csvData = await trpc.reports.generate.query({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        format: "csv",
      });

      if (csvData.format === "csv" && csvData.content) {
        const blob = new Blob([csvData.content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expense-report-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export report");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Expense Reports</h1>
          <p className="text-muted-foreground">
            Generate and export expense reports for your organization
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-6 mb-6">
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleExportCSV} className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : summaryQuery.data ? (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold mt-1">
                  {Object.values(summaryQuery.data.byStatus).reduce(
                    (sum, s) => sum + s.count,
                    0
                  )}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(
                    Object.values(summaryQuery.data.byStatus).reduce(
                      (sum, s) => sum + s.total,
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <p className="text-2xl font-bold mt-1">
                  {summaryQuery.data.byStatus.approved?.count || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold mt-1">
                  {(summaryQuery.data.byStatus.submitted?.count || 0) +
                    (summaryQuery.data.byStatus.flagged?.count || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
        </div>
      ) : null}

      {/* Report Details */}
      {reportQuery.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : reportQuery.isError ? (
        <Card className="p-6">
          <p className="text-destructive">
            Error loading report: {reportQuery.error.message}
          </p>
        </Card>
      ) : reportQuery.data && reportQuery.data.format === "json" ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Expense Details</h2>
            <Badge>{reportQuery.data.expenses.length} expenses</Badge>
          </div>

          {reportQuery.data.expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No expenses found for the selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Merchant</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportQuery.data.expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b hover:bg-accent/50"
                    >
                      <td className="p-2">{formatDate(expense.expenseDate)}</td>
                      <td className="p-2">{expense.merchant || "-"}</td>
                      <td className="p-2">{expense.categoryName || "-"}</td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="p-2">
                        <Badge>{expense.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
