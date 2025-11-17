import {
  db,
  expense,
  expenseApproval,
  organizationMember,
  user,
} from "@expense-detective/db";
import { eq, and } from "drizzle-orm";

export interface NotificationData {
  type:
    | "approval_request"
    | "expense_approved"
    | "expense_rejected"
    | "expense_flagged"
    | "alert_created";
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  expenseId?: string;
  approvalId?: string;
  alertId?: string;
}

/**
 * Send in-app notification (stored in database)
 * In production, this would also send email/push notifications
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  // For MVP, we'll just log notifications
  // In production, you'd store these in a notifications table and send emails/push notifications

  console.log(`[Notification] ${data.type} to user ${data.userId}:`, {
    title: data.title,
    message: data.message,
  });

  // TODO: Implement actual notification storage and delivery
  // - Store in notifications table
  // - Send email via service (SendGrid, Resend, etc.)
  // - Send push notification if user has mobile app
}

/**
 * Notify approvers about a new expense requiring approval
 */
export async function notifyApprovalRequest(
  expenseId: string,
  organizationId: string,
  requestedById: string
): Promise<void> {
  const [expenseRecord] = await db
    .select()
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!expenseRecord) {
    return;
  }

  // Find all managers and finance admins in the organization
  const approvers = await db
    .select({
      userId: organizationMember.userId,
      role: organizationMember.role,
    })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.role, "manager")
      )
    );

  // Also get finance admins
  const admins = await db
    .select({
      userId: organizationMember.userId,
      role: organizationMember.role,
    })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.role, "finance_admin")
      )
    );

  const allApprovers = [...approvers, ...admins];

  // Get requester info
  const [requester] = await db
    .select()
    .from(user)
    .where(eq(user.id, requestedById))
    .limit(1);

  const requesterName = requester?.name || "A user";

  // Send notifications to all approvers
  for (const approver of allApprovers) {
    await sendNotification({
      type: "approval_request",
      userId: approver.userId,
      organizationId,
      title: "New Expense Requires Approval",
      message: `${requesterName} submitted an expense of ${
        expenseRecord.currency
      } ${parseFloat(expenseRecord.amount).toFixed(2)} for ${
        expenseRecord.merchant || "unknown merchant"
      }`,
      metadata: {
        expenseId,
        requestedById,
        amount: expenseRecord.amount,
        merchant: expenseRecord.merchant,
      },
      expenseId,
    });
  }
}

/**
 * Notify user about expense approval
 */
export async function notifyExpenseApproved(
  expenseId: string,
  approvedById: string
): Promise<void> {
  const [expenseRecord] = await db
    .select()
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!expenseRecord) {
    return;
  }

  const [approver] = await db
    .select()
    .from(user)
    .where(eq(user.id, approvedById))
    .limit(1);

  const approverName = approver?.name || "A manager";

  await sendNotification({
    type: "expense_approved",
    userId: expenseRecord.userId,
    organizationId: expenseRecord.organizationId,
    title: "Expense Approved",
    message: `Your expense of ${expenseRecord.currency} ${parseFloat(
      expenseRecord.amount
    ).toFixed(2)} has been approved by ${approverName}`,
    metadata: {
      expenseId,
      approvedById,
    },
    expenseId,
  });
}

/**
 * Notify user about expense rejection
 */
export async function notifyExpenseRejected(
  expenseId: string,
  rejectedById: string,
  reason?: string
): Promise<void> {
  const [expenseRecord] = await db
    .select()
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!expenseRecord) {
    return;
  }

  const [rejector] = await db
    .select()
    .from(user)
    .where(eq(user.id, rejectedById))
    .limit(1);

  const rejectorName = rejector?.name || "A manager";

  await sendNotification({
    type: "expense_rejected",
    userId: expenseRecord.userId,
    organizationId: expenseRecord.organizationId,
    title: "Expense Rejected",
    message: `Your expense of ${expenseRecord.currency} ${parseFloat(
      expenseRecord.amount
    ).toFixed(2)} has been rejected${
      reason ? `: ${reason}` : ""
    } by ${rejectorName}`,
    metadata: {
      expenseId,
      rejectedById,
      reason,
    },
    expenseId,
  });
}

/**
 * Notify user about expense being flagged
 */
export async function notifyExpenseFlagged(
  expenseId: string,
  reason: string
): Promise<void> {
  const [expenseRecord] = await db
    .select()
    .from(expense)
    .where(eq(expense.id, expenseId))
    .limit(1);

  if (!expenseRecord) {
    return;
  }

  await sendNotification({
    type: "expense_flagged",
    userId: expenseRecord.userId,
    organizationId: expenseRecord.organizationId,
    title: "Expense Flagged for Review",
    message: `Your expense of ${expenseRecord.currency} ${parseFloat(
      expenseRecord.amount
    ).toFixed(2)} has been flagged: ${reason}`,
    metadata: {
      expenseId,
      reason,
    },
    expenseId,
  });
}
