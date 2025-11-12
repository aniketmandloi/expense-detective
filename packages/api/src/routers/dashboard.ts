import { router, organizationProcedure } from "../index";
import {
  db,
  expense,
  expenseAlert,
  expenseApproval,
} from "@expense-detective/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export const dashboardRouter = router({
  stats: organizationProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get expense statistics
    const expenseStats = await db
      .select({
        status: expense.status,
        total: sql<number>`COALESCE(SUM(CAST(${expense.amount} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expense)
      .where(
        and(
          eq(expense.organizationId, ctx.organizationId),
          eq(expense.userId, ctx.session.user.id)
        )
      )
      .groupBy(expense.status);

    // Get recent expenses (last 5)
    const recentExpenses = await db
      .select()
      .from(expense)
      .where(
        and(
          eq(expense.organizationId, ctx.organizationId),
          eq(expense.userId, ctx.session.user.id)
        )
      )
      .orderBy(desc(expense.createdAt))
      .limit(5);

    // Get pending approvals count (for managers/admins)
    let pendingApprovalsCount = 0;
    if (
      ctx.membership.role === "manager" ||
      ctx.membership.role === "finance_admin"
    ) {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(expenseApproval)
        .innerJoin(expense, eq(expenseApproval.expenseId, expense.id))
        .where(
          and(
            eq(expense.organizationId, ctx.organizationId),
            eq(expenseApproval.status, "pending")
          )
        );

      pendingApprovalsCount = result?.count ?? 0;
    }

    // Get open alerts count
    const [alertsResult] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(expenseAlert)
      .innerJoin(expense, eq(expenseAlert.expenseId, expense.id))
      .where(
        and(
          eq(expense.organizationId, ctx.organizationId),
          eq(expense.userId, ctx.session.user.id),
          eq(expenseAlert.status, "open")
        )
      );

    const openAlertsCount = alertsResult?.count ?? 0;

    // Calculate totals
    const totalSpent = expenseStats
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const pendingAmount = expenseStats
      .filter((s) => s.status === "submitted" || s.status === "flagged")
      .reduce((sum, s) => sum + Number(s.total), 0);

    // Get monthly spending (last 30 days)
    const monthlySpending = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${expense.amount} AS DECIMAL)), 0)`,
      })
      .from(expense)
      .where(
        and(
          eq(expense.organizationId, ctx.organizationId),
          eq(expense.userId, ctx.session.user.id),
          eq(expense.status, "approved"),
          gte(expense.expenseDate, thirtyDaysAgo)
        )
      );

    return {
      totalSpent: Number(totalSpent),
      pendingAmount: Number(pendingAmount),
      monthlySpending: Number(monthlySpending[0]?.total ?? 0),
      expenseCounts: {
        draft: expenseStats.find((s) => s.status === "draft")?.count ?? 0,
        submitted:
          expenseStats.find((s) => s.status === "submitted")?.count ?? 0,
        approved: expenseStats.find((s) => s.status === "approved")?.count ?? 0,
        rejected: expenseStats.find((s) => s.status === "rejected")?.count ?? 0,
        flagged: expenseStats.find((s) => s.status === "flagged")?.count ?? 0,
      },
      recentExpenses,
      pendingApprovalsCount,
      openAlertsCount,
    };
  }),
});
