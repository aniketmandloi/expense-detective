import { db, expense } from "@expense-detective/db";
import { eq, and, gte } from "drizzle-orm";

export interface SpendingPattern {
  userId: string;
  averageAmount: number;
  medianAmount: number;
  typicalCategories: string[];
  typicalMerchants: string[];
  averageDailySpend: number;
  typicalHours: number[]; // Hours of day when expenses are typically made
}

export interface AnomalyScore {
  score: number; // 0-100, higher = more anomalous
  factors: string[];
}

/**
 * Calculate baseline spending patterns for a user
 */
export async function calculateSpendingPattern(
  userId: string,
  organizationId: string,
  daysBack: number = 90
): Promise<SpendingPattern | null> {
  // Get expenses from the last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const expenses = await db
    .select()
    .from(expense)
    .where(
      and(
        eq(expense.userId, userId),
        eq(expense.organizationId, organizationId),
        eq(expense.status, "approved"), // Only count approved expenses
        gte(expense.expenseDate, cutoffDate)
      )
    );

  if (expenses.length === 0) {
    return null;
  }

  // Calculate average and median amounts
  const amounts = expenses.map((e) => parseFloat(e.amount));
  const averageAmount =
    amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const medianAmount =
    sortedAmounts.length % 2 === 0
      ? (sortedAmounts[sortedAmounts.length / 2 - 1] +
          sortedAmounts[sortedAmounts.length / 2]) /
        2
      : sortedAmounts[Math.floor(sortedAmounts.length / 2)];

  // Calculate typical categories
  const categoryCounts = new Map<string, number>();
  expenses.forEach((e) => {
    if (e.categoryId) {
      categoryCounts.set(
        e.categoryId,
        (categoryCounts.get(e.categoryId) || 0) + 1
      );
    }
  });
  const typicalCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId]) => categoryId);

  // Calculate typical merchants
  const merchantCounts = new Map<string, number>();
  expenses.forEach((e) => {
    if (e.merchant) {
      merchantCounts.set(e.merchant, (merchantCounts.get(e.merchant) || 0) + 1);
    }
  });
  const typicalMerchants = Array.from(merchantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([merchant]) => merchant);

  // Calculate average daily spend
  const totalDays = Math.max(
    daysBack,
    Math.ceil(
      (new Date().getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const averageDailySpend =
    amounts.reduce((sum, amt) => sum + amt, 0) / totalDays;

  // Calculate typical hours
  const hourCounts = new Map<number, number>();
  expenses.forEach((e) => {
    const hour = new Date(e.expenseDate).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const typicalHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return {
    userId,
    averageAmount,
    medianAmount,
    typicalCategories,
    typicalMerchants,
    averageDailySpend,
    typicalHours,
  };
}

/**
 * Detect anomalies in an expense compared to user's spending pattern
 */
export async function detectAnomaly(
  expense: typeof expense.$inferSelect,
  pattern: SpendingPattern | null
): Promise<AnomalyScore> {
  if (!pattern) {
    // No pattern available, return low score
    return {
      score: 10,
      factors: ["No historical data available"],
    };
  }

  const factors: string[] = [];
  let score = 0;
  const amount = parseFloat(expense.amount);

  // Check amount anomaly (if > 2x average or > 3x median)
  if (amount > pattern.averageAmount * 2) {
    score += 30;
    factors.push(
      `Amount (${amount.toFixed(2)}) is ${(
        amount / pattern.averageAmount
      ).toFixed(1)}x higher than average`
    );
  } else if (amount > pattern.medianAmount * 3) {
    score += 25;
    factors.push(
      `Amount (${amount.toFixed(2)}) is ${(
        amount / pattern.medianAmount
      ).toFixed(1)}x higher than median`
    );
  }

  // Check category anomaly
  if (
    expense.categoryId &&
    !pattern.typicalCategories.includes(expense.categoryId)
  ) {
    score += 20;
    factors.push("Unusual category for this user");
  }

  // Check merchant anomaly
  if (
    expense.merchant &&
    !pattern.typicalMerchants.includes(expense.merchant)
  ) {
    score += 15;
    factors.push("Unusual merchant for this user");
  }

  // Check time anomaly (off-hours spending)
  const expenseHour = new Date(expense.expenseDate).getHours();
  const isOffHours = !pattern.typicalHours.some(
    (typicalHour) => Math.abs(expenseHour - typicalHour) <= 2
  );
  if (isOffHours) {
    score += 15;
    factors.push(`Expense made at unusual hour: ${expenseHour}:00`);
  }

  // Check if amount is extremely high (> 5x average)
  if (amount > pattern.averageAmount * 5) {
    score += 20;
    factors.push("Extremely high amount compared to user's typical spending");
  }

  // Cap score at 100
  score = Math.min(100, score);

  return {
    score,
    factors:
      factors.length > 0 ? factors : ["No significant anomalies detected"],
  };
}
