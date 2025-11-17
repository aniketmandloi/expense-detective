import { z } from "zod";
import { router, organizationProcedure } from "../index";
import {
  db,
  expensePolicy,
  expenseCategory,
  expense,
} from "@expense-detective/db";
import { eq, and } from "drizzle-orm";

const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  policyType: z.enum([
    "amount_limit",
    "category_restriction",
    "time_based",
    "merchant_blacklist",
  ]),
  config: z.string(), // JSON string
  targetType: z.enum(["all", "role", "user"]).default("all"),
  targetRole: z.enum(["employee", "manager", "finance_admin"]).optional(),
  targetUserId: z.string().optional(),
  categoryId: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  action: z.enum(["flag", "require_approval", "auto_reject"]).default("flag"),
  active: z.boolean().default(true),
});

const updatePolicySchema = createPolicySchema.partial().extend({
  id: z.string(),
});

export const policiesRouter = router({
  create: organizationProcedure
    .input(createPolicySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has finance_admin role
      if (ctx.membership.role !== "finance_admin") {
        throw new Error("Only finance admins can create policies");
      }

      const policyId = crypto.randomUUID();

      const [newPolicy] = await db
        .insert(expensePolicy)
        .values({
          id: policyId,
          organizationId: ctx.organizationId,
          ...input,
        })
        .returning();

      return newPolicy;
    }),

  list: organizationProcedure.query(async ({ ctx }) => {
    const policies = await db
      .select()
      .from(expensePolicy)
      .where(
        and(
          eq(expensePolicy.organizationId, ctx.organizationId),
          eq(expensePolicy.active, true)
        )
      );

    return policies;
  }),

  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [policy] = await db
        .select()
        .from(expensePolicy)
        .where(
          and(
            eq(expensePolicy.id, input.id),
            eq(expensePolicy.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!policy) {
        throw new Error("Policy not found");
      }

      return policy;
    }),

  update: organizationProcedure
    .input(updatePolicySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has finance_admin role
      if (ctx.membership.role !== "finance_admin") {
        throw new Error("Only finance admins can update policies");
      }

      const { id, ...updates } = input;

      const [updated] = await db
        .update(expensePolicy)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expensePolicy.id, id),
            eq(expensePolicy.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Policy not found");
      }

      return updated;
    }),

  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has finance_admin role
      if (ctx.membership.role !== "finance_admin") {
        throw new Error("Only finance admins can delete policies");
      }

      // Soft delete by setting active to false
      const [updated] = await db
        .update(expensePolicy)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expensePolicy.id, input.id),
            eq(expensePolicy.organizationId, ctx.organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Policy not found");
      }

      return { success: true };
    }),

  validateExpense: organizationProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get expense
      const [expenseRecord] = await db
        .select()
        .from(expense)
        .where(
          and(
            eq(expense.id, input.expenseId),
            eq(expense.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!expenseRecord) {
        throw new Error("Expense not found");
      }

      // Get active policies
      const policies = await db
        .select()
        .from(expensePolicy)
        .where(
          and(
            eq(expensePolicy.organizationId, ctx.organizationId),
            eq(expensePolicy.active, true)
          )
        );

      // Import and use policy engine
      const { validateExpenseAgainstPolicies } = await import(
        "../lib/policy-engine"
      );
      const violations = await validateExpenseAgainstPolicies(
        expenseRecord,
        policies
      );

      return violations;
    }),
});
