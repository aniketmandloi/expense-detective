import { z } from "zod";
import { router, organizationProcedure } from "../index";
import {
  db,
  expenseApproval,
  expense,
  organizationMember,
} from "@expense-detective/db";
import { eq, and, desc } from "drizzle-orm";
import {
  notifyExpenseApproved,
  notifyExpenseRejected,
} from "../lib/notifications";

export const approvalsRouter = router({
  list: organizationProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only managers and finance admins can see approvals
      if (
        ctx.membership.role !== "manager" &&
        ctx.membership.role !== "finance_admin"
      ) {
        throw new Error("Only managers and finance admins can view approvals");
      }

      const conditions = [
        eq(expenseApproval.expenseId, expense.id),
        eq(expense.organizationId, ctx.organizationId),
      ];

      if (input.status) {
        conditions.push(eq(expenseApproval.status, input.status));
      } else {
        // Default to pending if no status specified
        conditions.push(eq(expenseApproval.status, "pending"));
      }

      const approvals = await db
        .select({
          approval: expenseApproval,
          expense: expense,
        })
        .from(expenseApproval)
        .innerJoin(expense, eq(expenseApproval.expenseId, expense.id))
        .where(and(...conditions))
        .orderBy(desc(expenseApproval.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return approvals;
    }),

  approve: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only managers and finance admins can approve
      if (
        ctx.membership.role !== "manager" &&
        ctx.membership.role !== "finance_admin"
      ) {
        throw new Error(
          "Only managers and finance admins can approve expenses"
        );
      }

      // Get approval record
      const [approvalRecord] = await db
        .select()
        .from(expenseApproval)
        .innerJoin(expense, eq(expenseApproval.expenseId, expense.id))
        .where(
          and(
            eq(expenseApproval.id, input.id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expenseApproval.status, "pending")
          )
        )
        .limit(1);

      if (!approvalRecord) {
        throw new Error("Approval not found or already processed");
      }

      // Update approval
      await db
        .update(expenseApproval)
        .set({
          status: "approved",
          approvedAt: new Date(),
          comments: input.comments,
          updatedAt: new Date(),
        })
        .where(eq(expenseApproval.id, input.id));

      // Update expense status
      await db
        .update(expense)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(expense.id, approvalRecord.expense.id));

      // Send notification
      await notifyExpenseApproved(
        approvalRecord.expense.id,
        ctx.session.user.id
      );

      return { success: true };
    }),

  reject: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        comments: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only managers and finance admins can reject
      if (
        ctx.membership.role !== "manager" &&
        ctx.membership.role !== "finance_admin"
      ) {
        throw new Error("Only managers and finance admins can reject expenses");
      }

      // Get approval record
      const [approvalRecord] = await db
        .select()
        .from(expenseApproval)
        .innerJoin(expense, eq(expenseApproval.expenseId, expense.id))
        .where(
          and(
            eq(expenseApproval.id, input.id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expenseApproval.status, "pending")
          )
        )
        .limit(1);

      if (!approvalRecord) {
        throw new Error("Approval not found or already processed");
      }

      // Update approval
      await db
        .update(expenseApproval)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          comments: input.comments,
          updatedAt: new Date(),
        })
        .where(eq(expenseApproval.id, input.id));

      // Update expense status
      await db
        .update(expense)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: input.comments,
          updatedAt: new Date(),
        })
        .where(eq(expense.id, approvalRecord.expense.id));

      // Send notification
      await notifyExpenseRejected(
        approvalRecord.expense.id,
        ctx.session.user.id,
        input.comments
      );

      return { success: true };
    }),
});
