import { z } from "zod";
import { router, organizationProcedure } from "../index";
import {
  db,
  expense,
  expenseAlert,
  expenseCategory,
} from "@expense-detective/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const reportSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  categoryId: z.string().optional(),
  status: z
    .enum(["draft", "submitted", "approved", "rejected", "flagged"])
    .optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

export const reportsRouter = router({
  generate: organizationProcedure
    .input(reportSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(expense.organizationId, ctx.organizationId),
        gte(expense.expenseDate, input.startDate),
        lte(expense.expenseDate, input.endDate),
      ];

      // Apply filters
      if (input.categoryId) {
        conditions.push(eq(expense.categoryId, input.categoryId));
      }

      if (input.status) {
        conditions.push(eq(expense.status, input.status));
      }

      // Get expenses
      const expenses = await db
        .select({
          id: expense.id,
          amount: expense.amount,
          currency: expense.currency,
          merchant: expense.merchant,
          description: expense.description,
          expenseDate: expense.expenseDate,
          status: expense.status,
          categoryId: expense.categoryId,
          createdAt: expense.createdAt,
          submittedAt: expense.submittedAt,
          approvedAt: expense.approvedAt,
        })
        .from(expense)
        .where(and(...conditions))
        .orderBy(desc(expense.expenseDate));

      // Get category names if needed
      const categoryIds = expenses
        .map((e) => e.categoryId)
        .filter((id): id is string => !!id);
      const categories =
        categoryIds.length > 0
          ? await db
              .select()
              .from(expenseCategory)
              .where(
                and(
                  eq(expenseCategory.organizationId, ctx.organizationId),
                  sql`${expenseCategory.id} = ANY(${categoryIds})`
                )
              )
          : [];

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      // Format expenses with category names
      const formattedExpenses = expenses.map((e) => ({
        ...e,
        categoryName: e.categoryId ? categoryMap.get(e.categoryId) : null,
        amount: parseFloat(e.amount),
      }));

      // Calculate summary statistics
      const totalAmount = formattedExpenses.reduce(
        (sum, e) => sum + e.amount,
        0
      );
      const approvedAmount = formattedExpenses
        .filter((e) => e.status === "approved")
        .reduce((sum, e) => sum + e.amount, 0);
      const pendingAmount = formattedExpenses
        .filter((e) => e.status === "submitted" || e.status === "flagged")
        .reduce((sum, e) => sum + e.amount, 0);

      const statusCounts = formattedExpenses.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryBreakdown = formattedExpenses.reduce((acc, e) => {
        const category = e.categoryName || "Uncategorized";
        acc[category] = (acc[category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);

      // Get alerts for flagged expenses
      const flaggedExpenseIds = formattedExpenses
        .filter((e) => e.status === "flagged")
        .map((e) => e.id);

      const alerts =
        flaggedExpenseIds.length > 0
          ? await db
              .select()
              .from(expenseAlert)
              .where(
                and(
                  eq(expenseAlert.organizationId, ctx.organizationId),
                  sql`${expenseAlert.expenseId} = ANY(${flaggedExpenseIds})`
                )
              )
          : [];

      const summary = {
        totalExpenses: formattedExpenses.length,
        totalAmount,
        approvedAmount,
        pendingAmount,
        statusCounts,
        categoryBreakdown,
        flaggedCount: flaggedExpenseIds.length,
        alertsCount: alerts.length,
      };

      if (input.format === "csv") {
        // Convert to CSV format
        const csvHeaders = [
          "ID",
          "Date",
          "Merchant",
          "Description",
          "Category",
          "Amount",
          "Currency",
          "Status",
          "Created At",
          "Submitted At",
          "Approved At",
        ];

        const csvRows = formattedExpenses.map((e) => [
          e.id,
          e.expenseDate.toISOString().split("T")[0],
          e.merchant || "",
          e.description || "",
          e.categoryName || "",
          e.amount.toFixed(2),
          e.currency,
          e.status,
          e.createdAt.toISOString(),
          e.submittedAt?.toISOString() || "",
          e.approvedAt?.toISOString() || "",
        ]);

        const csvContent = [
          csvHeaders.join(","),
          ...csvRows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return {
          format: "csv",
          content: csvContent,
          summary,
        };
      }

      return {
        format: "json",
        expenses: formattedExpenses,
        summary,
        alerts,
      };
    }),

  summary: organizationProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(expense.organizationId, ctx.organizationId)];

      if (input.startDate) {
        conditions.push(gte(expense.expenseDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(expense.expenseDate, input.endDate));
      }

      // Get expense statistics
      const stats = await db
        .select({
          status: expense.status,
          total: sql<number>`COALESCE(SUM(CAST(${expense.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(expense)
        .where(and(...conditions))
        .groupBy(expense.status);

      // Get monthly breakdown (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyStats = await db
        .select({
          month: sql<string>`TO_CHAR(${expense.expenseDate}, 'YYYY-MM')`,
          total: sql<number>`COALESCE(SUM(CAST(${expense.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(expense)
        .where(
          and(
            eq(expense.organizationId, ctx.organizationId),
            eq(expense.status, "approved"),
            gte(expense.expenseDate, twelveMonthsAgo)
          )
        )
        .groupBy(sql`TO_CHAR(${expense.expenseDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${expense.expenseDate}, 'YYYY-MM')`);

      return {
        byStatus: stats.reduce((acc, s) => {
          acc[s.status] = {
            count: Number(s.count),
            total: Number(s.total),
          };
          return acc;
        }, {} as Record<string, { count: number; total: number }>),
        monthlyBreakdown: monthlyStats.map((s) => ({
          month: s.month,
          total: Number(s.total),
          count: Number(s.count),
        })),
      };
    }),
});
