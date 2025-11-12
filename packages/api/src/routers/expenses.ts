import { z } from "zod";
import { router, organizationProcedure } from "../index";
import {
  db,
  expense,
  receipt,
  expenseCategory,
  expenseAlert,
  expenseApproval,
  organizationMember,
} from "@expense-detective/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { extractReceiptDataFromBuffer } from "../lib/ocr";
import { readFile } from "fs/promises";
import { join } from "path";

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  categoryId: z.string().optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  expenseDate: z.coerce.date(),
  receiptFileUrl: z.string().optional(),
  receiptFileName: z.string().optional(),
  receiptFileSize: z.number().optional(),
  receiptMimeType: z.string().optional(),
});

const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string(),
});

const listExpensesSchema = z.object({
  status: z
    .enum(["draft", "submitted", "approved", "rejected", "flagged"])
    .optional(),
  categoryId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const expensesRouter = router({
  create: organizationProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const expenseId = crypto.randomUUID();

      // Create expense record
      const [newExpense] = await db
        .insert(expense)
        .values({
          id: expenseId,
          organizationId: ctx.organizationId,
          userId: ctx.session.user.id,
          amount: input.amount.toString(),
          currency: input.currency,
          categoryId: input.categoryId,
          merchant: input.merchant,
          description: input.description,
          expenseDate: input.expenseDate,
          status: "draft",
        })
        .returning();

      // If receipt file is provided, process it
      if (input.receiptFileUrl) {
        try {
          // Read the uploaded file
          const filePath = join(
            process.cwd(),
            input.receiptFileUrl.replace(/^\//, "")
          );
          const fileBuffer = await readFile(filePath);

          // Extract data using OCR
          const ocrResult = await extractReceiptDataFromBuffer(
            fileBuffer,
            input.receiptMimeType || "image/jpeg"
          );

          // Create receipt record
          await db.insert(receipt).values({
            id: crypto.randomUUID(),
            expenseId: expenseId,
            fileUrl: input.receiptFileUrl,
            fileName: input.receiptFileName || "receipt",
            fileSize: input.receiptFileSize,
            mimeType: input.receiptMimeType,
            ocrData: JSON.stringify(ocrResult),
            merchantName: ocrResult.merchantName,
            merchantAddress: ocrResult.merchantAddress,
            transactionDate: ocrResult.transactionDate,
            items: ocrResult.items ? JSON.stringify(ocrResult.items) : null,
            totalAmount: ocrResult.totalAmount
              ? ocrResult.totalAmount.toString()
              : null,
            taxAmount: ocrResult.taxAmount
              ? ocrResult.taxAmount.toString()
              : null,
            ocrProcessed: true,
            ocrProcessedAt: new Date(),
          });

          // Update expense with OCR-extracted data if not provided
          if (!input.merchant && ocrResult.merchantName) {
            await db
              .update(expense)
              .set({ merchant: ocrResult.merchantName })
              .where(eq(expense.id, expenseId));
          }
          if (!input.amount && ocrResult.totalAmount) {
            await db
              .update(expense)
              .set({
                amount: ocrResult.totalAmount.toString(),
              })
              .where(eq(expense.id, expenseId));
          }
        } catch (error) {
          console.error("Receipt processing error:", error);
          // Continue even if OCR fails
        }
      }

      return newExpense;
    }),

  list: organizationProcedure
    .input(listExpensesSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(expense.organizationId, ctx.organizationId),
        eq(expense.userId, ctx.session.user.id),
      ];

      if (input.status) {
        conditions.push(eq(expense.status, input.status));
      }

      if (input.categoryId) {
        conditions.push(eq(expense.categoryId, input.categoryId));
      }

      if (input.startDate) {
        conditions.push(gte(expense.expenseDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(expense.expenseDate, input.endDate));
      }

      const expenses = await db
        .select()
        .from(expense)
        .where(and(...conditions))
        .orderBy(desc(expense.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return expenses;
    }),

  getById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [expenseRecord] = await db
        .select()
        .from(expense)
        .where(
          and(
            eq(expense.id, input.id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expense.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!expenseRecord) {
        throw new Error("Expense not found");
      }

      // Get receipt if exists
      const [receiptRecord] = await db
        .select()
        .from(receipt)
        .where(eq(receipt.expenseId, input.id))
        .limit(1);

      return {
        ...expenseRecord,
        receipt: receiptRecord ?? null,
      };
    }),

  update: organizationProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updated] = await db
        .update(expense)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expense.id, id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expense.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Expense not found");
      }

      return updated;
    }),

  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow deletion of draft expenses
      const [expenseRecord] = await db
        .select()
        .from(expense)
        .where(
          and(
            eq(expense.id, input.id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expense.userId, ctx.session.user.id),
            eq(expense.status, "draft")
          )
        )
        .limit(1);

      if (!expenseRecord) {
        throw new Error(
          "Expense not found or cannot be deleted (only draft expenses can be deleted)"
        );
      }

      await db.delete(expense).where(eq(expense.id, input.id));

      return { success: true };
    }),

  submit: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [expenseRecord] = await db
        .select()
        .from(expense)
        .where(
          and(
            eq(expense.id, input.id),
            eq(expense.organizationId, ctx.organizationId),
            eq(expense.userId, ctx.session.user.id),
            eq(expense.status, "draft")
          )
        )
        .limit(1);

      if (!expenseRecord) {
        throw new Error(
          "Expense not found or cannot be submitted (only draft expenses can be submitted)"
        );
      }

      // Validate against policies and detect anomalies
      const { validateExpenseAgainstPolicies } = await import(
        "../lib/policy-engine"
      );
      const { calculateSpendingPattern, detectAnomaly } = await import(
        "../lib/behavioral-analysis"
      );
      const { expensePolicy, organizationMember } = await import(
        "@expense-detective/db"
      );

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

      // Validate policies
      const violations = await validateExpenseAgainstPolicies(
        expenseRecord,
        policies
      );

      // Detect anomalies
      const pattern = await calculateSpendingPattern(
        expenseRecord.userId,
        ctx.organizationId
      );
      const anomaly = await detectAnomaly(expenseRecord, pattern);

      // Determine if expense should be flagged
      let shouldFlag = false;
      let requiresApproval = false;

      // Check policy violations
      for (const violation of violations) {
        if (violation.action === "auto_reject") {
          // Auto-reject
          await db
            .update(expense)
            .set({
              status: "rejected",
              rejectedAt: new Date(),
              rejectionReason: `Policy violation: ${violation.message}`,
              updatedAt: new Date(),
            })
            .where(eq(expense.id, input.id));

          return {
            ...expenseRecord,
            status: "rejected" as const,
          };
        }

        if (violation.action === "require_approval") {
          requiresApproval = true;
        }

        if (
          violation.action === "flag" ||
          violation.severity === "high" ||
          violation.severity === "critical"
        ) {
          shouldFlag = true;
        }

        // Create alert for violation
        await db.insert(expenseAlert).values({
          id: crypto.randomUUID(),
          expenseId: expenseRecord.id,
          policyId: violation.policyId,
          alertType: "policy_violation",
          severity: violation.severity,
          title: `Policy Violation: ${violation.policyName}`,
          message: violation.message,
          metadata: JSON.stringify({ violation }),
          status: "open",
        });
      }

      // Check anomaly score
      if (anomaly.score >= 50) {
        shouldFlag = true;
        await db.insert(expenseAlert).values({
          id: crypto.randomUUID(),
          expenseId: expenseRecord.id,
          alertType: "anomaly_detected",
          severity:
            anomaly.score >= 80
              ? "high"
              : anomaly.score >= 60
              ? "medium"
              : "low",
          title: "Anomalous Spending Detected",
          message: `This expense shows unusual patterns: ${anomaly.factors.join(
            ", "
          )}`,
          metadata: JSON.stringify({ anomaly }),
          anomalyScore: anomaly.score,
          status: "open",
        });
      }

      // Update expense status
      const finalStatus = shouldFlag ? "flagged" : "submitted";
      const [updated] = await db
        .update(expense)
        .set({
          status: finalStatus,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(expense.id, input.id))
        .returning();

      // Create approval request if needed
      if (requiresApproval || shouldFlag) {
        // Find a manager or finance admin to assign approval to
        const [approver] = await db
          .select()
          .from(organizationMember)
          .where(
            and(
              eq(organizationMember.organizationId, ctx.organizationId),
              eq(organizationMember.role, "manager")
            )
          )
          .limit(1);

        if (approver) {
          await db.insert(expenseApproval).values({
            id: crypto.randomUUID(),
            expenseId: expenseRecord.id,
            requestedById: ctx.session.user.id,
            approverId: approver.userId,
            status: "pending",
          });

          // Send notification to approvers
          const { notifyApprovalRequest } = await import(
            "../lib/notifications"
          );
          await notifyApprovalRequest(
            expenseRecord.id,
            ctx.organizationId,
            ctx.session.user.id
          );
        }
      }

      // Notify user if expense was flagged
      if (shouldFlag) {
        const { notifyExpenseFlagged } = await import("../lib/notifications");
        const flagReason =
          violations.length > 0
            ? violations.map((v) => v.message).join("; ")
            : anomaly.factors.join("; ");
        await notifyExpenseFlagged(expenseRecord.id, flagReason);
      }

      return updated;
    }),
});
