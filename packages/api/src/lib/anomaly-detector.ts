import { expense } from "@expense-detective/db";
import type { SpendingPattern } from "./behavioral-analysis";

export interface AnomalyDetectionResult {
  score: number; // 0-100, higher = more anomalous
  severity: "low" | "medium" | "high" | "critical";
  factors: Array<{
    type: string;
    description: string;
    weight: number;
  }>;
  recommendation: string;
}

/**
 * Advanced anomaly detection service
 * Analyzes expenses for suspicious patterns beyond basic behavioral analysis
 */
export async function detectExpenseAnomaly(
  expense: typeof expense.$inferSelect,
  pattern: SpendingPattern | null,
  historicalExpenses: Array<typeof expense.$inferSelect>
): Promise<AnomalyDetectionResult> {
  const factors: AnomalyDetectionResult["factors"] = [];
  let totalScore = 0;

  if (!pattern) {
    return {
      score: 10,
      severity: "low",
      factors: [
        {
          type: "insufficient_data",
          description: "No historical data available for comparison",
          weight: 10,
        },
      ],
      recommendation: "Monitor this expense as more data becomes available",
    };
  }

  const amount = parseFloat(expense.amount);
  const expenseDate = new Date(expense.expenseDate);
  const expenseHour = expenseDate.getHours();
  const expenseDay = expenseDate.getDay(); // 0 = Sunday, 6 = Saturday

  // 1. Amount Anomaly Detection
  if (amount > pattern.averageAmount * 5) {
    const weight = 35;
    totalScore += weight;
    factors.push({
      type: "extreme_amount",
      description: `Amount (${amount.toFixed(2)}) is ${(
        amount / pattern.averageAmount
      ).toFixed(1)}x higher than average (${pattern.averageAmount.toFixed(2)})`,
      weight,
    });
  } else if (amount > pattern.averageAmount * 2) {
    const weight = 25;
    totalScore += weight;
    factors.push({
      type: "high_amount",
      description: `Amount (${amount.toFixed(2)}) is ${(
        amount / pattern.averageAmount
      ).toFixed(1)}x higher than average`,
      weight,
    });
  } else if (amount > pattern.medianAmount * 3) {
    const weight = 20;
    totalScore += weight;
    factors.push({
      type: "above_median",
      description: `Amount (${amount.toFixed(2)}) is ${(
        amount / pattern.medianAmount
      ).toFixed(1)}x higher than median`,
      weight,
    });
  }

  // 2. Category Anomaly
  if (
    expense.categoryId &&
    !pattern.typicalCategories.includes(expense.categoryId)
  ) {
    const weight = 20;
    totalScore += weight;
    factors.push({
      type: "unusual_category",
      description: "Expense category is unusual for this user",
      weight,
    });
  }

  // 3. Merchant Anomaly
  if (
    expense.merchant &&
    !pattern.typicalMerchants.includes(expense.merchant)
  ) {
    const weight = 15;
    totalScore += weight;
    factors.push({
      type: "unusual_merchant",
      description: `Merchant "${expense.merchant}" is not in user's typical merchants`,
      weight,
    });
  }

  // 4. Time-based Anomalies
  const isOffHours = !pattern.typicalHours.some(
    (typicalHour) => Math.abs(expenseHour - typicalHour) <= 2
  );
  if (isOffHours) {
    const weight = 15;
    totalScore += weight;
    factors.push({
      type: "off_hours",
      description: `Expense made at unusual hour: ${expenseHour}:00 (typical hours: ${pattern.typicalHours.join(
        ", "
      )})`,
      weight,
    });
  }

  // 5. Weekend/After-hours Spending
  if (expenseDay === 0 || expenseDay === 6) {
    // Weekend
    const weight = 10;
    totalScore += weight;
    factors.push({
      type: "weekend_spending",
      description: "Expense made on weekend",
      weight,
    });
  }

  // 6. Rapid Succession Detection (multiple expenses in short time)
  const recentExpenses = historicalExpenses.filter(
    (e) =>
      Math.abs(new Date(e.expenseDate).getTime() - expenseDate.getTime()) <
      24 * 60 * 60 * 1000 // Within 24 hours
  );
  if (recentExpenses.length >= 5) {
    const weight = 20;
    totalScore += weight;
    factors.push({
      type: "rapid_succession",
      description: `${recentExpenses.length} expenses made within 24 hours`,
      weight,
    });
  }

  // 7. Round Number Detection (suspicious round amounts)
  if (amount % 100 === 0 && amount >= 100) {
    const weight = 5;
    totalScore += weight;
    factors.push({
      type: "round_amount",
      description: "Expense amount is a round number (may indicate estimation)",
      weight,
    });
  }

  // 8. Currency Anomaly (if different from typical)
  // This would require tracking typical currency, skipping for now

  // Cap score at 100
  totalScore = Math.min(100, totalScore);

  // Determine severity
  let severity: AnomalyDetectionResult["severity"] = "low";
  if (totalScore >= 80) {
    severity = "critical";
  } else if (totalScore >= 60) {
    severity = "high";
  } else if (totalScore >= 40) {
    severity = "medium";
  }

  // Generate recommendation
  let recommendation = "No action required";
  if (severity === "critical") {
    recommendation =
      "Immediate review required - multiple high-risk factors detected";
  } else if (severity === "high") {
    recommendation = "Review recommended - several anomalies detected";
  } else if (severity === "medium") {
    recommendation = "Monitor - some unusual patterns detected";
  }

  return {
    score: totalScore,
    severity,
    factors:
      factors.length > 0
        ? factors
        : [
            {
              type: "normal",
              description: "No significant anomalies detected",
              weight: 0,
            },
          ],
    recommendation,
  };
}
