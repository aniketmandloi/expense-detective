import { expensePolicy, expense } from "@expense-detective/db";
import type { expensePolicy as ExpensePolicyType } from "@expense-detective/db";

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  action: "flag" | "require_approval" | "auto_reject";
}

export interface PolicyConfig {
  // For amount_limit
  maxAmount?: number;
  requiresApproval?: boolean;
  // For category_restriction
  allowedCategories?: string[];
  blockedCategories?: string[];
  // For time_based
  allowedHours?: { start: number; end: number };
  blockedDays?: string[];
  // For merchant_blacklist
  blockedMerchants?: string[];
}

/**
 * Validate an expense against active policies
 */
export async function validateExpenseAgainstPolicies(
  expense: typeof expense.$inferSelect,
  policies: Array<typeof expensePolicy.$inferSelect>
): Promise<PolicyViolation[]> {
  const violations: PolicyViolation[] = [];

  for (const policy of policies) {
    if (!policy.active) continue;

    // Parse policy config
    let config: PolicyConfig;
    try {
      config = JSON.parse(policy.config) as PolicyConfig;
    } catch {
      console.error(`Invalid policy config for policy ${policy.id}`);
      continue;
    }

    // Check if policy applies to this expense
    if (!policyAppliesToExpense(policy, expense)) {
      continue;
    }

    // Evaluate policy based on type
    const violation = evaluatePolicy(policy, expense, config);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

/**
 * Check if a policy applies to a specific expense
 */
function policyAppliesToExpense(
  policy: typeof expensePolicy.$inferSelect,
  expense: typeof expense.$inferSelect
): boolean {
  // Check target type
  if (policy.targetType === "all") {
    return true;
  }

  // For role-based targeting, we'd need membership info
  // For now, assume it applies if targetType is "all" or matches
  // This should be enhanced with actual role checking

  // For user-based targeting
  if (policy.targetType === "user" && policy.targetUserId) {
    return expense.userId === policy.targetUserId;
  }

  return true;
}

/**
 * Evaluate a single policy against an expense
 */
function evaluatePolicy(
  policy: typeof expensePolicy.$inferSelect,
  expenseRecord: typeof expense.$inferSelect,
  config: PolicyConfig
): PolicyViolation | null {
  const amount = parseFloat(expenseRecord.amount);

  switch (policy.policyType) {
    case "amount_limit":
      if (config.maxAmount && amount > config.maxAmount) {
        return {
          policyId: policy.id,
          policyName: policy.name,
          severity: policy.severity,
          message: `Expense amount (${expenseRecord.currency} ${amount.toFixed(
            2
          )}) exceeds limit of ${expenseRecord.currency} ${config.maxAmount.toFixed(
            2
          )}`,
          action: policy.action,
        };
      }
      break;

    case "category_restriction":
      if (expenseRecord.categoryId) {
        if (
          config.blockedCategories?.includes(expenseRecord.categoryId) ||
          (config.allowedCategories &&
            !config.allowedCategories.includes(expenseRecord.categoryId))
        ) {
          return {
            policyId: policy.id,
            policyName: policy.name,
            severity: policy.severity,
            message: `Expense category is ${
              config.blockedCategories?.includes(expenseRecord.categoryId)
                ? "blocked"
                : "not allowed"
            } by policy`,
            action: policy.action,
          };
        }
      }
      break;

    case "time_based":
      const expenseDate = new Date(expenseRecord.expenseDate);
      const hour = expenseDate.getHours();

      // Check allowed hours
      if (config.allowedHours) {
        if (
          hour < config.allowedHours.start ||
          hour > config.allowedHours.end
        ) {
          return {
            policyId: policy.id,
            policyName: policy.name,
            severity: policy.severity,
            message: `Expense submitted outside allowed hours (${config.allowedHours.start}:00 - ${config.allowedHours.end}:00)`,
            action: policy.action,
          };
        }
      }

      // Check blocked days
      if (config.blockedDays) {
        const dayName = expenseDate.toLocaleDateString("en-US", {
          weekday: "long",
        });
        if (config.blockedDays.includes(dayName)) {
          return {
            policyId: policy.id,
            policyName: policy.name,
            severity: policy.severity,
            message: `Expense submitted on blocked day: ${dayName}`,
            action: policy.action,
          };
        }
      }
      break;

    case "merchant_blacklist":
      if (expenseRecord.merchant && config.blockedMerchants) {
        const merchantLower = expenseRecord.merchant.toLowerCase();
        const isBlocked = config.blockedMerchants.some((blocked) =>
          merchantLower.includes(blocked.toLowerCase())
        );

        if (isBlocked) {
          return {
            policyId: policy.id,
            policyName: policy.name,
            severity: policy.severity,
            message: `Merchant "${expenseRecord.merchant}" is on the blocked list`,
            action: policy.action,
          };
        }
      }
      break;
  }

  return null;
}
