import { z } from "zod";
import { router, organizationProcedure } from "../index";
import { db, expenseAlert, expense } from "@expense-detective/db";
import { eq, and, desc } from "drizzle-orm";

export const alertsRouter = router({
  list: organizationProcedure
    .input(
      z.object({
        status: z
          .enum(["open", "acknowledged", "resolved", "dismissed"])
          .optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(expenseAlert.expenseId, expense.id),
        eq(expense.organizationId, ctx.organizationId),
      ];

      if (input.status) {
        conditions.push(eq(expenseAlert.status, input.status));
      }

      if (input.severity) {
        conditions.push(eq(expenseAlert.severity, input.severity));
      }

      const alerts = await db
        .select({
          alert: expenseAlert,
          expense: expense,
        })
        .from(expenseAlert)
        .innerJoin(expense, eq(expenseAlert.expenseId, expense.id))
        .where(and(...conditions))
        .orderBy(desc(expenseAlert.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return alerts;
    }),

  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [alertRecord] = await db
        .select({
          alert: expenseAlert,
          expense: expense,
        })
        .from(expenseAlert)
        .innerJoin(expense, eq(expenseAlert.expenseId, expense.id))
        .where(
          and(
            eq(expenseAlert.id, input.id),
            eq(expense.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!alertRecord) {
        throw new Error("Alert not found");
      }

      return alertRecord;
    }),

  acknowledge: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(expenseAlert)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          acknowledgedById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(expenseAlert.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("Alert not found");
      }

      return updated;
    }),

  resolve: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(expenseAlert)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolvedById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(expenseAlert.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("Alert not found");
      }

      return updated;
    }),
});
